import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export interface IUserSkill extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  skillId: string;
  icon: string;
  name: string;
  desktop: string;
  instruct: string;
  category: 'official' | 'community';
  author: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSkillSchema = new Schema<IUserSkill>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skillId: { type: String, required: true },
    icon: { type: String, default: 'sparkle' },
    name: { type: String, required: true },
    desktop: { type: String, default: '' },
    instruct: { type: String, required: true },
    category: { type: String, enum: ['official', 'community'], default: 'community' },
    author: { type: String, default: '我' },
    tags: { type: [String], default: ['自定义'] },
  },
  { timestamps: true },
);

userSkillSchema.index({ userId: 1, skillId: 1 }, { unique: true });

export const UserSkill = defineModel<IUserSkill>('UserSkill', 'userskills', userSkillSchema);
