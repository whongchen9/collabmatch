import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export interface IHikeEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  author: Types.ObjectId;
  status: 'draft' | 'open' | 'full' | 'ongoing' | 'ended';
  visibility: 'public' | 'match_only' | 'invite_only';
  difficulty: 'casual' | 'advanced' | 'challenge';
  eventType: 'dayhike' | 'overnight' | 'longtrail';
  startDate: Date;
  meetupPoint: string;
  endPoint: string;
  distance: number;
  elevation: number;
  estimatedHours: number;
  maxMembers: number;
  feeType: 'aa' | 'free' | 'selfpay';
  feeAmount: number;
  gearRequired: string;
  description: string;
  coverImage: string;
  gpxFileId: Types.ObjectId;
  tags: string[];
  invitees: Types.ObjectId[];
  matchProgress: number;
  createdAt: Date;
  updatedAt: Date;
}

const hikeEventSchema = new Schema<IHikeEvent>(
  {
    title: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['draft', 'open', 'full', 'ongoing', 'ended'], default: 'draft' },
    visibility: { type: String, enum: ['public', 'match_only', 'invite_only'], default: 'public' },
    difficulty: { type: String, enum: ['casual', 'advanced', 'challenge'], default: 'casual' },
    eventType: { type: String, enum: ['dayhike', 'overnight', 'longtrail'], default: 'dayhike' },
    startDate: { type: Date },
    meetupPoint: { type: String, default: '' },
    endPoint: { type: String, default: '' },
    distance: { type: Number, default: 0 },
    elevation: { type: Number, default: 0 },
    estimatedHours: { type: Number, default: 0 },
    maxMembers: { type: Number, default: 10 },
    feeType: { type: String, enum: ['aa', 'free', 'selfpay'], default: 'aa' },
    feeAmount: { type: Number, default: 0 },
    gearRequired: { type: String, default: '' },
    description: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    gpxFileId: { type: Schema.Types.ObjectId, ref: 'FileAsset' },
    tags: { type: [String], default: [] },
    invitees: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    matchProgress: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const HikeEvent = defineModel<IHikeEvent>('HikeEvent', 'hikeevents', hikeEventSchema);

export type EventStatus = IHikeEvent['status'];
