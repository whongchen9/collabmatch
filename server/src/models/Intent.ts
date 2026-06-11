import mongoose, { Schema, Document } from 'mongoose';

export interface IIntent extends Document {
  rawInput: string;
  essentials: {
    location?: string;
    date?: string;
    groupSize?: number;
    difficulty?: 'casual' | 'advanced' | 'challenge';
    eventType?: 'dayhike' | 'overnight' | 'longtrail';
  };
  prompts: string[];
  essentialsComplete: boolean;
  status: 'matching' | 'matched' | 'teaming' | 'confirmed' | 'expired';
  matchedUsers: IMatchedUser[];
  author: { id: string; name: string; avatar?: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface IMatchedUser {
  user: { id: string; name: string; avatar?: string; avatarColor?: string };
  matchPct: number;
  breakdown: {
    essentials: number;
    prompts: number;
    profile: number;
  };
  reason: string;
}

const MatchedUserSchema = new Schema<IMatchedUser>({
  user: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    avatar: String,
    avatarColor: String,
  },
  matchPct: { type: Number, required: true },
  breakdown: {
    essentials: { type: Number, default: 0 },
    prompts: { type: Number, default: 0 },
    profile: { type: Number, default: 0 },
  },
  reason: { type: String, default: '' },
}, { _id: false });

const IntentSchema = new Schema<IIntent>({
  rawInput: { type: String, required: true },
  essentials: {
    location: String,
    date: String,
    groupSize: Number,
    difficulty: { type: String, enum: ['casual', 'advanced', 'challenge'] },
    eventType: { type: String, enum: ['dayhike', 'overnight', 'longtrail'] },
  },
  prompts: [{ type: String }],
  essentialsComplete: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['matching', 'matched', 'teaming', 'confirmed', 'expired'],
    default: 'matching',
  },
  matchedUsers: [MatchedUserSchema],
  author: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    avatar: String,
  },
}, { timestamps: true });

IntentSchema.index({ 'author.id': 1, createdAt: -1 });
IntentSchema.index({ status: 1 });

export const Intent = mongoose.model<IIntent>('Intent', IntentSchema);
