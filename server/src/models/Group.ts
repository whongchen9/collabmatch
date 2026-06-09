import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export interface IGroupMessage {
  user: Types.ObjectId;
  type: 'text' | 'file' | 'system';
  content: string;
  fileName?: string;
  fileSize?: string;
  time: Date;
}

export interface IGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  emoji: string;
  avatarColor: string;
  desc: string;
  reqId: Types.ObjectId;
  members: Types.ObjectId[];
  messages: IGroupMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const groupMessageSchema = new Schema<IGroupMessage>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'file', 'system'], default: 'text' },
    content: { type: String, default: '' },
    fileName: String,
    fileSize: String,
    time: { type: Date, default: Date.now },
  },
  { _id: true },
);

const groupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    emoji: { type: String, default: 'rocket' },
    avatarColor: { type: String, default: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    desc: { type: String, default: '' },
    reqId: { type: Schema.Types.ObjectId, ref: 'Requirement', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    messages: { type: [groupMessageSchema], default: [] },
  },
  { timestamps: true },
);

export const Group = defineModel<IGroup>('Group', 'groups', groupSchema);
