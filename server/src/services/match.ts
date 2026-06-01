import { getDomain } from '../config/domains.js';
import type { IUser } from '../models/User.js';
import type { IRequirement } from '../models/Requirement.js';

function skillOverlap(a: string[], b: string[]): number {
  let count = 0;
  for (const s of a) {
    const sl = s.toLowerCase();
    if (b.some((k) => sl.includes(k.toLowerCase()) || k.toLowerCase().includes(sl))) count++;
  }
  return count;
}

/** 需求 → 用户（forward） */
export function scoreUsersForRequirement(req: IRequirement, users: IUser[]) {
  const domain = getDomain(req.domain);
  const keywords = req.keywords.length ? req.keywords : req.skills;

  return users
    .map((u) => {
      const domainFit = u.skills.filter((s) => domain.skills.includes(s)).length;
      const domainBonus = Math.min(domainFit * 5, 15);
      const overlap = skillOverlap(u.skills, keywords);
      const skillScore = Math.min((overlap / Math.max(keywords.length, 1)) * 50, 50);
      const collabScore = (u.collabScore - 4) * 25;
      const base = 25;
      const matchPct = Math.round(Math.min(skillScore + collabScore + domainBonus + base, 98));
      return { user: u, matchPct };
    })
    .sort((a, b) => b.matchPct - a.matchPct);
}

/** 用户技能 → 需求（reverse） */
export function scoreRequirementsForUser(user: IUser, reqs: IRequirement[], limit = 3) {
  return reqs
    .map((r) => {
      const keywords = r.keywords.length ? r.keywords : r.skills;
      const overlap = skillOverlap(user.skills, keywords);
      const heat = r.matchProgress * 0.1;
      const domainBonus = user.domain === r.domain ? 5 : 0;
      const userMatchPct = Math.round(
        Math.min((overlap / Math.max(keywords.length, 1)) * 45 + heat + 35 + domainBonus, 95),
      );
      return { requirement: r, matchPct: userMatchPct };
    })
    .sort((a, b) => b.matchPct - a.matchPct)
    .slice(0, limit);
}
