import type { IRequirement } from '../models/Requirement.js';
import {
  ensureXcdPlan,
  setXcdPlanMatchEnabled,
  syncXcdPlanMatchDigest,
  isXcdConfigured,
  type EnsurePlanResult,
} from './xiaoChenDaoClient.js';
import { buildXcdNotebook, xcdAiSessionId } from '../utils/xcdIntegration.js';

export { isXcdConfigured };

export type SyncRequirementResult =
  | { ok: true; planId: string; roomId: string; existed: boolean; title?: string }
  | { ok: false; errMsg: string; hint?: string };

const fail = (errMsg: string, hint?: string): Extract<SyncRequirementResult, { ok: false }> => ({
  ok: false as const,
  errMsg,
  ...(hint !== undefined ? { hint } : {}),
});

/** 将 CollabMatch 需求同步到即DAO 协作计划 */
export async function syncRequirementToXcd(
  req: IRequirement,
  openid: string,
): Promise<SyncRequirementResult> {
  if (!isXcdConfigured()) {
    return fail('XCD_NOT_CONFIGURED', '服务端未配置即DAO API');
  }

  const aiSessionId = xcdAiSessionId(String(req._id));
  const notebook = buildXcdNotebook(req);

  let result: EnsurePlanResult;
  try {
    result = await ensureXcdPlan(openid, { aiSessionId, notebook });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail('XCD_NETWORK', msg);
  }

  if (!result.ok) {
    return fail(result.errMsg || 'XCD_SYNC_FAILED', result.hint);
  }

  const planId = String(result.planId || '');
  if (!planId) {
    return fail('XCD_NO_PLAN_ID', '即DAO 未返回 planId');
  }

  if (req.fulfillmentType === 'instant') {
    await setXcdPlanMatchEnabled(openid, planId, true).catch(() => {});
  }

  const roomId = String(result.roomId || '');
  if (roomId) {
    await syncXcdPlanMatchDigest(openid, roomId).catch(() => {});
  }

  return {
    ok: true as const,
    planId,
    roomId,
    existed: !!result.existed,
    ...(typeof result.title === 'string' ? { title: result.title } : {}),
  };
}
