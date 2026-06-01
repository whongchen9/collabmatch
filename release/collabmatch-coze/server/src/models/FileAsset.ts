import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export type FileStorageKind = 'inline' | 'cos';

export interface IFileAsset extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  fileName: string;
  mimeType: string;
  size: number;
  storage: FileStorageKind;
  /** inline 时存 base64 */
  data?: string;
  cosKey?: string;
  publicUrl?: string;
  groupId?: Types.ObjectId;
  conversationId?: Types.ObjectId;
  createdAt: Date;
}

const fileAssetSchema = new Schema<IFileAsset>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    storage: { type: String, enum: ['inline', 'cos'], default: 'inline' },
    data: { type: String },
    cosKey: { type: String },
    publicUrl: { type: String },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const FileAsset = defineModel<IFileAsset>('FileAsset', 'fileassets', fileAssetSchema);
