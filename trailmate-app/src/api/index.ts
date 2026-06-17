import type { User, Group, Intent, MatchNotice, TrailLog } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.hostname.includes('tcloudbaseapp.com')
  ? 'https://cloudbase-d6g8yog0ub3e56efe.service.tcloudbase.com/api'
  : '/api');

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
  if (token && !token.startsWith('guest_')) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) console.warn(`[API] ${opts.method || 'GET'} ${path} → ${res.status}`);
  if (res.status === 401 && (!token || !token.startsWith('guest_'))) { setToken(null); window.dispatchEvent(new Event('unauthorized')); }
  if (!res.ok) {
    let errMsg = `请求失败 (${res.status})`;
    try {
      const text = await res.text();
      const body = JSON.parse(text);
      errMsg = body.error || body.message || errMsg;
    } catch {}
    throw new Error(errMsg);
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
  getMe: () => api<{ user: User }>('/auth/me'),
  forgotPassword: (email: string) =>
    api<{ ok: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    api<{ ok: boolean }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  setToken,
  getToken: () => token,
};

// Intents (Core: one-sentence matching)
export const intentApi = {
  /** AI 提炼提示词（不创建 Intent） */
  extract: (text: string) =>
    api<{ prompts: string[]; essentials: any; essentialsComplete: boolean; reply: string }>('/intents/extract', { method: 'POST', body: JSON.stringify({ text }) }),
  /** 一句话创建匹配意图 → AI 提取必要因素 + 提示词 → 自动匹配 */
  create: async (rawInput: string) => {
    const res = await api<{ intent: Intent }>('/intents', { method: 'POST', body: JSON.stringify({ rawInput }) });
    return res.intent;
  },
  /** 获取我的意图列表 */
  mine: async () => {
    const res = await api<{ items: Intent[]; total: number }>('/intents/mine');
    return res.items || [];
  },
  /** 获取意图详情 */
  get: async (id: string) => {
    const res = await api<{ intent: Intent }>(`/intents/${id}`);
    return res.intent;
  },
  /** 确认组队（从匹配结果中选择队友） */
  confirmTeam: async (id: string, userIds: string[]) => {
    const res = await api<{ ok: boolean; group: Group }>('/intents/' + id + '/confirm-team', { method: 'POST', body: JSON.stringify({ memberIds: userIds }) });
    return res.group;
  },
  /** 更新意图（补充必要因素） */
  update: (id: string, data: Partial<Intent>) =>
    api<Intent>(`/intents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  /** 取消意图 */
  cancel: (id: string) => api<void>(`/intents/${id}`, { method: 'DELETE' }),
  /** 获取我的匹配通知 */
  notices: async () => {
    const res = await api<{ items: MatchNotice[]; total: number }>('/intents/notices');
    return res.items || [];
  },
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
  iterate: async (id: string, additionalPrompts: string[]) => {
    const res = await api<{ intent: Intent }>(`/intents/${id}/iterate`, { method: 'POST', body: JSON.stringify({ additionalPrompts }) });
    return res.intent;
  },
  /** 修改意图（更新essentials/prompts并重新匹配） */
  modifyIntent: async (id: string, data: { essentials?: any; prompts?: string[] }) => {
    const res = await api<{ intent: Intent }>(`/intents/${id}/update`, { method: 'POST', body: JSON.stringify(data) });
    return res.intent;
  },
};

// Groups
export const groupsApi = {
  list: async () => {
    const res = await api<{ items: Group[]; total: number }>('/groups');
    return (res.items || []).map(normalizeGroup);
  },
  get: async (id: string) => {
    // 先尝试直接获取，失败则从列表中查找
    try {
      const res = await api<{ group: Group }>(`/groups/${id}`);
      return normalizeGroup(res.group);
    } catch {
      // fallback: 从列表中查找
      const list = await groupsApi.list();
      const found = list.find(g => g.id === id);
      if (!found) throw new Error('Not found');
      return found;
    }
  },
  create: (eventId: string) =>
    api<Group>('/groups', { method: 'POST', body: JSON.stringify({ eventId }) }),
  sendMessage: (id: string, content: string, type = 'text') =>
    api<{ ok: boolean }>(`/groups/${id}/messages`, { method: 'POST', body: JSON.stringify({ content, type }) }),
  checkin: (id: string, checkpointIndex: number, lat: number, lng: number) =>
    api<{ ok: boolean; distance?: number }>(`/groups/${id}/checkin`, { method: 'POST', body: JSON.stringify({ checkpointIndex, lat, lng }) }),
  sos: (id: string, location?: { lat: number; lng: number }) =>
    api<{ ok: boolean; sos?: boolean }>(`/groups/${id}/sos`, { method: 'POST', body: JSON.stringify({ location }) }),
  leave: (id: string) =>
    api<{ ok: boolean }>(`/groups/${id}/leave`, { method: 'POST' }),
  transferLeader: (id: string, newLeaderId: string) =>
    api<{ ok: boolean }>(`/groups/${id}/transfer-leader`, { method: 'POST', body: JSON.stringify({ newLeaderId }) }),
  update: (id: string, data: Partial<Group>) =>
    api<{ ok: boolean }>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  merge: (fromId: string, toId: string) =>
    api<{ ok: boolean; groupId: string }>(`/groups/merge`, { method: 'POST', body: JSON.stringify({ fromId, toId }) }),
  applyMerge: (fromId: string, toId: string) =>
    api<{ ok: boolean; message: string }>(`/groups/apply-merge`, { method: 'POST', body: JSON.stringify({ fromId, toId }) }),
  applyJoin: (groupId: string) =>
    api<{ ok: boolean; message: string }>(`/groups/${groupId}/apply-join`, { method: 'POST' }),
  acceptMergeRequest: (noticeId: string) =>
    api<{ ok: boolean; groupId: string }>(`/groups/merge-requests/${noticeId}/accept`, { method: 'PUT' }),
  rejectMergeRequest: (noticeId: string) =>
    api<{ ok: boolean }>(`/groups/merge-requests/${noticeId}/reject`, { method: 'PUT' }),
  acceptJoinRequest: (noticeId: string) =>
    api<{ ok: boolean; groupId: string }>(`/groups/join-requests/${noticeId}/accept`, { method: 'PUT' }),
  rejectJoinRequest: (noticeId: string) =>
    api<{ ok: boolean }>(`/groups/join-requests/${noticeId}/reject`, { method: 'PUT' }),
  likeGroup: (id: string) =>
    api<{ ok: boolean; likes: number }>(`/groups/${id}/likes`, { method: 'PUT', body: JSON.stringify({ increment: 1 }) }),
  publicGroups: (type: string, page = 1, limit = 6) =>
    api<{ items: any[]; total: number; hasMore: boolean }>(`/groups/public?type=${type}&page=${page}&limit=${limit}`),
  reportLocation: (id: string, lat: number, lng: number) =>
    api<{ ok: boolean }>(`/groups/${id}/location`, { method: 'POST', body: JSON.stringify({ lat, lng }) }),
  getLocations: (id: string, token?: string) =>
    api<{ locations: any[]; checkpoints: any[]; groupName: string; teamInfo: any }>(`/groups/${id}/location${token ? `?token=${token}` : ''}`),
  generateShareToken: (id: string) =>
    api<{ shareToken: string }>(`/groups/${id}/share-token`, { method: 'POST' }),
};

/** Normalize group data from CloudBase format */
function normalizeGroup(g: any): Group {
  if (!g) return g;
  return {
    ...g,
    messages: (g.messages || []).map((m: any) => {
      if (m.user) return { ...m, type: m.type || 'text' }; // already normalized
      return {
        user: { id: m.userId || '', name: m.userName || '', avatar: m.avatar || '' },
        type: m.type || 'text',
        content: m.content || m.text || '',
        time: m.createdAt || m.time || Date.now(),
      };
    }),
    members: (g.members || []).map((m: any) => {
      if (typeof m === 'string') return { id: m, name: '', avatar: '' };
      return m;
    }),
  };
}

// Users
export const usersApi = {
  updateProfile: (data: Partial<User>) =>
    api<{ ok: boolean }>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  updateEmergencyContacts: (contacts: { name: string; phone: string }[]) =>
    api<{ ok: boolean }>('/users/me/emergency-contacts', { method: 'PUT', body: JSON.stringify({ contacts }) }),
  getStats: () => api<{ hikeCount: number; totalDistance: number; creditScore: number }>('/users/me/stats'),
  updateAvatar: (avatarUrl: string) =>
    api<{ ok: boolean }>('/users/me/avatar', { method: 'PUT', body: JSON.stringify({ avatarUrl }) }),
  getSettings: () => api<{ sosNotifyNearby?: boolean }>('/users/me/settings'),
  updateSettings: (settings: Record<string, any>) =>
    api<{ ok: boolean }>('/users/me/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  uploadImage: (base64: string, filename: string) =>
    api<{ url: string }>('/upload', { method: 'POST', body: JSON.stringify({ base64, filename }) }),
  generateApiToken: () =>
    api<{ token: string }>('/users/me/api-token/generate', { method: 'POST' }),
  revokeApiToken: () =>
    api<{ ok: boolean }>('/users/me/api-token/revoke', { method: 'POST' }),
};

export const traillogsApi = {
  list: () => api<TrailLog[]>('/traillogs'),
  get: (id: string) => api<TrailLog>(`/traillogs/${id}`),
  create: (data: Partial<TrailLog>) => api<TrailLog>('/traillogs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<TrailLog>) => api<{ ok: boolean }>(`/traillogs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => api<{ ok: boolean }>(`/traillogs/${id}`, { method: 'DELETE' }),
  generateFromGroup: (groupId: string) => api<{ ok: boolean; count: number }>(`/groups/${groupId}/generate-logs`, { method: 'POST' }),
  generateForUser: (groupId: string, userId: string, data: any) => api<{ ok: boolean }>(`/groups/${groupId}/generate-log/${userId}`, { method: 'POST', body: JSON.stringify(data) }),
};

// Lobby (Game-style team matching)
export interface LobbyRoom {
  id: string;
  name: string;
  emoji?: string;
  avatarColor?: string;
  location: string;
  date: string;
  difficulty: string;
  eventType?: string;
  prompts: string[];
  members: { id: string; name: string; avatar?: string; avatarUrl?: string; avatarColor?: string; role?: string }[];
  memberCount: number;
  maxMembers: number;
  needPeople: number;
  urgency: 'high' | 'mid' | 'low' | 'full';
  leader: { id: string; name: string; avatar?: string; avatarUrl?: string } | null;
  likes: number;
  hot: boolean;
  photos: string[];
  status?: string;
  intentId?: string;
  createdAt?: number;
}

export interface QuickMatchResult {
  rooms: {
    roomId: string;
    name: string;
    emoji?: string;
    location: string;
    date: string;
    difficulty: string;
    prompts: string[];
    members: { id: string; name: string; avatar?: string; avatarUrl?: string; avatarColor?: string; role?: string }[];
    memberCount: number;
    maxMembers: number;
    matchPct: number;
    reason: string;
    intentId?: string;
  }[];
  soloPlayers: {
    type: 'solo';
    userId: string;
    userName: string;
    avatar?: string;
    avatarUrl?: string;
    location: string;
    date: string;
    difficulty: string;
    prompts: string[];
    matchPct: number;
    reason: string;
    intentId?: string;
  }[];
  autoRoom: { roomId: string; name: string; isNew: boolean } | null;
  missingFields: string[];
  totalMatches: number;
}

export const lobbyApi = {
  /** 浏览组队大厅房间列表 */
  rooms: (filters?: { location?: string; date?: string; difficulty?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.location) params.set('location', filters.location);
    if (filters?.date) params.set('date', filters.date);
    if (filters?.difficulty) params.set('difficulty', filters.difficulty);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    return api<{ items: LobbyRoom[]; total: number; hasMore: boolean }>(`/lobby/rooms${qs ? '?' + qs : ''}`);
  },
  /** 队长开房 */
  createRoom: (data: {
    name?: string; location?: string; date?: string; difficulty?: string;
    eventType?: string; groupSize?: number; prompts?: string[]; rawInput?: string;
  }) => api<{ ok: boolean; roomId: string; room: any }>('/lobby/create-room', { method: 'POST', body: JSON.stringify(data) }),
  /** 快速匹配 */
  quickMatch: (data: {
    location?: string; date?: string; difficulty?: string;
    eventType?: string; groupSize?: number; prompts?: string[]; rawInput?: string;
    autoCreateTeam?: boolean;
  }) => api<QuickMatchResult>('/lobby/quick-match', { method: 'POST', body: JSON.stringify(data) }),
  /** 加入房间 */
  joinRoom: (roomId: string) => api<{ ok: boolean; status: 'pending_approval' | 'joined'; groupId?: string; message?: string }>(`/lobby/join/${roomId}`, { method: 'POST' }),
};

// ── Gamification API ──
export interface GamificationRank {
  key: string; name: string; icon: string; score: number;
  nextRank: { key: string; name: string; minScore: number } | null;
}
export interface GamificationRealm {
  key: string; name: string; level: number; stability: number;
}
export interface GamificationTitle {
  id: string; name: string; desc: string; category: string;
}
export interface MountainCodex {
  id: string; name: string; elevation: number; difficulty: string; city: string;
  legend: string; seasons: { spring: string; summer: string; autumn: string; winter: string };
  unlocked: boolean;
}

export const gamificationApi = {
  /** 获取我的游戏化数据 */
  me: () => api<{
    rank: GamificationRank;
    realm: GamificationRealm;
    titles: GamificationTitle[];
    allTitles: GamificationTitle[];
    codex: MountainCodex[];
    stats: { totalCheckins: number; uniqueLocations: number; totalHikes: number };
  }>('/gamification/me'),
  /** 山志图鉴详情 */
  codexDetail: (id: string) => api<MountainCodex>(`/gamification/codex/${id}`),
};

// 路途人格相关接口
export interface TrailPersonality {
  key: string; name: string; emoji: string; desc: string; color: string;
}
export interface PersonalityQuizOption {
  key: string; text: string; personality: string;
}
export interface PersonalityQuiz {
  id: string; question: string; options: PersonalityQuizOption[];
}

export const personalityApi = {
  /** 获取人格测试题 */
  quiz: () => api<{ questions: PersonalityQuiz[] }>('/personality/quiz'),
  /** 提交测试结果 */
  submit: (answers: Record<string, string>) =>
    api<{ personality: TrailPersonality }>('/personality/submit', { method: 'POST', body: JSON.stringify({ answers }) }),
};

// 队伍段位相关接口
export interface TeamRankInfo {
  key: string; name: string; icon: string; stars: number; minScore: number;
}

export const teamRankApi = {
  /** 获取我的队伍段位 */
  me: () => api<{
    teams: { groupId: string; name: string; rank: TeamRankInfo; score: number }[];
    bestRank: { groupId: string; name: string; rank: TeamRankInfo; score: number } | null;
  }>('/team-rank/me'),
};

// 匹配回顾卡片
export interface MatchReview {
  groupId: string; groupName: string; location: string;
  members: { name: string; avatarUrl: string; avatarColor: string; personality: string | null }[];
  matchPct: number; checkpointCount: number;
  teamRank: TeamRankInfo; summary: string; createdAt: number;
}

export const reviewApi = {
  /** 获取匹配回顾卡片 */
  get: (groupId: string) => api<MatchReview>(`/groups/${groupId}/review`),
};

/* ── 山志图鉴：经典路线 ── */
import type { ClassicRoute, RouteComment } from '@/types';
import routesData from '@/data/routes';

export const routesApi = {
  /** 获取所有经典路线 */
  list: async (): Promise<ClassicRoute[]> => routesData,
  /** 获取单条路线详情 */
  get: async (id: string): Promise<ClassicRoute | undefined> => routesData.find(r => r.id === id),
  /** 添加评论 */
  addComment: async (routeId: string, comment: Omit<RouteComment, 'id' | 'createdAt' | 'time' | 'likes'>): Promise<RouteComment> => {
    const newComment: RouteComment = {
      ...comment,
      id: 'c' + Date.now(),
      createdAt: Date.now(),
      time: '刚刚',
      likes: 0,
    };
    const route = routesData.find(r => r.id === routeId);
    if (route) {
      // 深拷贝 comments 避免修改静态导入数据
      route.comments = [...route.comments];
      route.comments.unshift(newComment);
    }
    return newComment;
  },
};
