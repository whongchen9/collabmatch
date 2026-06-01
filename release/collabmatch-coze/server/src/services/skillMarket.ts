import { SKILLS } from '../config/skills.js';
import { SkillInstallStat } from '../models/SkillInstallStat.js';

export async function getSkillInstallCount(skillId: string): Promise<number> {
  const base = SKILLS[skillId]?.installs ?? 0;
  const stat = await SkillInstallStat.findOne({ skillId });
  return base + (stat?.installs ?? 0);
}

export async function incrementSkillInstalls(skillIds: string[]): Promise<void> {
  for (const skillId of skillIds) {
    if (!SKILLS[skillId]) continue;
    await SkillInstallStat.findOneAndUpdate(
      { skillId },
      { $inc: { installs: 1 } },
      { upsert: true },
    );
  }
}

export async function enrichSkillsWithInstalls<T extends { id: string; installs?: number }>(
  skills: T[],
): Promise<T[]> {
  return Promise.all(
    skills.map(async (s) => ({
      ...s,
      installs: await getSkillInstallCount(s.id),
    })),
  );
}
