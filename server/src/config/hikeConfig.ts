/**
 * TrailMate - 徒步匹配平台配置
 * 替代 CollabMatch 的 domains.ts 和 skills.ts
 */

export const DIFFICULTY_LEVELS = {
  casual:    { label: '休闲', icon: '🌿', color: '#4ade80' },
  advanced:  { label: '进阶', icon: '⛰️', color: '#f59e0b' },
  challenge: { label: '挑战', icon: '🏔️', color: '#ef4444' },
} as const;

export type DifficultyKey = keyof typeof DIFFICULTY_LEVELS;

export const EVENT_TYPES = {
  dayhike:   { label: '日归', icon: '☀️' },
  overnight: { label: '多日', icon: '⛺' },
  longtrail: { label: '长线', icon: '🗺️' },
} as const;

export type EventTypeKey = keyof typeof EVENT_TYPES;

export const PREFERENCES = {
  scenery:    { label: '风景', icon: '🏞️' },
  challenge:  { label: '挑战', icon: '💪' },
  social:     { label: '社交', icon: '🤝' },
  photography:{ label: '摄影', icon: '📷' },
} as const;

export type PreferenceKey = keyof typeof PREFERENCES;

export const FEE_TYPES = {
  aa:      { label: 'AA' },
  free:    { label: '免费' },
  selfpay: { label: '各自付' },
} as const;

export type FeeTypeKey = keyof typeof FEE_TYPES;

export const EXPERIENCE_LEVELS = {
  novice:     { label: '新手', icon: '🌱' },
  experienced:{ label: '有经验', icon: '🥾' },
  veteran:    { label: '老驴', icon: '🏔️' },
} as const;

export type ExperienceKey = keyof typeof EXPERIENCE_LEVELS;

export const HIKE_FREQUENCIES = {
  monthly1:    { label: '每月1次' },
  'monthly2-3':{ label: '每月2-3次' },
  weekly1:     { label: '每周1次' },
  'weekly+':   { label: '每周多次' },
} as const;

export type HikeFrequencyKey = keyof typeof HIKE_FREQUENCIES;

/** 体能匹配矩阵：[活动难度][用户经验等级] → 分数(0-100) */
export const FITNESS_MATRIX: Record<DifficultyKey, Record<ExperienceKey, number>> = {
  casual:    { novice: 100, experienced: 80,  veteran: 50 },
  advanced:  { novice: 40,  experienced: 100, veteran: 80 },
  challenge: { novice: 0,   experienced: 60,  veteran: 100 },
};

/** 活动状态流转 */
export const EVENT_STATUSES = {
  draft:   { label: '草稿', color: '#9ca3af' },
  open:    { label: '报名中', color: '#4ade80' },
  full:    { label: '已满员', color: '#f59e0b' },
  ongoing: { label: '进行中', color: '#3b82f6' },
  ended:   { label: '已结束', color: '#6b7280' },
} as const;

export type EventStatusKey = keyof typeof EVENT_STATUSES;

/** 队伍状态 */
export const PARTY_STATUSES = {
  forming:  { label: '组队中' },
  ready:    { label: '已就绪' },
  ongoing:  { label: '进行中' },
  completed:{ label: '已完成' },
} as const;

export type PartyStatusKey = keyof typeof PARTY_STATUSES;

/** 前端配置接口 - 对应 /api/config/hike 返回的数据 */
export interface HikeConfigResponse {
  difficultyLevels: typeof DIFFICULTY_LEVELS;
  eventTypes: typeof EVENT_TYPES;
  preferences: typeof PREFERENCES;
  feeTypes: typeof FEE_TYPES;
  experienceLevels: typeof EXPERIENCE_LEVELS;
  hikeFrequencies: typeof HIKE_FREQUENCIES;
}
