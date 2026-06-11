import { Schema, type Document, type Types } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export interface ICheckIn extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'start' | 'finish' | 'sos';
  location: { lat: number; lng: number };
  address: string;
  time: Date;
}

const checkInSchema = new Schema<ICheckIn>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'HikeEvent', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['start', 'finish', 'sos'], required: true },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    address: { type: String, default: '' },
    time: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

checkInSchema.index({ eventId: 1, userId: 1, type: 1 });

export const CheckIn = defineModel<ICheckIn>('CheckIn', 'checkins', checkInSchema);
