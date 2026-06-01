import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { DomainKey } from '../config/domains.js';
import { defineModel } from '../db/defineModel.js';

export interface IUserResource {
  icon: string;
  name: string;
  desc: string;
}

export interface IPortfolioItem {
  _id?: Types.ObjectId;
  title: string;
  role: string;
  desc: string;
  collaborators: string[];
  visibility: 'public' | 'match_only';
  color: string;
  imageUrl: string;
  createdAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  phone: string;
  name: string;
  avatar: string;
  avatarColor: string;
  position: string;
  bio: string;
  skills: string[];
  /** 技能市场已安装的 AI 技能 ID */
  skillIds: string[];
  domain: DomainKey;
  collabScore: number;
  projects: number;
  resources: IUserResource[];
  portfolio: IPortfolioItem[];
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    avatarColor: { type: String, default: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    position: { type: String, default: '' },
    bio: { type: String, default: '' },
    skills: { type: [String], default: [] },
    skillIds: { type: [String], default: [] },
    domain: { type: String, default: 'tech' },
    collabScore: { type: Number, default: 4.5 },
    projects: { type: Number, default: 0 },
    resources: {
      type: [{ icon: String, name: String, desc: String }],
      default: [],
    },
    lastSeenAt: { type: Date },
    portfolio: {
      type: [
        {
          title: { type: String, required: true },
          role: { type: String, default: '' },
          desc: { type: String, default: '' },
          collaborators: { type: [String], default: [] },
          visibility: { type: String, enum: ['public', 'match_only'], default: 'public' },
          color: { type: String, default: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
          imageUrl: { type: String, default: '' },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const User = defineModel<IUser>('User', 'users', userSchema);
