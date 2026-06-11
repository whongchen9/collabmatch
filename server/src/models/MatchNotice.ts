import mongoose, { Schema, Document } from 'mongoose';

export interface IMatchNotice extends Document {
  /** 关联的意图 */
  intentId: string;
  /** 发起者 */
  fromUser: { id: string; name: string; avatar?: string };
  /** 被通知的用户 */
  toUserId: string;
  /** 发起者的原始输入 */
  rawInput: string;
  /** AI 提取的提示词（约束条件） */
  prompts: string[];
  /** 必要因素 */
  essentials: {
    location?: string;
    date?: string;
    groupSize?: number;
    difficulty?: string;
    eventType?: string;
  };
  /** 匹配度 */
  matchPct: number;
  /** 匹配理由 */
  reason: string;
  /** 状态：pending/accepted/rejected/expired */
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  /** 被通知用户的回复 */
  reply?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MatchNoticeSchema = new Schema<IMatchNotice>({
  intentId: { type: String, required: true, index: true },
  fromUser: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    avatar: String,
  },
  toUserId: { type: String, required: true, index: true },
  rawInput: { type: String, required: true },
  prompts: [{ type: String }],
  essentials: {
    location: String,
    date: String,
    groupSize: Number,
    difficulty: String,
    eventType: String,
  },
  matchPct: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending',
  },
  reply: String,
}, { timestamps: true });

MatchNoticeSchema.index({ toUserId: 1, status: 1, createdAt: -1 });

export const MatchNotice = mongoose.model<IMatchNotice>('MatchNotice', MatchNoticeSchema);
