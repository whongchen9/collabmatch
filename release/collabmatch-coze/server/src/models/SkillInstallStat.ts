import mongoose, { Schema, type Document } from 'mongoose';
import { defineModel } from '../db/defineModel.js';

export interface ISkillInstallStat extends Document {
  skillId: string;
  installs: number;
}

const schema = new Schema<ISkillInstallStat>({
  skillId: { type: String, required: true, unique: true },
  installs: { type: Number, default: 0 },
});

export const SkillInstallStat = defineModel<ISkillInstallStat>('SkillInstallStat', 'skillinstallstats', schema);
