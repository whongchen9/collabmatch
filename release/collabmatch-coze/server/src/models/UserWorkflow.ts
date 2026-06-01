import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export interface IUserWorkflowStep {
  skillId?: string;
  action?: string;
  title: string;
  icon: string;
}

export interface IUserWorkflow extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  workflowId: string;
  name: string;
  desc: string;
  steps: IUserWorkflowStep[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userWorkflowSchema = new Schema<IUserWorkflow>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workflowId: { type: String, required: true },
    name: { type: String, required: true },
    desc: { type: String, default: '自定义流程' },
    steps: {
      type: [
        {
          skillId: { type: String },
          action: { type: String },
          title: { type: String, required: true },
          icon: { type: String, default: '⚡' },
        },
      ],
      required: true,
    },
    tags: { type: [String], default: ['自定义'] },
  },
  { timestamps: true },
);

userWorkflowSchema.index({ userId: 1, workflowId: 1 }, { unique: true });

export const UserWorkflow = defineModel<IUserWorkflow>('UserWorkflow', 'userworkflows', userWorkflowSchema);
