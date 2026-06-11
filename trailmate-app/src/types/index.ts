/* ── 核心模型：Intent（匹配意图） ── */

/** 匹配意图——用户的一句话需求 */
export interface Intent {
  id: string;
  /** 原始输入 */
  rawInput: string;
  /** AI 提取的必要因素 */
  essentials: {
    location?: string;       // 地点（可空=未定）
    date?: string;           // 日期（可空=未定）
    groupSize?: number;      // 人数（可空=未定）
    difficulty?: 'casual' | 'advanced' | 'challenge';
    eventType?: 'dayhike' | 'overnight' | 'longtrail';
  };
  /** AI 提取的精炼提示词（灵活需求） */
  prompts: string[];         // ["不喜欢抽烟", "有经验优先", "喜欢拍照"]
  /** 必要因素是否完整（决定是否可进入"确定细节"阶段） */
  essentialsComplete: boolean;
  /** 状态 */
  status: 'matching' | 'matched' | 'teaming' | 'confirmed' | 'expired';
  /** 匹配到的用户 */
  matchedUsers: MatchedUser[];
  /** 创建者 */
  author: { id: string; name: string; avatar?: string };
  createdAt: string;
  updatedAt: string;
}

/** 匹配到的用户 */
export interface MatchedUser {
  user: { id: string; name: string; avatar?: string; avatarColor?: string };
  matchPct: number;
  breakdown: {
    essentials: number;   // 必要因素匹配度
    prompts: number;      // 提示词匹配度
    profile: number;      // 用户档案匹配度
  };
  /** AI 生成的匹配理由（一句话解释为什么匹配） */
  reason: string;
}

/** 匹配通知——系统作为中间人告知被匹配用户 */
export interface MatchNotice {
  id: string;
  intentId: string;
  fromUser: { id: string; name: string; avatar?: string };
  rawInput: string;
  prompts: string[];
  essentials: {
    location?: string;
    date?: string;
    groupSize?: number;
    difficulty?: string;
    eventType?: string;
  };
  matchPct: number;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  reply?: string;
  createdAt: string;
}

/* ── 用户模型 ── */
export interface User {
  id: string;
  email?: string;
  name: string;
  avatar?: string;
  avatarColor?: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  experienceLevel: 'novice' | 'experienced' | 'veteran';
  preferences: string[];
  hikeFrequency: string;
  creditScore: number;
  hikeCount: number;
  totalDistance: number;
  emergencyContacts: { name: string; phone: string }[];
  /** 用户的精炼提示词（从历史意图和偏好中提取） */
  userPrompts: string[];
  online?: boolean;
}

/* ── 队伍（匹配成功后创建） ── */
export interface Group {
  id: string;
  name: string;
  emoji: string;
  avatarColor: string;
  desc: string;
  eventId?: string | null;
  intentId?: string | null;
  status: 'forming' | 'ready' | 'ongoing' | 'completed';
  members: { id: string; name: string; avatar?: string; avatarColor?: string }[];
  messages: GroupMessage[];
  /** 队伍商定的细节（从聊天中提取或手动确认） */
  confirmedDetails?: {
    location: string;
    date: string;
    groupSize: number;
  };
  createdAt: string;
}

export interface GroupMessage {
  user: { id: string; name: string; avatar?: string; avatarColor?: string };
  type: 'text' | 'file' | 'system';
  content: string;
  fileName?: string;
  fileSize?: string;
  time: string;
}

/* ── 兼容旧模型 ── */
export interface HikeEvent {
  id: string;
  title: string;
  author: { id: string; name: string; avatar?: string; avatarColor?: string };
  status: string;
  visibility: string;
  difficulty: string;
  eventType: string;
  startDate: string;
  meetupPoint: string;
  endPoint: string;
  distance: number;
  elevation: number;
  estimatedHours: number;
  maxMembers: number;
  feeType: string;
  feeAmount: number;
  gearRequired: string;
  description: string;
  coverImage: string;
  tags: string[];
  invitees: string[];
  matchProgress: number;
  createdAt: string;
  updatedAt: string;
}

export interface JoinRequest {
  id: string;
  eventId: string;
  user: { id: string; name: string; avatar?: string };
  message: string;
  status: string;
  createdAt: string;
}

export interface CheckIn {
  id: string;
  eventId: string;
  user: { id: string; name: string; avatar?: string };
  type: 'start' | 'finish' | 'sos';
  location: { lat: number; lng: number };
  address: string;
  time: string;
}

export interface MatchResult {
  matchPct: number;
  breakdown: {
    essentials?: number;
    prompts?: number;
    profile?: number;
    fitness?: number;
    preference?: number;
    time?: number;
    distance?: number;
    heat?: number;
  };
  user?: User;
  event?: HikeEvent;
  reason?: string;
}

export interface HikeConfig {
  difficultyLevels: Record<string, { label: string; icon: string; color: string }>;
  eventTypes: Record<string, { label: string; icon: string }>;
  preferences: Record<string, { label: string; icon: string }>;
  feeTypes: Record<string, { label: string }>;
  experienceLevels: Record<string, { label: string; icon: string }>;
  hikeFrequencies: Record<string, { label: string }>;
}
