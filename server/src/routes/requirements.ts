import { Router } from 'express';
import { asOne } from '../db/helpers.js';
import { usePostgres } from '../db/driver.js';
import { Requirement, type ReqVisibility } from '../models/Requirement.js';
import { Application } from '../models/Application.js';
import { Group } from '../models/Group.js';
import { populateReqAuthor, toRequirementJson } from '../utils/serialize.js';
import { requireAuth, optionalAuth, type AuthRequest } from '../middleware/auth.js';
import { canViewRequirement } from '../utils/requirementAccess.js';
import { User } from '../models/User.js';
import { toApplicationJson } from '../utils/applicationSerialize.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { domain, visibility, sceneTag, weeklyHours, lookingFor, page, pageSize } = req.query;
    const filter: Record<string, unknown> = { status: 'open' };
    if (domain) filter.domain = domain;
    if (visibility) filter.visibility = visibility;
    else filter.visibility = 'public';
    if (sceneTag) filter.sceneTag = sceneTag;
    if (weeklyHours) filter.weeklyHours = weeklyHours;
    if (lookingFor && typeof lookingFor === 'string') filter.lookingFor = { $in: lookingFor.split(',') };

    // M-02: Pagination support (default page=1, pageSize=20, max 50)
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const pageSizeNum = Math.min(50, Math.max(1, parseInt(String(pageSize), 10) || 20));
    const total = await Requirement.countDocuments(filter);
    const reqs = await Requirement.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSizeNum)
      .limit(pageSizeNum);
    const list = await populateReqAuthor(reqs);
    res.json({
      items: list,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/mine', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const reqs = await Requirement.find({ author: req.user!._id }).sort({ createdAt: -1 });
    const list = await populateReqAuthor(reqs);
    const reqIds = reqs.map((r) => r._id);
    let pendingCounts: { _id: (typeof reqIds)[0]; count: number }[] = [];
    if (usePostgres()) {
      const apps = await Application.find({
        requirementId: { $in: reqIds.map(String) },
        status: 'pending',
      });
      const map = new Map<string, number>();
      for (const a of apps) {
        const key = String(a.requirementId);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      pendingCounts = [...map.entries()].map(([id, count]) => ({
        _id: id as (typeof reqIds)[0],
        count,
      }));
    } else {
      pendingCounts = (await Application.aggregate([
        { $match: { requirementId: { $in: reqIds }, status: 'pending' } },
        { $group: { _id: '$requirementId', count: { $sum: 1 } } },
      ])) as { _id: (typeof reqIds)[0]; count: number }[];
    }
    const countMap = new Map(pendingCounts.map((p) => [String(p._id), p.count]));
    res.json(
      list.map((r) => ({
        ...r,
        pendingApplicationCount: countMap.get(r.id) || 0,
      })),
    );
  } catch (e) {
    next(e);
  }
});

const CREATABLE_FIELDS = [
  'title', 'status', 'visibility', 'domain', 'skills', 'keywords',
  'background', 'goal', 'timeline', 'outcome', 'desc', 'matchProgress',
  'fulfillmentType',
  'sceneTag', 'projectStage', 'weeklyHours', 'collabMode', 'lookingFor', 'remoteOk',
] as const;

