import { Router } from 'express';
import { User } from '../models/User.js';
import { Requirement } from '../models/Requirement.js';
import { scoreUsersForRequirement, scoreRequirementsForUser } from '../services/match.js';
import { populateReqAuthor, toUserJson, toRequirementJson } from '../utils/serialize.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/forward', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const requirementId = (req.query.requirementId ?? req.query.reqId) as string;
    if (!requirementId) {
      res.status(400).json({ error: '需要 requirementId' });
      return;
    }
    const reqDoc = await Requirement.findById(requirementId);
    if (!reqDoc) {
      res.status(404).json({ error: '需求不存在' });
      return;
    }
    if (String(reqDoc.author) !== String(req.user!._id)) {
      res.status(403).json({ error: '仅需求发布者可查看匹配推荐' });
      return;
    }
    const users = await User.find({ _id: { $ne: reqDoc.author } });
    const scored = scoreUsersForRequirement(reqDoc, users);
    res.json(
      scored.map(({ user, matchPct }) => ({
        user: toUserJson(user),
        matchPct,
      })),
    );
  } catch (e) {
    next(e);
  }
});

router.get('/reverse', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const limit = Number(req.query.limit) || 3;
    const reqs = await Requirement.find({
      status: 'open',
      visibility: { $ne: 'invite_only' },
      author: { $ne: req.user!._id },
    });
    const scored = scoreRequirementsForUser(req.user!, reqs, limit);
    const populated = await populateReqAuthor(scored.map((s) => s.requirement));
    res.json(
      scored.map((s, i) => ({
        requirement: { ...populated[i], userMatchPct: s.matchPct },
        matchPct: s.matchPct,
      })),
    );
  } catch (e) {
    next(e);
  }
});

export default router;
