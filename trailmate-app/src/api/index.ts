import type { User, HikeEvent, JoinRequest, CheckIn, Group, MatchResult, HikeConfig, Intent, MatchNotice } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

let token: string | null = localStorage.getItem('trailmate_token');

function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('trailmate_token', t);
  else localStorage.removeItem('trailmate_token');
}

async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401) { setToken(null); window.dispatchEvent(new Event('unauthorized')); }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `请求失败 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// Auth
export const authApi = {
  getConfig: () => api<{ githubEnabled: boolean; githubClientId: string }>('/auth/config'),
  emailLogin: (email: string, password: string) =>
    api<{ token: string; user: User }>('/auth/email-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, name: string) =>
    api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  githubLogin: (code: string) =>
    api<{ token: string; user: User }>('/auth/github/token', { method: 'POST', body: JSON.stringify({ code }) }),
  getMe: () => api<{ user: User }>('/users/me'),
  setToken,
  getToken: () => token,
};

// Events
export const eventsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<{ events: HikeEvent[] }>(`/hike-events${qs}`);
  },
  mine: () => api<{ events: HikeEvent[] }>('/hike-events/mine'),
  get: (id: string) => api<HikeEvent>(`/hike-events/${id}`),
  create: (data: Partial<HikeEvent>) =>
    api<{ hikeEvent: HikeEvent }>('/hike-events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<HikeEvent>) =>
    api<HikeEvent>(`/hike-events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  publish: (id: string, visibility: string) =>
    api<HikeEvent>(`/hike-events/${id}/publish`, { method: 'PUT', body: JSON.stringify({ visibility }) }),
  delete: (id: string) => api<void>(`/hike-events/${id}`, { method: 'DELETE' }),
  join: (id: string, message?: string) =>
    api<JoinRequest>(`/hike-events/${id}/join`, { method: 'PUT', body: JSON.stringify({ message }) }),
  requests: (id: string) => api<{ requests: JoinRequest[] }>(`/hike-events/${id}/requests`),
  reviewRequest: (eventId: string, reqId: string, status: 'accepted' | 'rejected') =>
    api<JoinRequest>(`/hike-events/${eventId}/requests/${reqId}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  checkin: (id: string, type: 'start' | 'finish', location?: { lat: number; lng: number }) =>
    api<CheckIn>(`/hike-events/${id}/checkin`, { method: 'POST', body: JSON.stringify({ type, location }) }),
  sos: (id: string, location?: { lat: number; lng: number }) =>
    api<CheckIn>(`/hike-events/${id}/sos`, { method: 'POST', body: JSON.stringify({ location }) }),
};

// Match
export const matchApi = {
  forward: (eventId: string) => api<MatchResult[]>(`/match/forward?eventId=${eventId}`),
  reverse: (limit = 10) => api<MatchResult[]>(`/match/reverse?limit=${limit}`),
};

// Intents (Core: one-sentence matching)
export const intentApi = {
  /** 一句话创建匹配意图 → AI 提取必要因素 + 提示词 → 自动匹配 */
  create: (rawInput: string) =>
    api<Intent>('/intents', { method: 'POST', body: JSON.stringify({ rawInput }) }),
  /** 获取我的意图列表 */
  mine: () => api<Intent[]>('/intents/mine'),
  /** 获取意图详情 */
  get: (id: string) => api<Intent>(`/intents/${id}`),
  /** 确认组队（从匹配结果中选择队友） */
  confirmTeam: (id: string, userIds: string[]) =>
    api<Group>('/intents/' + id + '/confirm-team', { method: 'POST', body: JSON.stringify({ userIds }) }),
  /** 更新意图（补充必要因素） */
  update: (id: string, data: Partial<Intent>) =>
    api<Intent>(`/intents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  /** 取消意图 */
  cancel: (id: string) => api<void>(`/intents/${id}`, { method: 'DELETE' }),
  /** 获取我的匹配通知 */
  notices: () => api<MatchNotice[]>('/intents/notices'),
  /** 未读通知数 */
  unreadCount: () => api<{ count: number }>('/intents/notices/unread-count'),
  /** 接受/拒绝通知 */
  respondNotice: (noticeId: string, status: 'accepted' | 'rejected', reply?: string) =>
    api<MatchNotice>(`/intents/notices/${noticeId}`, { method: 'PUT', body: JSON.stringify({ status, reply }) }),
  /** 预览差异点（不解散，只提取） */
  dissolvePreview: (id: string, chatMessages: { content: string; userName: string }[]) =>
    api<{
      preview: boolean;
      differencePoints: string[];
      myPreferences: { topic: string; preference: string }[];
      otherPreferences: { topic: string; preference: string; userName: string }[];
      message: string;
    }>(`/intents/${id}/dissolve`, { method: 'POST', body: JSON.stringify({ chatMessages, preview: true }) }),
  /** 解散队伍 + 用户选择的偏好 + 迭代匹配 */
  dissolve: (id: string, chatMessages: { content: string; userName: string }[], selectedPreferences: string[]) =>
    api<{
      dissolved: boolean;
      differencePoints: string[];
      myPreferences: { topic: string; preference: string }[];
      otherPreferences: { topic: string; preference: string; userName: string }[];
      selectedPreferences: string[];
      newPrompts: string[];
      newIntent: Intent;
      message: string;
    }>(`/intents/${id}/dissolve`, { method: 'POST', body: JSON.stringify({ chatMessages, selectedPreferences }) }),
  /** 迭代匹配（追加提示词重新匹配） */
  iterate: (id: string, additionalPrompts: string[]) =>
    api<Intent>(`/intents/${id}/iterate`, { method: 'POST', body: JSON.stringify({ additionalPrompts }) }),
};

// Groups
export const groupsApi = {
  list: () => api<Group[]>('/groups'),
  get: (id: string) => api<Group>(`/groups/${id}`),
  create: (eventId: string) =>
    api<Group>('/groups', { method: 'POST', body: JSON.stringify({ eventId }) }),
  sendMessage: (id: string, content: string, type = 'text') =>
    api<Group>(`/groups/${id}/messages`, { method: 'POST', body: JSON.stringify({ content, type }) }),
};

// Users
export const usersApi = {
  updateProfile: (data: Partial<User>) =>
    api<User>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  updateEmergencyContacts: (contacts: { name: string; phone: string }[]) =>
    api<User>('/users/me/emergency-contacts', { method: 'PUT', body: JSON.stringify({ contacts }) }),
  getStats: () => api<{ hikeCount: number; totalDistance: number; creditScore: number }>('/users/me/stats'),
};

// Config
export const configApi = {
  getHikeConfig: () => api<HikeConfig>('/config/hike'),
};
