import mongoose, { Schema, type Document } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export interface ISmsCode extends Document {
  phone: string;
  code: string;
  expiresAt: Date;
  sentAt: Date;
}

const smsCodeSchema = new Schema<ISmsCode>({
  phone: { type: String, required: true, index: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  sentAt: { type: Date, default: Date.now },
});

smsCodeSchema.index({ phone: 1 }, { unique: true });

export const SmsCode = defineModel<ISmsCode>('SmsCode', 'smscodes', smsCodeSchema);
