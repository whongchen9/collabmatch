import type { IRequirement } from '../models/Requirement.js';

/** CollabMatch 需求 → 即DAO ensureAiCollabRoom 用的计划书正文 */
export function buildXcdNotebook(req: IRequirement): string {
  const parts = [
    req.title,
    req.goal ? `目标：${req.goal}` : '',
    req.background ? `背景：${req.background}` : '',
    req.desc ? `详情：${req.desc}` : '',
    req.skills?.length ? `技能：${req.skills.join('、')}` : '',
    req.timeline ? `周期：${req.timeline}` : '',
    req.outcome ? `预期成果：${req.outcome}` : '',
  ].filter(Boolean);

  const text = parts.join('\n\n').trim();
  if (text.length >= 12) return text.slice(0, 6000);
  return `${req.title || '协作需求'}\n\n来自 CollabMatch 的协作需求，请在即DAO 小程序中继续补充计划书。`;
}

export function xcdAiSessionId(requirementId: string): string {
  return `collabmatch:${requirementId}`;
}

export function toExternalJson(req: IRequirement) {
  return {
    source: req.externalSource || null,
    planId: req.externalPlanId || null,
    roomId: req.externalRoomId || null,
    syncStatus: req.externalSyncStatus,
    syncError: req.externalSyncError || null,
    syncedAt: req.externalSyncedAt ?? null,
  };
}
