import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { DomainKey } from '../config/domains.js';
import { defineModel } from '../db/defineModel.js';

export type ReqStatus = 'draft' | 'open' | 'matched';
export type ReqVisibility = 'public' | 'match_only' | 'invite_only';
export type FulfillmentType = 'project' | 'instant';
export type ExternalSyncStatus = 'none' | 'pending' | 'synced' | 'failed';

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
  /** 长期项目 vs 即时协作（即DAO 侧走计划/匹配，无支付订单） */
  fulfillmentType: FulfillmentType;
  /** 外部履约来源，如 xiaoChen-dao */
  externalSource: string;
  externalPlanId: string;
  externalRoomId: string;
  externalSyncStatus: ExternalSyncStatus;
  externalSyncError: string;
  externalSyncedAt?: Date;
  /** Phase 2: Side Project fields */
  sceneTag: string;
  projectStage: string;
  weeklyHours: string;
  collabMode: string;
  lookingFor: string[];
  remoteOk: boolean;
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
    fulfillmentType: { type: String, enum: ['project', 'instant'], default: 'project' },
    externalSource: { type: String, default: '' },
    externalPlanId: { type: String, default: '' },
    externalRoomId: { type: String, default: '' },
    externalSyncStatus: {
      type: String,
      enum: ['none', 'pending', 'synced', 'failed'],
      default: 'none',
    },
    externalSyncError: { type: String, default: '' },
    externalSyncedAt: { type: Date },
    /** Phase 2: Side Project fields */
    sceneTag: { type: String, enum: ['side-project', 'opensource'], default: 'side-project' },
    projectStage: { type: String, enum: ['idea', 'prototype', 'mvp', 'growth'], default: 'idea' },
    weeklyHours: { type: String, enum: ['≤5h', '5-10h', '10-20h', '20h+'], default: '5-10h' },
    collabMode: { type: String, enum: ['联创', '有偿', '股权/分成面议', '开源贡献'], default: '联创' },
    lookingFor: { type: [String], default: [] },
    remoteOk: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Requirement = defineModel<IRequirement>('Requirement', 'requirements', requirementSchema);
