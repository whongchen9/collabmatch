import type { DomainKey } from '../config/domains.js';
import { getDomain } from '../config/domains.js';
import { asOne } from '../db/helpers.js';
import type { IUser } from '../models/User.js';
import { Requirement, type IRequirement } from '../models/Requirement.js';
import { maybeGenerateRequirementFromText } from './aiMock.js';

const REQ_MARKER = /<!--REQ:(\{[\s\S]*?\})-->/;

export interface LlmReqPayload {
  title?: string;
  skills?: string[];
  background?: string;
  goal?: string;
  timeline?: string;
  outcome?: string;
  desc?: string;
}

export function stripReqMarker(content: string): { content: string; payload: LlmReqPayload | null } {
  const match = content.match(REQ_MARKER);
  if (!match) return { content, payload: null };
  try {
    const payload = JSON.parse(match[1]) as LlmReqPayload;
    const cleaned = content.replace(REQ_MARKER, '').trimEnd();
    return { content: cleaned, payload };
  } catch {
    return { content: content.replace(REQ_MARKER, '').trimEnd(), payload: null };
  }
}

export async function createRequirementFromPayload(
  payload: LlmReqPayload,
  domainKey: DomainKey,
  user: IUser,
  fallbackText: string,
): Promise<IRequirement> {
  const domain = getDomain(domainKey);
  const domainTag = domain.name.split(' ')[1] || domain.name;
  const title =
    payload.title?.trim() ||
    fallbackText.slice(0, 28) + (fallbackText.length > 28 ? '...' : '');
  const skills =
    payload.skills?.length && payload.skills.length > 0
      ? payload.skills.slice(0, 8)
      : domain.skills.slice(0, 3);

  return asOne(
    await Requirement.create({
    title,
    author: user._id,
    status: 'draft',
    visibility: 'public',
    domain: domainKey,
    skills,
    keywords: skills,
    background: payload.background?.trim() || `用户描述：${fallbackText.slice(0, 120)}`,
    goal: payload.goal?.trim() || `在「${domainTag}」领域实现项目目标。`,
    timeline: payload.timeline?.trim() || '3-6 个月',
    outcome: payload.outcome?.trim() || '完成阶段性目标并找到核心协作伙伴',
    desc: payload.desc?.trim() || fallbackText.slice(0, 200),
    matchProgress: 0,
    }),
  );
}

/** 解析 LLM 回复中的 REQ 标记，或按启发式生成需求卡 */
export async function processLlmChatResult(
  fullContent: string,
  userText: string,
  domainKey: DomainKey,
  user: IUser,
): Promise<{ content: string; reqCard?: IRequirement; renameTitle?: string }> {
  const { content: stripped, payload } = stripReqMarker(fullContent);

  if (payload?.title) {
    const req = await createRequirementFromPayload(payload, domainKey, user, userText);
    return {
      content:
        stripped ||
        `已为你在「${getDomain(domainKey).name}」领域生成结构化需求文档\n\n点击下方卡片查看详情。`,
      reqCard: req,
      renameTitle: req.title.slice(0, 20),
    };
  }

  const heuristic = await maybeGenerateRequirementFromText(userText, domainKey, user);
  if (heuristic) {
    return {
      content:
        stripped ||
        `已为你在「${getDomain(domainKey).name}」领域生成结构化需求文档\n\n点击下方卡片查看详情。`,
      reqCard: heuristic,
      renameTitle: heuristic.title.slice(0, 20),
    };
  }

  return { content: stripped || fullContent };
}

export async function processSkillLlmResult(
  skillId: string,
  fullContent: string,
  context: string,
  domainKey: DomainKey,
  user: IUser,
): Promise<{ content: string; reqCard?: IRequirement }> {
  if (skillId !== 'generate_prd') {
    return { content: fullContent };
  }
  const { content, reqCard, renameTitle } = await processLlmChatResult(
    fullContent,
    context || '生成需求文档',
    domainKey,
    user,
  );
  void renameTitle;
  return { content, reqCard };
}