router.post('/', requireAuth, validate({
  title: { required: true, type: 'string', maxLength: 200 },
  desc: { type: 'string', maxLength: 5000 },
}), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const payload: Record<string, unknown> = { author: req.user!._id };
    for (const f of CREATABLE_FIELDS) {
      if (body[f] !== undefined) payload[f] = body[f];
    }
    payload.keywords = payload.keywords ?? payload.skills ?? [];
    payload.status = payload.status ?? 'draft';
    const reqDoc = asOne(await Requirement.create(payload));
    res.status(201).json({ requirement: toRequirementJson(reqDoc, req.user!) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/applications', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const reqDoc = await Requirement.findById(req.params.id);
    if (!reqDoc) {
      res.status(404).json({ error: '需求不存在' });
      return;
    }
    if (String(reqDoc.author) !== String(req.user!._id)) {
      res.status(403).json({ error: '仅发布者可查看申请列表' });
      return;
    }
    const apps = await Application.find({ requirementId: reqDoc._id }).sort({ createdAt: -1 });
    const applicantIds = apps.map((a) => a.applicantId);
    const users = await User.find({ _id: { $in: applicantIds } });
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    res.json({
      applications: apps.map((a) =>
        toApplicationJson(a, (userMap.get(String(a.applicantId)) as import('../models/User.js').IUser | undefined) ?? null, reqDoc),
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.put('/:id/applications/:appId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const reqDoc = await Requirement.findById(req.params.id);
    if (!reqDoc || String(reqDoc.author) !== String(req.user!._id)) {
      res.status(403).json({ error: '无权处理该需求的申请' });
      return;
    }
    const status = req.body?.status as string;
    if (status !== 'accepted' && status !== 'rejected') {
      res.status(400).json({ error: 'status 须为 accepted 或 rejected' });
      return;
    }
    const app = await Application.findOne({
      _id: req.params.appId,
      requirementId: reqDoc._id,
    });
    if (!app) {
      res.status(404).json({ error: '申请不存在' });
      return;
    }
    app.status = status;
    await app.save();

    if (status === 'accepted') {
      const aid = app.applicantId;
      if (!reqDoc.invitees.some((id) => String(id) === String(aid))) {
        reqDoc.invitees.push(aid);
      }
      if (reqDoc.matchProgress < 80) reqDoc.matchProgress = 80;
      await reqDoc.save();
    }

    const applicant = await User.findById(app.applicantId);
    res.json({ application: toApplicationJson(app, applicant, reqDoc) });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const deleted = await Requirement.findOneAndDelete({
      _id: req.params.id,
      author: req.user!._id,
    });
    if (!deleted) {
      res.status(404).json({ error: '需求不存在或无权限' });
      return;
    }
    // M-05: Clean up associated groups and applications
    await Application.deleteMany({ requirementId: deleted._id });
    await Group.deleteMany({ reqId: deleted._id });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const reqDoc = await Requirement.findById(req.params.id);
    if (!reqDoc) {
      res.status(404).json({ error: '需求不存在' });
      return;
    }
    const allowed = await canViewRequirement(reqDoc, req.user?._id);
    if (!allowed) {
      res.status(403).json({ error: '无权查看该需求' });
      return;
    }
    const list = await populateReqAuthor([reqDoc]);
    res.json({ requirement: list[0] });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const reqDoc = await Requirement.findOne({ _id: req.params.id, author: req.user!._id });
    if (!reqDoc) {
      res.status(404).json({ error: '需求不存在或无权限' });
      return;
    }
    const fields = [
      'title', 'status', 'visibility', 'domain', 'skills', 'keywords',
      'background', 'goal', 'timeline', 'outcome', 'desc',
      'fulfillmentType',
      'sceneTag', 'projectStage', 'weeklyHours', 'collabMode', 'lookingFor', 'remoteOk',
    ] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) reqDoc.set(f, req.body[f]);
    }
    await reqDoc.save();
    const list = await populateReqAuthor([reqDoc]);
    res.json({ requirement: list[0] });
  } catch (e) {
    next(e);
  }
});

router.put('/:id/publish', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const reqDoc = await Requirement.findOne({ _id: req.params.id, author: req.user!._id });
    if (!reqDoc) {
      res.status(404).json({ error: '需求不存在或无权限' });
      return;
    }
    const { visibility } = req.body as { visibility?: string };
    if (visibility) reqDoc.visibility = visibility as ReqVisibility;
    reqDoc.status = 'open';
    if (reqDoc.matchProgress < 30) reqDoc.matchProgress = 45;
    await reqDoc.save();
    const list = await populateReqAuthor([reqDoc]);
    res.json({ requirement: list[0] });
  } catch (e) {
    next(e);
  }
});

router.put('/:id/apply', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const reqDoc = await Requirement.findById(req.params.id);
    if (!reqDoc) {
      res.status(404).json({ error: '需求不存在' });
      return;
    }
    if (reqDoc.status !== 'open') {
      res.status(400).json({ error: '该需求未开放申请' });
      return;
    }
    if (String(reqDoc.author) === String(req.user!._id)) {
      res.status(400).json({ error: '不能申请自己的需求' });
      return;
    }
    if (reqDoc.visibility === 'invite_only') {
      res.status(403).json({ error: '该需求为定向邀请，不接受公开申请' });
      return;
    }
    const openForApply =
      reqDoc.visibility === 'public' ||
      reqDoc.visibility === 'match_only' ||
      !reqDoc.visibility;
    if (!openForApply) {
      const allowed = await canViewRequirement(reqDoc, req.user!._id);
      if (!allowed) {
        res.status(403).json({ error: '该需求不接受申请' });
        return;
      }
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const app = await Application.findOneAndUpdate(
      { requirementId: reqDoc._id, applicantId: req.user!._id },
      { $set: { message, status: 'pending' } },
      { upsert: true, new: true },
    );
    if (!app) {
      res.status(500).json({ error: '申请记录写入失败' });
      return;
    }

    res.json({
      success: true,
      applicationId: String(app._id),
      message: `已向「${reqDoc.title}」提交参与申请`,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
