import { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export interface IJoinRequest extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const joinRequestSchema = new Schema<IJoinRequest>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'HikeEvent', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true },
);

// Unique compound index: one user can only apply once per event
joinRequestSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export const JoinRequest = defineModel<IJoinRequest>('JoinRequest', 'joinrequests', joinRequestSchema);
