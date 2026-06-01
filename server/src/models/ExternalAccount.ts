import mongoose, { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export type ExternalProvider = 'xiaoChen-dao';

export interface IExternalAccount extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  provider: ExternalProvider;
  /** 即DAO 侧 openid */
  externalId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const externalAccountSchema = new Schema<IExternalAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['xiaoChen-dao'], required: true },
    externalId: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

externalAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });

export const ExternalAccount = defineModel<IExternalAccount>(
  'ExternalAccount',
  'external_accounts',
  externalAccountSchema,
);
