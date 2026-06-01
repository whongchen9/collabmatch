import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export interface IChatAttachment {
  fileId: string;
  fileName: string;
  mimeType?: string;
}

export interface IChatMessage {
  role: 'ai' | 'user';
  content: string;
  time: Date;
  reqCard?: Types.ObjectId;
  /** generate_ui 等技能返回的可嵌入 iframe 的 HTML */
  protoCard?: string;
  attachments?: IChatAttachment[];
}

export interface IConversation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  domain: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ['ai', 'user'], required: true },
    content: { type: String, required: true },
    time: { type: Date, default: Date.now },
    reqCard: { type: Schema.Types.ObjectId, ref: 'Requirement' },
    protoCard: { type: String },
    attachments: {
      type: [
        {
          fileId: { type: String, required: true },
          fileName: { type: String, required: true },
          mimeType: { type: String },
        },
      ],
      default: undefined,
    },
  },
  { _id: false },
);

const conversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: '新需求对话' },
    domain: { type: String, default: 'tech' },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

export const Conversation = defineModel<IConversation>('Conversation', 'conversations', conversationSchema);
