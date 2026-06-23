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
  /** 缺失的必要字段 */
  missingFields?: string[];
  /** 状态 */
  status: 'matching' | 'matched' | 'teaming' | 'confirmed' | 'expired';
  /** 匹配到的用户 */
  matchedUsers: MatchedUser[];
  /** 匹配到的队伍 */
  matchedTeams?: MatchedTeam[];
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

/** 匹配到的队伍 */
export interface MatchedTeam {
  groupId: string;
  groupName: string;
  groupMembers: { id: string; name: string; avatar?: string; avatarUrl?: string }[];
  maxMembers: number;
  intentId: string;
  intentAuthor: { id: string; name: string; avatar?: string; avatarUrl?: string };
  essentials: {
    location?: string;
    date?: string;
    groupSize?: number;
    difficulty?: string;
    eventType?: string;
  };
  prompts: string[];
  matchPct: number;
  breakdown: {
    intent: number;
    prompts: number;
    pace: number;
    activity: number;
    distance: number;
  };
  reason: string;
}

/** 匹配通知——系统作为中间人告知被匹配用户 */
export interface MatchNotice {
  id: string;
  type?: string;
  intentId?: string;
  fromUser?: { id: string; name: string; avatar?: string };
  fromUserName?: string;
  rawInput?: string;
  prompts?: string[];
  essentials?: {
    location?: string;
    date?: string;
    groupSize?: number;
    difficulty?: string;
    eventType?: string;
  };
  matchPct?: number;
  reason?: string;
  title?: string;
  content?: string;
  groupId?: string;
  fromGroupId?: string;
  targetGroupId?: string;
  targetTeamName?: string;
  targetTeamMembers?: number;
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
  hikeFrequency: string;
  creditScore: number;
  hikeCount: number;
  totalDistance: number;
  emergencyContacts: { name: string; phone: string }[];
  /** 资源设备 */
  resources?: { text: string; image?: string }[];
  /** 用户的精炼提示词（从历史意图和偏好中提取） */
  userPrompts: string[];
  online?: boolean;
  createdAt?: number;
}

/* ── 队伍（匹配成功后创建） ── */
export interface Group {
  id: string;
  name: string;
  type?: 'hike' | 'other';
  emoji?: string;
  avatarColor?: string;
  desc?: string;
  eventId?: string | null;
  intentId?: string | null;
  leaderId?: string | null;
  status: 'forming' | 'ready' | 'ongoing' | 'completed' | 'recruiting';
  hikeStatus?: 'idle' | 'hiking' | 'completed';
  matchingEnabled?: boolean;
  members: { id: string; name: string; avatar?: string; avatarUrl?: string; avatarColor?: string; role?: string; joinedAt?: number }[];
  maxMembers?: number;
  essentials?: {
    location?: string;
    date?: string;
    groupSize?: number;
    difficulty?: string;
    eventType?: string;
  };
  prompts?: string[];
  plan?: string;
  likes?: number;
  hot?: boolean;
  photos?: string[];
  comments?: { userId: string; userName: string; avatarColor?: string; content: string; time: string; createdAt: number }[];
  locations?: { userId: string; userName: string; lat: number; lng: number; updatedAt: number }[];
  shareToken?: string;
  checkpoints?: { lat: number; lng: number; label?: string; type?: 'meeting' | 'start' | 'checkpoint' | 'end'; createdAt: number; checkins?: { userId: string; userName: string; avatarColor?: string; checkedInAt: number; photos?: string[]; notes?: string }[] }[];
  messages?: GroupMessage[];
  confirmedDetails?: {
    location: string;
    date: string;
    groupSize: number;
  };
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GroupMessage {
  id?: string;
  user: { id: string; name: string; avatar?: string; avatarUrl?: string; avatarColor?: string };
  type: 'text' | 'file' | 'system' | 'image';
  content: string;
  fileName?: string;
  fileSize?: string;
  time: string;
}

export type ReportReason = 'spam' | 'abuse' | 'inappropriate' | 'illegal' | 'other';

export interface Report {
  id: string;
  reporterId: string;
  targetUserId: string;
  targetMessageId?: string;
  groupId?: string;
  reason: ReportReason;
  description?: string;
  createdAt: number;
}

export interface BlockedUser {
  userId: string;
  userName: string;
  avatarColor?: string;
  blockedAt: number;
}

export interface TrailLog {
  id: string;
  userId?: string;
  userName?: string;
  status?: 'active' | 'completed';
  type: 'hike' | 'other';
  title: string;
  date: string;
  location?: string;
  distance?: number;
  duration?: number;
  notes?: string;
  photos?: string[];
  groupId?: string;
  rating?: number;
  createdAt?: number;
  updatedAt?: number;
  checkpoints?: { label?: string; checkedInAt?: number; notes?: string; photos?: string[] }[];
  track?: { lat: number; lng: number; timestamp: number }[];
  totalDistance?: number;
  movingDuration?: number;
  avgPace?: number;
}

/* ── 山志图鉴：经典路线 ── */
export interface RouteCheckpoint {
  label: string;
  lat: number;
  lng: number;
  order: number;
  tip?: string;
}

export interface RouteTitle {
  name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'hidden';
  condition: string;
  icon?: string;
}

export interface RouteComment {
  id: string;
  userId: string;
  userName: string;
  avatarColor?: string;
  content: string;
  time: string;
  createdAt: number;
  likes: number;
  titleBadge?: string;
}

export interface RouteCoverAuthor {
  id: string;
  name: string;
}

export interface ClassicRoute {
  id: string;
  name: string;
  province: string;
  theme: string;
  coverImage?: string;
  coverImageAuthor?: RouteCoverAuthor;
  coverGradient: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  distance: string;
  duration: string;
  elevation: string;
  story: string;
  storyQuote: string;
  guide: string;
  tags: string[];
  checkpoints: RouteCheckpoint[];
  titles: RouteTitle[];
  comments: RouteComment[];
  relatedTeamIds: string[];
  /** 当地特色美食 */
  localFood?: string[];
  /** 地方习俗/文化 */
  customs?: string[];
  /** 地方特色/特产 */
  specialties?: string[];
}

/* ── 信号系统：全屏地图求助/求救 ── */

export type SignalType = 'help' | 'sos';

export interface Signal {
  id: string;
  userId: string;
  userName: string;
  avatarColor?: string;
  type: SignalType;
  lat: number;
  lng: number;
  createdAt: number;
  expiresAt: number;
  message?: string;
}

export interface SignalNotificationSettings {
  notifyHelpEnabled: boolean;
  notifySOSEnabled: boolean;
  signalRange: number; // 1-10 km, default 5
}
