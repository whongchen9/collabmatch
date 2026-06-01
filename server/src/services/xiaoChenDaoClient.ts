import { env } from '../config/env.js';

export type XcdActionResult = {
  ok: boolean;
  errMsg?: string;
  hint?: string;
  [key: string]: unknown;
};

type HttpSpec = { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string };

/** 已文档化的 REST 路径；未列出的 action 走 invoke 端点 */
const ACTION_HTTP: Record<string, HttpSpec> = {
  login: { method: 'POST', path: '/auth/login' },
  chat: { method: 'POST', path: '/ai/chat' },
  notifications: { method: 'GET', path: '/notifications' },
  markNotifyRead: { method: 'POST', path: '/notifications/read' },
  profile: { method: 'GET', path: '/profile' },
  listChatRooms: { method: 'GET', path: '/groups' },
  listAddresses: { method: 'GET', path: '/addresses' },
};

export function isXcdConfigured(): boolean {
  return Boolean(env.xcdInvokeUrl || env.xcdApiBaseUrl);
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function buildHeaders(openid: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Platform': env.xcdPlatform,
  };
  if (openid) headers.Authorization = `Bearer ${openid}`;
  if (env.xcdApiKey) headers['X-Api-Key'] = env.xcdApiKey;
  return headers;
}

async function parseJson(res: Response): Promise<XcdActionResult> {
  const text = await res.text();
  if (!text) {
    return { ok: false, errMsg: `HTTP ${res.status}`, hint: '空响应' };
  }
  try {
    return JSON.parse(text) as XcdActionResult;
  } catch {
    return { ok: false, errMsg: `HTTP ${res.status}`, hint: text.slice(0, 200) };
  }
}

/** 通过 invoke 桥接或 REST 路径调用即DAO service 云函数 action */
export async function invokeXcdAction(
  action: string,
  payload: Record<string, unknown>,
  openid: string,
): Promise<XcdActionResult> {
  if (!isXcdConfigured()) {
    return {
      ok: false,
      errMsg: 'XCD_NOT_CONFIGURED',
      hint: '请配置 XCD_INVOKE_URL 或 XCD_API_BASE_URL',
    };
  }

  const headers = buildHeaders(openid);

  if (env.xcdInvokeUrl) {
    const res = await fetch(env.xcdInvokeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...payload }),
    });
    return parseJson(res);
  }

  const spec = ACTION_HTTP[action];
  if (!spec) {
    return {
      ok: false,
      errMsg: 'XCD_ACTION_NO_REST',
      hint: `action「${action}」无 REST 映射，请配置 XCD_INVOKE_URL（推荐）`,
    };
  }

  const url = `${trimSlash(env.xcdApiBaseUrl)}${spec.path}`;
  const res = await fetch(url, {
    method: spec.method,
    headers,
    body: spec.method === 'GET' ? undefined : JSON.stringify(payload),
  });
  return parseJson(res);
}

export type EnsurePlanPayload = {
  aiSessionId: string;
  notebook: string;
};

export type EnsurePlanResult = XcdActionResult & {
  planId?: string;
  roomId?: string;
  title?: string;
  existed?: boolean;
};

/** 幂等：在即DAO 创建/更新协作计划（ensureAiCollabRoom） */
export async function ensureXcdPlan(
  openid: string,
  payload: EnsurePlanPayload,
): Promise<EnsurePlanResult> {
  return invokeXcdAction('ensureAiCollabRoom', payload, openid) as Promise<EnsurePlanResult>;
}

/** 开启计划匹配（instant 需求默认可再显式打开） */
export async function setXcdPlanMatchEnabled(
  openid: string,
  planId: string,
  enabled: boolean,
): Promise<XcdActionResult> {
  return invokeXcdAction('setPlanMatchEnabled', { planId, enabled }, openid);
}

/** 同步匹配摘要到协作群（若已有 roomId） */
export async function syncXcdPlanMatchDigest(
  openid: string,
  roomId: string,
): Promise<XcdActionResult> {
  return invokeXcdAction('syncPlanMatchDigest', { roomId }, openid);
}
