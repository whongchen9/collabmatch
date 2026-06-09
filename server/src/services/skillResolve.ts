import type { Types } from 'mongoose';
import { SKILLS, type SkillConfig } from '../config/skills.js';
import { UserSkill } from '../models/UserSkill.js';

function userSkillToConfig(doc: {
  skillId: string;
  icon: string;
  name: string;
  desktop: string;
  instruct: string;
  category?: string;
  author?: string;
  tags?: string[];
}): SkillConfig {
  return {
    id: doc.skillId,
    icon: doc.icon,
    name: doc.name,
    desktop: doc.desktop,
    instruct: doc.instruct,
    category: (doc.category as SkillConfig['category']) || 'community',
    author: doc.author || '我',
    tags: doc.tags || ['自定义'],
    installs: 0,
    version: '1.0',
    isInstallable: true,
  };
}

export async function resolveSkill(
  skillId: string,
  userId?: Types.ObjectId,
): Promise<SkillConfig | null> {
  if (SKILLS[skillId]) return SKILLS[skillId];
  if (!userId) return null;
  const doc = await UserSkill.findOne({ userId, skillId });
  return doc ? userSkillToConfig(doc) : null;
}
