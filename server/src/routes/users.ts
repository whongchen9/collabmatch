import { Router } from 'express';
import { newObjectId } from '../db/objectId.js';
import { User } from '../models/User.js';
import { toUserJson } from '../utils/serialize.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { DEFAULT_INSTALLED_SKILL_IDS } from '../config/skills.js';
import { validateSkillIds } from '../services/skillResolve.js';
import { incrementSkillInstalls } from '../services/skillMarket.js';
import { toPortfolioJson } from '../utils/portfolio.js';
import { Application } from '../models/Application.js';
import { Requirement } from '../models/Requirement.js';
import { toApplicationJson } from '../utils/applicationSerialize.js';
import { enhanceUserProfile } from '../services/profileEnhance.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { skills, domain } = req.query;
    const filter: Record<string, unknown> = {};
    if (domain && typeof domain === 'string') filter.domain = domain;
    if (skills && typeof skills === 'string') {
      filter.skills = { $in: skills.split(',').map((s) => s.trim()) };
    }
    const users = await User.find(filter).limit(100);
    res.json(users.map((u) => toUserJson(u)));
  } catch (e) {
    next(e);
  }
});

/** 已安装的 AI 技能（技能市场） */
router.get('/me/skills', requireAuth, (req: AuthRequest, res) => {
  const ids = req.user!.skillIds?.length ? req.user!.skillIds : DEFAULT_INSTALLED_SKILL_IDS;
  res.json({ skillIds: ids });
});

router.post('/me/skills', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { skillIds } = req.body as { skillIds?: string[] };
    if (!Array.isArray(skillIds)) {
      res.status(400).json({ error: 'skillIds 必须为数组' });
      return;
    }
    const invalid = await validateSkillIds(skillIds, req.user!._id);
    if (invalid) {
      res.status(400).json({ error: `无效技能 ID: ${invalid}` });
      return;
    }
    const prev = new Set(req.user!.skillIds || []);
    const added = skillIds.filter((id) => !prev.has(id));
    req.user!.skillIds = skillIds;
    await req.user!.save();
    await incrementSkillInstalls(added);
    res.json({ skillIds: req.user!.skillIds });
  } catch (e) {
    next(e);
  }
});

/** 个人名片技能标签 */
router.put('/me/skills', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { skills } = req.body as { skills?: string[] };
    if (!Array.isArray(skills)) {
      res.status(400).json({ error: 'skills 必须为数组' });
      return;
    }
    req.user!.skills = skills;
    await req.user!.save();
    res.json({ user: toUserJson(req.user!, { includePrivatePortfolio: true }) });
  } catch (e) {
    next(e);
  }
});

router.get('/me/applications', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const apps = await Application.find({ applicantId: req.user!._id }).sort({ createdAt: -1 });
    const reqIds = [...new Set(apps.map((a) => String(a.requirementId)))];
    const reqs = await Requirement.find({ _id: { $in: reqIds } });
    const reqMap = new Map(reqs.map((r) => [String(r._id), r]));
    res.json({
      applications: apps.map((a) =>
        toApplicationJson(a, req.user!, (reqMap.get(String(a.requirementId)) as import('../models/Requirement.js').IRequirement | undefined) ?? null),
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me/portfolio', requireAuth, (req: AuthRequest, res) => {
  res.json({
    portfolio: (req.user!.portfolio || []).map(toPortfolioJson),
  });
});

router.post('/me/portfolio', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { title, role, desc, collaborators, visibility, color, imageUrl } = req.body as {
      title?: string;
      role?: string;
      desc?: string;
      collaborators?: string[];
      visibility?: 'public' | 'match_only';
      color?: string;
      imageUrl?: string;
    };
    if (!title?.trim()) {
      res.status(400).json({ error: '作品标题不能为空' });
      return;
    }
    req.user!.portfolio.push({
      _id: newObjectId() as import('mongoose').Types.ObjectId,
      title: title.trim(),
      role: role?.trim() || '',
      desc: desc?.trim() || '',
      collaborators: Array.isArray(collaborators) ? collaborators : [],
      visibility: visibility === 'match_only' ? 'match_only' : 'public',
      color: color || 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      imageUrl: imageUrl || '',
      createdAt: new Date(),
    });
    await req.user!.save();
    const item = req.user!.portfolio[req.user!.portfolio.length - 1];
    res.status(201).json({ item: toPortfolioJson(item) });
  } catch (e) {
    next(e);
  }
});

