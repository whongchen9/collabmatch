import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface IApplication extends Document {
  _id: Types.ObjectId;
  requirementId: Types.ObjectId;
  applicantId: Types.ObjectId;
  message: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', required: true, index: true },
    applicantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true },
);

applicationSchema.index({ requirementId: 1, applicantId: 1 }, { unique: true });

export const Application = defineModel<IApplication>('Application', 'applications', applicationSchema);
