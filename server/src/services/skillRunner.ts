import { Types, type AnyObjectId } from '../db/objectId.js';
import { Conversation } from '../models/Conversation.js';
import { Requirement } from '../models/Requirement.js';
import type { IUser } from '../models/User.js';
import type { DomainKey } from '../config/domains.js';
import { hasLlm, runSkill as llmRunSkill } from './llm.js';
import { mockSkillResponse } from './aiMock.js';
import { resolveSkill } from './skillResolve.js';
import { processSkillLlmResult } from './reqFromLlm.js';
import { extractProtoHtml, wrapProtoHtml } from './protoExtract.js';
import { toRequirementJson, formatChatTime } from '../utils/serialize.js';

export interface SkillRunResult {
  role: 'ai';
  content: string;
  time: string;
  reqCard?: ReturnType<typeof toRequirementJson>;
  protoCard?: string;
}

async function loadConversationContext(
  conversationId: string | undefined,
  user: IUser,
  context: string,
): Promise<{ domainKey: DomainKey; ctx: string }> {
  let domainKey: DomainKey = (user.domain as DomainKey) || 'tech';
  let ctx = context ?? '';

  if (!conversationId) return { domainKey, ctx };

  const conv = await Conversation.findOne({ _id: conversationId, userId: user._id });
  if (!conv) return { domainKey, ctx };

  domainKey = conv.domain as DomainKey;
  if (!ctx) {
    const lastUser = [...conv.messages].reverse().find((m) => m.role === 'user');
    ctx = lastUser?.content ?? '';
  }
  return { domainKey, ctx };
}

export async function executeSkillForUser(
  conversationId: string | undefined,
  skillId: string,
  context: string,
  user: IUser,
): Promise<SkillRunResult> {
  const skill = await resolveSkill(skillId, user._id);
  if (!skill) throw new Error('未知技能');

  const { domainKey, ctx } = await loadConversationContext(conversationId, user, context);

  let content: string;
  let reqCardOid: AnyObjectId | undefined;
  let protoCard: string | undefined;

  if (!hasLlm()) {
    const r = await mockSkillResponse(skillId, ctx, domainKey, user, skill);
    content = r.content;
    if (r.requirement) reqCardOid = r.requirement._id;
  } else {
    const r = await llmRunSkill(skill, ctx, domainKey, user);
    const processed = await processSkillLlmResult(skillId, r.content, ctx, domainKey, user);
    content = processed.content;
    if (processed.reqCard) reqCardOid = processed.reqCard._id;
  }

  if (skillId === 'generate_ui') {
    const html = extractProtoHtml(content) ?? wrapProtoHtml(content.slice(0, 800), skill.name);
    protoCard = html;
  }

  const msgTime = new Date();

  if (conversationId) {
    const conv = await Conversation.findOne({ _id: conversationId, userId: user._id });
    if (conv) {
      conv.messages.push({
        role: 'ai',
        content,
        time: msgTime,
        ...(reqCardOid ? { reqCard: reqCardOid } : {}),
        ...(protoCard ? { protoCard } : {}),
      } as import('../models/Conversation.js').IChatMessage);
      await conv.save();
    }
  }

  const reqDoc = reqCardOid ? await Requirement.findById(reqCardOid) : null;

  return {
    role: 'ai',
    content,
    time: formatChatTime(msgTime),
    reqCard: reqDoc ? toRequirementJson(reqDoc, user) : undefined,
    protoCard,
  };
}
