import type { AnyObjectId } from '../db/objectId.js';
import { Requirement } from '../models/Requirement.js';
import { User } from '../models/User.js';
import type { IUser } from '../models/User.js';
import type { WorkflowConfig, WorkflowStep } from '../config/workflows.js';
import { executeSkillForUser, type SkillRunResult } from './skillRunner.js';
import { scoreUsersForRequirement } from './match.js';

const MATCH_FORWARD = '__action_match_forward__';
const MATCH_REVERSE = '__action_match_reverse__';

export function normalizeWorkflowStep(step: WorkflowStep): WorkflowStep & { action: string } {
  const skillId = step.skillId || '';
  if (skillId === MATCH_FORWARD || step.action === 'match_forward') {
    return { ...step, skillId: MATCH_FORWARD, action: 'match_forward' };
  }
  if (skillId === MATCH_REVERSE || step.action === 'match_reverse') {
    return { ...step, skillId: MATCH_REVERSE, action: 'match_reverse' };
  }
  return { ...step, action: step.action || 'skill' };
}

async function findLatestRequirementId(
  conversationId: string,
  userId: AnyObjectId,
): Promise<string | null> {
  const { Conversation } = await import('../models/Conversation.js');
  const conv = await Conversation.findOne({ _id: conversationId, userId });
  if (!conv) return null;
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    const m = conv.messages[i];
    if (m.reqCard) return String(m.reqCard);
  }
  const mineList = await Requirement.find({ author: userId }).sort({ updatedAt: -1 }).limit(1);
  const mine = mineList[0];
  return mine ? String(mine._id) : null;
}

async function appendAiToConversation(
  conversationId: string,
  userId: AnyObjectId,
  result: SkillRunResult,
): Promise<void> {
  const { Conversation } = await import('../models/Conversation.js');
  const conv = await Conversation.findOne({ _id: conversationId, userId });
  if (!conv) return;
  conv.messages.push({
    role: 'ai',
    content: result.content,
    time: new Date(),
  });
  await conv.save();
}

async function runMatchForwardStep(
  conversationId: string,
  user: IUser,
): Promise<SkillRunResult> {
  const reqId = await findLatestRequirementId(conversationId, user._id);
  if (!reqId) {
    return {
      role: 'ai',
      content: '⚠️ 未找到可匹配的需求，请先在对话中生成需求卡片。',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  const reqDoc = await Requirement.findById(reqId);
  if (!reqDoc) {
    return {
      role: 'ai',
      content: '⚠️ 需求不存在，无法匹配。',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  const users = await User.find({ _id: { $ne: user._id } }).limit(50);
  const scored = scoreUsersForRequirement(reqDoc, users).slice(0, 5);
  const lines = scored.map(
    (s, i) =>
      `${i + 1}. **${s.user.name}**（${s.matchPct}%）— ${s.user.position || ''} · 技能：${s.user.skills.slice(0, 4).join('、')}`,
  );

  const result: SkillRunResult = {
    role: 'ai',
    content: `🔍 **智能匹配结果**（需求：${reqDoc.title}）\n\n${lines.join('\n')}\n\n可在「智能匹配」页面向协作者发送邀请。`,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  };
  await appendAiToConversation(conversationId, user._id, result);
  return result;
}

async function runMatchReverseStep(conversationId: string, user: IUser): Promise<SkillRunResult> {
  const { scoreRequirementsForUser } = await import('./match.js');
  const reqs = await Requirement.find({ status: 'open', visibility: { $ne: 'invite_only' } }).limit(30);
  const scored = scoreRequirementsForUser(user, reqs, 3);
  const lines = scored.map(
    (s, i) => `${i + 1}. **${s.requirement.title}**（契合度 ${s.matchPct}%）`,
  );
  const result: SkillRunResult = {
    role: 'ai',
    content: `🔍 **为你推荐的需求**\n\n${lines.join('\n') || '暂无开放需求'}`,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  };
  await appendAiToConversation(conversationId, user._id, result);
  return result;
}

export async function executeWorkflowStep(
  conversationId: string,
  step: WorkflowStep,
  ctx: string,
  user: IUser,
): Promise<SkillRunResult> {
  const normalized = normalizeWorkflowStep(step);

  if (normalized.action === 'match_forward' || normalized.skillId === MATCH_FORWARD) {
    return runMatchForwardStep(conversationId, user);
  }
  if (normalized.action === 'match_reverse' || normalized.skillId === MATCH_REVERSE) {
    return runMatchReverseStep(conversationId, user);
  }

  if (!normalized.skillId) throw new Error('工作流步骤缺少 skillId');
  return executeSkillForUser(conversationId, normalized.skillId, ctx, user);
}

export { MATCH_FORWARD, MATCH_REVERSE };
