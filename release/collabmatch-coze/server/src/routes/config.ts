import { Router } from 'express';
import { DOMAINS } from '../config/domains.js';
import { SKILLS, DOMAIN_SKILL_MAP } from '../config/skills.js';

const router = Router();

router.get('/domains', (_req, res) => {
  res.json({ domains: DOMAINS });
});

router.get('/skills', (_req, res) => {
  res.json({ skills: SKILLS, domainSkillMap: DOMAIN_SKILL_MAP });
});

export default router;
