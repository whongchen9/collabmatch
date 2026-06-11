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
  email: string;
  passwordHash: string;
  name: string;
  avatar: string;
  avatarColor: string;
  avatarUrl: string;
  position: string;
  bio: string;
  skills: string[];
  /** MCP / API 访问令牌，用于 Agent 接入 */
  apiToken: string;
  apiTokenLastGenerated: Date;
  /** 技能市场已安装的 AI 技能 ID */
  skillIds: string[];
  domain: DomainKey;
  collabScore: number;
  projects: number;
  resources: IUserResource[];
  portfolio: IPortfolioItem[];
  /** Phase 2: Side Project user fields */
  weeklyHours: string;
  collabIntent: string;
  interestedStages: string[];
  lastSeenAt?: Date;
  city: string;
  experienceLevel: 'novice' | 'experienced' | 'veteran';
  preferences: string[];
  hikeFrequency: 'monthly1' | 'monthly2-3' | 'weekly1' | 'weekly+';
  emergencyContacts: { name: string; phone: string }[];
  creditScore: number;
  hikeCount: number;
  totalDistance: number;
  /** GitHub OAuth ID */
  githubId: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: false, unique: true, sparse: true, index: true },
    email: { type: String, unique: true, sparse: true, index: true },
    passwordHash: { type: String, default: '' },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    avatarColor: { type: String, default: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    avatarUrl: { type: String, default: '' },
    position: { type: String, default: '' },
    bio: { type: String, default: '' },
    skills: { type: [String], default: [] },
    apiToken: { type: String, default: '' },
    apiTokenLastGenerated: { type: Date },
    skillIds: { type: [String], default: [] },
    domain: { type: String, default: 'tech' },
    collabScore: { type: Number, default: null },
    projects: { type: Number, default: 0 },
    resources: {
      type: [{ icon: String, name: String, desc: String }],
      default: [],
    },
    lastSeenAt: { type: Date },
    city: { type: String, default: '' },
    experienceLevel: { type: String, enum: ['novice', 'experienced', 'veteran'], default: 'novice' },
    preferences: { type: [String], default: [] },
    hikeFrequency: { type: String, enum: ['monthly1', 'monthly2-3', 'weekly1', 'weekly+'], default: 'monthly1' },
    emergencyContacts: { type: [{ name: String, phone: String }], default: [] },
    creditScore: { type: Number, default: 100 },
    hikeCount: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 },
    githubId: { type: String, unique: true, sparse: true, index: true },
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
    /** Phase 2: Side Project user fields */
    weeklyHours: { type: String, enum: ['≤5h', '5-10h', '10-20h', '20h+', ''], default: '' },
    collabIntent: { type: String, enum: ['联创', '有偿副业', '开源贡献', ''], default: '' },
    interestedStages: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const User = defineModel<IUser>('User', 'users', userSchema);