router.put('/me/portfolio/:itemId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const item = req.user!.portfolio.find((p) => String(p._id) === req.params.itemId);
    if (!item) {
      res.status(404).json({ error: '作品不存在' });
      return;
    }
    const fields = ['title', 'role', 'desc', 'collaborators', 'visibility', 'color', 'imageUrl'] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) Object.assign(item, { [f]: req.body[f] });
    }
    await req.user!.save();
    res.json({ item: toPortfolioJson(item) });
  } catch (e) {
    next(e);
  }
});

router.delete('/me/portfolio/:itemId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const before = req.user!.portfolio.length;
    const filtered = req.user!.portfolio.filter((p) => String(p._id) !== req.params.itemId);
    req.user!.set('portfolio', filtered);
    if (filtered.length === before) {
      res.status(404).json({ error: '作品不存在' });
      return;
    }
    await req.user!.save();
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.post('/me/presence', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    req.user!.lastSeenAt = new Date();
    await req.user!.save();
    res.json({ online: true, lastSeenAt: req.user!.lastSeenAt });
  } catch (e) {
    next(e);
  }
});

// ─── API Token ────────────────────────────────────────
router.post('/me/api-token/generate', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const crypto = await import('crypto');
    const token = 'cm_' + crypto.randomBytes(24).toString('hex');
    req.user!.apiToken = token;
    req.user!.apiTokenLastGenerated = new Date();
    await req.user!.save();
    res.json({ token });
  } catch (e) { next(e); }
});

router.post('/me/api-token/revoke', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    req.user!.apiToken = '';
    await req.user!.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/me/ai-enhance-profile', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { bio, skills } = await enhanceUserProfile(req.user!);
    req.user!.bio = bio;
    req.user!.skills = skills;
    await req.user!.save();
    res.json({ user: toUserJson(req.user!, { includePrivatePortfolio: true }) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json({ user: toUserJson(user) });
  } catch (e) {
    next(e);
  }
});

const VALID_DOMAINS = ['tech', 'design', 'content', 'education', 'business', 'food', 'service'];

router.put('/me', requireAuth, validate({
  name: { type: 'string', maxLength: 50 },
  bio: { type: 'string', maxLength: 2000 },
}), async (req: AuthRequest, res, next) => {
  try {
    const { name, avatar, avatarColor, position, bio, domain, weeklyHours, collabIntent, interestedStages } = req.body;
    if (name !== undefined) req.user!.name = name;
    if (avatar !== undefined) req.user!.avatar = avatar;
    if (avatarColor !== undefined) req.user!.avatarColor = avatarColor;
    if (position !== undefined) req.user!.position = position;
    if (bio !== undefined) req.user!.bio = bio;
    if (domain !== undefined) {
      if (domain && !VALID_DOMAINS.includes(domain)) {
        res.status(400).json({ error: `domain 必须为 ${VALID_DOMAINS.join(', ')} 之一` });
        return;
      }
      req.user!.domain = domain;
    }
    if (weeklyHours !== undefined) req.user!.weeklyHours = weeklyHours;
    if (collabIntent !== undefined) req.user!.collabIntent = collabIntent;
    if (interestedStages !== undefined) req.user!.interestedStages = interestedStages;
    await req.user!.save();
    res.json({ user: toUserJson(req.user!, { includePrivatePortfolio: true }) });
  } catch (e) {
    next(e);
  }
});

router.put('/me/resources', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { resources } = req.body as { resources?: { icon: string; name: string; desc: string }[] };
    if (!Array.isArray(resources)) {
      res.status(400).json({ error: 'resources 必须为数组' });
      return;
    }
    req.user!.resources = resources;
    await req.user!.save();
    res.json({ user: toUserJson(req.user!, { includePrivatePortfolio: true }) });
  } catch (e) {
    next(e);
  }
});

export default router;
