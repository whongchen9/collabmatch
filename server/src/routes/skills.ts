import { Router } from 'express';
import { SKILLS, listMarketSkills } from '../config/skills.js';
import { enrichSkillsWithInstalls } from '../services/skillMarket.js';
import { optionalAuth, type AuthRequest } from '../middleware/auth.js';
import { resolveSkill } from '../services/skillResolve.js';

const router = Router();

router.get('/market', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const skills = await enrichSkillsWithInstalls(listMarketSkills(q));
    res.json({ skills });
  } catch (e) {
    next(e);
  }
});

router.get('/:skillId', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const skill = await resolveSkill(req.params.skillId, req.user?._id);
    if (!skill) {
      res.status(404).json({ error: '技能不存在' });
      return;
    }
    const { getSkillInstallCount } = await import('../services/skillMarket.js');
    const installs = SKILLS[skill.id]
      ? await getSkillInstallCount(skill.id)
      : 0;
    res.json({ skill: { ...skill, installs } });
  } catch (e) {
    next(e);
  }
});

export default router;
