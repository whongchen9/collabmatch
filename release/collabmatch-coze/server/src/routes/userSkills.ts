import { Router } from 'express';
import { asOne } from '../db/helpers.js';
import { UserSkill } from '../models/UserSkill.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { userSkillToConfig } from '../services/skillResolve.js';
import { DEFAULT_INSTALLED_SKILL_IDS } from '../config/skills.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const docs = await UserSkill.find({ userId: req.user!._id }).sort({ createdAt: -1 });
    res.json({ skills: docs.map((d) => userSkillToConfig(d)) });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { name, instruct, desktop, icon, desc } = req.body as {
      name?: string;
      instruct?: string;
      desktop?: string;
      icon?: string;
      desc?: string;
    };
    if (!name?.trim() || !instruct?.trim()) {
      res.status(400).json({ error: '名称和指令不能为空' });
      return;
    }

    const skillId = `uskill_${Date.now().toString(36)}`;
    const doc = asOne(
      await UserSkill.create({
        userId: req.user!._id,
        skillId,
        name: name.trim(),
        instruct: instruct.trim(),
        desktop: (desktop || desc || name).trim(),
        icon: icon?.trim() || '✨',
        author: req.user!.name,
        category: 'community',
        tags: ['自定义'],
      }),
    );

    const ids = req.user!.skillIds?.length ? [...req.user!.skillIds] : [...DEFAULT_INSTALLED_SKILL_IDS];
    if (!ids.includes(skillId)) {
      req.user!.skillIds = [...ids, skillId];
      await req.user!.save();
    }

    res.status(201).json({ skill: userSkillToConfig(doc), skillIds: req.user!.skillIds });
  } catch (e) {
    next(e);
  }
});

router.delete('/:skillId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const deleted = await UserSkill.findOneAndDelete({
      userId: req.user!._id,
      skillId: req.params.skillId,
    });
    if (!deleted) {
      res.status(404).json({ error: '自定义技能不存在' });
      return;
    }
    req.user!.skillIds = (req.user!.skillIds || []).filter((id) => id !== req.params.skillId);
    await req.user!.save();
    res.json({ success: true, skillIds: req.user!.skillIds });
  } catch (e) {
    next(e);
  }
});

export default router;
