import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { DomainKey } from '../config/domains.js';
import { defineModel } from '../db/defineModel.js';

export type ReqStatus = 'draft' | 'open' | 'matched';
export type ReqVisibility = 'public' | 'match_only' | 'invite_only';

export interface IRequirement extends Document {
  _id: Types.ObjectId;
  title: string;
  author: Types.ObjectId;
  status: ReqStatus;
  visibility: ReqVisibility;
  domain: DomainKey;
  skills: string[];
  keywords: string[];
  background: string;
  goal: string;
  timeline: string;
  outcome: string;
  desc: string;
  matchProgress: number;
  /** 定向邀请 / 已接受协作者可查看 invite_only 需求 */
  invitees: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const requirementSchema = new Schema<IRequirement>(
  {
    title: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['draft', 'open', 'matched'], default: 'draft' },
    visibility: { type: String, enum: ['public', 'match_only', 'invite_only'], default: 'public' },
    domain: { type: String, default: 'tech' },
    skills: { type: [String], default: [] },
    keywords: { type: [String], default: [] },
    background: { type: String, default: '' },
    goal: { type: String, default: '' },
    timeline: { type: String, default: '3-6 个月' },
    outcome: { type: String, default: '' },
    desc: { type: String, default: '' },
    matchProgress: { type: Number, default: 0 },
    invitees: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { timestamps: true },
);

export const Requirement = defineModel<IRequirement>('Requirement', 'requirements', requirementSchema);
