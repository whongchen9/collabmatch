import { Router } from 'express';
import { asOne } from '../db/helpers.js';
import { usePostgres } from '../db/driver.js';
import { HikeEvent, type EventStatus } from '../models/HikeEvent.js';
import { JoinRequest } from '../models/JoinRequest.js';
import { CheckIn } from '../models/CheckIn.js';
import { Group } from '../models/Group.js';
import { User } from '../models/User.js';
import { requireAuth, optionalAuth, type AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { toUserJson } from '../utils/serialize.js';
import type { DifficultyKey, EventTypeKey } from '../config/hikeConfig.js';

const router = Router();

// ── 序列化 ──────────────────────────────────────────────

function toHikeEventJson(
  event: import('../models/HikeEvent.js').IHikeEvent & { author?: import('../models/User.js').IUser | import('mongoose').Types.ObjectId },
  authorDoc?: import('../models/User.js').IUser | null,
) {
  const author =
    authorDoc ||
    (event.author && typeof event.author === 'object' && 'name' in event.author
      ? (event.author as import('../models/User.js').IUser)
      : null);
  return {
    id: String(event._id),
    title: event.title,
    author: author ? toUserJson(author) : { id: String(event.author) },
    time: event.createdAt ? new Date(event.createdAt).toLocaleString('zh-CN') : '',
    status: event.status,
    visibility: event.visibility,
    difficulty: event.difficulty,
    eventType: event.eventType,
    startDate: event.startDate,
    meetupPoint: event.meetupPoint,
    endPoint: event.endPoint,
    distance: event.distance,
    elevation: event.elevation,
    estimatedHours: event.estimatedHours,
    maxMembers: event.maxMembers,
    feeType: event.feeType,
    feeAmount: event.feeAmount,
    gearRequired: event.gearRequired,
    description: event.description,
    coverImage: event.coverImage,
    gpxFileId: event.gpxFileId ? String(event.gpxFileId) : null,
    tags: event.tags,
    invitees: event.invitees.map(String),
    matchProgress: event.matchProgress,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

async function populateEventAuthor(
  events: import('../models/HikeEvent.js').IHikeEvent[],
): Promise<ReturnType<typeof toHikeEventJson>[]> {
  const authorIds = [...new Set(events.map((e) => String(e.author)))];
  const authors = await User.find({ _id: { $in: authorIds } });
  const map = new Map(authors.map((a) => [String(a._id), a]));
  return events.map((e) =>
    toHikeEventJson(e, (map.get(String(e.author)) as import('../models/User.js').IUser | undefined) ?? null),
  );
}

// ── 可见性检查 ──────────────────────────────────────────

async function canViewEvent(
  event: import('../models/HikeEvent.js').IHikeEvent,
  userId?: import('mongoose').Types.ObjectId,
): Promise<boolean> {
  if (event.status !== 'draft' && event.visibility === 'public') return true;
  if (!userId) return false;
  if (String(event.author) === String(userId)) return true;
  const isInvitee = (event.invitees || []).some((id) => String(id) === String(userId));
  if (isInvitee) return true;
  const jr = await JoinRequest.findOne({ eventId: event._id, userId });
  if (jr?.status === 'accepted') return true;
  if (event.visibility === 'invite_only' && jr) return true;
  if (event.visibility === 'match_only' && jr) return true;
  return false;
}

// ── 1. GET / - 列出公开徒步活动（支持筛选） ──────────────

router.get('/', async (req, res, next) => {
  try {
    const { difficulty, eventType, city, dateFrom, dateTo, page, pageSize } = req.query;
    const filter: Record<string, unknown> = { status: { $in: ['open', 'full', 'ongoing'] }, visibility: 'public' };
    if (difficulty) filter.difficulty = difficulty;
    if (eventType) filter.eventType = eventType;
    if (city) filter.meetupPoint = { $regex: String(city), $options: 'i' };
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.$gte = new Date(String(dateFrom));
      if (dateTo) dateFilter.$lte = new Date(String(dateTo));
      filter.startDate = dateFilter;
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const pageSizeNum = Math.min(50, Math.max(1, parseInt(String(pageSize), 10) || 20));
    const total = await HikeEvent.countDocuments(filter);
    const events = await HikeEvent.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSizeNum)
      .limit(pageSizeNum);
    const list = await populateEventAuthor(events);
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

// ── 2. GET /mine - 我发布的活动 ─────────────────────────

router.get('/mine', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const events = await HikeEvent.find({ author: req.user!._id }).sort({ createdAt: -1 });
    const list = await populateEventAuthor(events);
    const eventIds = events.map((e) => e._id);
    let pendingCounts: { _id: (typeof eventIds)[0]; count: number }[] = [];
    if (usePostgres()) {
      const jrs = await JoinRequest.find({
        eventId: { $in: eventIds.map(String) },
        status: 'pending',
      });
      const map = new Map<string, number>();
      for (const jr of jrs) {
        const key = String(jr.eventId);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      pendingCounts = [...map.entries()].map(([id, count]) => ({
        _id: id as (typeof eventIds)[0],
        count,
      }));
    } else {
      pendingCounts = (await JoinRequest.aggregate([
        { $match: { eventId: { $in: eventIds }, status: 'pending' } },
        { $group: { _id: '$eventId', count: { $sum: 1 } } },
      ])) as { _id: (typeof eventIds)[0]; count: number }[];
    }
    const countMap = new Map(pendingCounts.map((p) => [String(p._id), p.count]));
    res.json(
      list.map((e) => ({
        ...e,
        pendingJoinCount: countMap.get(e.id) || 0,
      })),
    );
  } catch (e) {
    next(e);
  }
});

// ── 3. POST / - 创建徒步活动 ────────────────────────────

const CREATABLE_FIELDS = [
  'title', 'description', 'difficulty', 'eventType', 'startDate',
  'meetupPoint', 'endPoint', 'distance', 'elevation', 'estimatedHours',
  'maxMembers', 'feeType', 'feeAmount', 'gearRequired', 'tags', 'visibility',
] as const;

router.post('/', requireAuth, validate({
  title: { required: true, type: 'string', maxLength: 200 },
}), async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const payload: Record<string, unknown> = { author: req.user!._id };
    for (const f of CREATABLE_FIELDS) {
      if (body[f] !== undefined) payload[f] = body[f];
    }
    payload.status = payload.status ?? 'draft';
    payload.tags = payload.tags ?? [];
    payload.invitees = payload.invitees ?? [];

    if (!payload.title || typeof payload.title !== 'string' || !(payload.title as string).trim()) {
      res.status(400).json({ error: 'title 为必填字段' });
      return;
    }
    const VALID_DIFFICULTY: DifficultyKey[] = ['casual', 'advanced', 'challenge'];
    if (payload.difficulty && !VALID_DIFFICULTY.includes(payload.difficulty as DifficultyKey)) {
      res.status(400).json({ error: 'difficulty 无效' });
      return;
    }
    const VALID_EVENT_TYPE: EventTypeKey[] = ['dayhike', 'overnight', 'longtrail'];
    if (payload.eventType && !VALID_EVENT_TYPE.includes(payload.eventType as EventTypeKey)) {
      res.status(400).json({ error: 'eventType 无效' });
      return;
    }
    const VALID_VISIBILITY = ['public', 'match_only', 'invite_only'];
    if (payload.visibility && !VALID_VISIBILITY.includes(payload.visibility as string)) {
      res.status(400).json({ error: 'visibility 无效' });
      return;
    }

    const eventDoc = asOne(await HikeEvent.create(payload));
    if (!eventDoc) {
      res.status(500).json({ error: '活动创建失败' });
      return;
    }
    res.status(201).json({ event: toHikeEventJson(eventDoc, req.user!) });
  } catch (e) {
    next(e);
  }
});

// ── 4. GET /:id - 获取活动详情（可选鉴权，检查可见性） ──

router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const eventDoc = await HikeEvent.findById(req.params.id);
    if (!eventDoc) {
      res.status(404).json({ error: '活动不存在' });
      return;
    }
    const allowed = await canViewEvent(eventDoc, req.user?._id);
    if (!allowed) {
      res.status(403).json({ error: '无权查看该活动' });
      return;
    }
    const list = await populateEventAuthor([eventDoc]);
    res.json({ event: list[0] });
  } catch (e) {
    next(e);
  }
});

// ── 5. PUT /:id - 更新活动（仅作者） ────────────────────

router.put('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const eventDoc = await HikeEvent.findOne({ _id: req.params.id, author: req.user!._id });
    if (!eventDoc) {
      res.status(404).json({ error: '活动不存在或无权限' });
      return;
    }
    const fields = [
      'title', 'description', 'difficulty', 'eventType', 'startDate',
      'meetupPoint', 'endPoint', 'distance', 'elevation', 'estimatedHours',
      'maxMembers', 'feeType', 'feeAmount', 'gearRequired', 'tags', 'visibility', 'status',
    ] as const;
    for (const f of fields) {
      if (req.body[f] !== undefined) eventDoc.set(f, req.body[f]);
    }
    await eventDoc.save();
    const list = await populateEventAuthor([eventDoc]);
    res.json({ event: list[0] });
  } catch (e) {
    next(e);
  }
});

// ── 6. DELETE /:id - 删除活动（仅作者，级联删除 JoinRequest 和 Group） ──

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const deleted = await HikeEvent.findOneAndDelete({
      _id: req.params.id,
      author: req.user!._id,
    });
    if (!deleted) {
      res.status(404).json({ error: '活动不存在或无权限' });
      return;
    }
    await JoinRequest.deleteMany({ eventId: deleted._id });
    await Group.deleteMany({ eventId: deleted._id });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// ── 7. PUT /:id/publish - 发布活动（仅作者，draft→open） ──

router.put('/:id/publish', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const eventDoc = await HikeEvent.findOne({ _id: req.params.id, author: req.user!._id });
    if (!eventDoc) {
      res.status(404).json({ error: '活动不存在或无权限' });
      return;
    }
    if (eventDoc.status !== 'draft') {
      res.status(400).json({ error: '仅草稿状态可发布' });
      return;
    }
    const { visibility } = req.body as { visibility?: string };
    if (visibility) eventDoc.visibility = visibility as import('../models/HikeEvent.js').IHikeEvent['visibility'];
    eventDoc.status = 'open';
    if (eventDoc.matchProgress < 15) {
      eventDoc.matchProgress = 15;
    }
    await eventDoc.save();
    const list = await populateEventAuthor([eventDoc]);
    res.json({ event: list[0] });
  } catch (e) {
    next(e);
  }
});

// ── 8. PUT /:id/join - 报名参加活动 ─────────────────────

router.put('/:id/join', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const eventDoc = await HikeEvent.findById(req.params.id);
    if (!eventDoc) {
      res.status(404).json({ error: '活动不存在' });
      return;
    }
    if (eventDoc.status !== 'open') {
      res.status(400).json({ error: '该活动未开放报名' });
      return;
    }
    if (String(eventDoc.author) === String(req.user!._id)) {
      res.status(400).json({ error: '不能报名自己发布的活动' });
      return;
    }
    // 检查是否已有 pending/accepted 的报名
    const existing = await JoinRequest.findOne({
      eventId: eventDoc._id,
      userId: req.user!._id,
      status: { $in: ['pending', 'accepted'] },
    });
    if (existing) {
      res.status(400).json({ error: '您已提交过报名申请' });
      return;
    }
    // 检查是否满员
    const acceptedCount = await JoinRequest.countDocuments({
      eventId: eventDoc._id,
      status: 'accepted',
    });
    if (acceptedCount >= eventDoc.maxMembers) {
      res.status(400).json({ error: '活动已满员' });
      return;
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const jr = asOne(
      await JoinRequest.create({
        eventId: eventDoc._id,
        userId: req.user!._id,
        message,
        status: 'pending',
      }),
    );
    if (!jr) {
      res.status(500).json({ error: '报名记录写入失败' });
      return;
    }
    res.json({
      success: true,
      joinRequestId: String(jr._id),
      message: `已向「${eventDoc.title}」提交报名申请`,
    });
  } catch (e) {
    next(e);
  }
});

// ── 9. GET /:id/requests - 列出活动报名请求（仅作者） ────

router.get('/:id/requests', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const eventDoc = await HikeEvent.findById(req.params.id);
    if (!eventDoc) {
      res.status(404).json({ error: '活动不存在' });
      return;
    }
    if (String(eventDoc.author) !== String(req.user!._id)) {
      res.status(403).json({ error: '仅发布者可查看报名列表' });
      return;
    }
    const requests = await JoinRequest.find({ eventId: eventDoc._id }).sort({ createdAt: -1 });
    const userIds = requests.map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    res.json({
      requests: requests.map((r) => ({
        id: String(r._id),
        eventId: String(r.eventId),
        user: userMap.has(String(r.userId))
          ? toUserJson(userMap.get(String(r.userId))! as any)
          : { id: String(r.userId) },
        message: r.message,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// ── 10. PUT /:id/requests/:reqId - 审核报名请求（仅作者，accept/reject） ──

router.put('/:id/requests/:reqId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const eventDoc = await HikeEvent.findById(req.params.id);
    if (!eventDoc || String(eventDoc.author) !== String(req.user!._id)) {
      res.status(403).json({ error: '无权处理该活动的报名' });
      return;
    }
    const status = req.body?.status as string;
    if (status !== 'accepted' && status !== 'rejected') {
      res.status(400).json({ error: 'status 须为 accepted 或 rejected' });
      return;
    }
    const jr = await JoinRequest.findOne({
      _id: req.params.reqId,
      eventId: eventDoc._id,
    });
    if (!jr) {
      res.status(404).json({ error: '报名请求不存在' });
      return;
    }
    jr.status = status;
    await jr.save();

    if (status === 'accepted') {
      const uid = jr.userId;
      // 加入 invitees
      if (!eventDoc.invitees.some((id) => String(id) === String(uid))) {
        eventDoc.invitees.push(uid);
      }
      // 更新 matchProgress
      if (eventDoc.matchProgress < 80) {
        eventDoc.matchProgress = Math.min(20 + eventDoc.invitees.length * 20, 90);
      }
      // 检查是否满员
      const acceptedCount = await JoinRequest.countDocuments({
        eventId: eventDoc._id,
        status: 'accepted',
      });
      if (acceptedCount >= eventDoc.maxMembers) {
        eventDoc.status = 'full';
      }
      await eventDoc.save();

      // 自动创建或加入 Group
      let group = await Group.findOne({ eventId: eventDoc._id });
      if (!group) {
        group = asOne(
          await Group.create({
            name: eventDoc.title,
            emoji: '🥾',
            desc: eventDoc.description,
            eventId: eventDoc._id,
            meetupLocation: eventDoc.meetupPoint,
            status: 'forming',
            members: [eventDoc.author, uid],
          }),
        );
      } else {
        if (!group.members.some((m) => String(m) === String(uid))) {
          group.members.push(uid);
          await group.save();
        }
      }
    }

    const applicant = await User.findById(jr.userId);
    res.json({
      request: {
        id: String(jr._id),
        eventId: String(jr.eventId),
        user: applicant ? toUserJson(applicant) : { id: String(jr.userId) },
        message: jr.message,
        status: jr.status,
        createdAt: jr.createdAt,
        updatedAt: jr.updatedAt,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ── 11. POST /:id/checkin - 签到（start/finish/sos） ────

router.post('/:id/checkin', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const eventDoc = await HikeEvent.findById(req.params.id);
    if (!eventDoc) {
      res.status(404).json({ error: '活动不存在' });
      return;
    }
    // 仅作者或已接受邀请的成员可签到
    const isAuthor = String(eventDoc.author) === String(req.user!._id);
    const isMember = eventDoc.invitees.some((id) => String(id) === String(req.user!._id));
    if (!isAuthor && !isMember) {
      res.status(403).json({ error: '仅活动成员可签到' });
      return;
    }

    const type = req.body?.type as string;
    if (!type || !['start', 'finish', 'sos'].includes(type)) {
      res.status(400).json({ error: 'type 须为 start、finish 或 sos' });
      return;
    }
    const location = req.body?.location as { lat?: number; lng?: number } | undefined;
    const address = typeof req.body?.address === 'string' ? req.body.address : '';

    const checkin = asOne(
      await CheckIn.create({
        eventId: eventDoc._id,
        userId: req.user!._id,
        type,
        location: { lat: location?.lat ?? 0, lng: location?.lng ?? 0 },
        address,
      }),
    );
    if (!checkin) {
      res.status(500).json({ error: '签到记录写入失败' });
      return;
    }

    // 如果是 start 签到，更新活动状态为 ongoing
    if (type === 'start' && eventDoc.status === 'open') {
      eventDoc.status = 'ongoing';
      await eventDoc.save();
    }
    // 如果是 finish 签到，更新活动状态为 ended
    if (type === 'finish' && eventDoc.status === 'ongoing') {
      eventDoc.status = 'ended';
      await eventDoc.save();
    }

    res.status(201).json({
      checkin: {
        id: String(checkin._id),
        eventId: String(checkin.eventId),
        userId: String(checkin.userId),
        type: checkin.type,
        location: checkin.location,
        address: checkin.address,
        time: checkin.time,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ── 12. GET /:id/checkins - 获取活动签到记录（作者或成员） ──

router.get('/:id/checkins', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const eventDoc = await HikeEvent.findById(req.params.id);
    if (!eventDoc) {
      res.status(404).json({ error: '活动不存在' });
      return;
    }
    const isAuthor = String(eventDoc.author) === String(req.user!._id);
    const isMember = eventDoc.invitees.some((id) => String(id) === String(req.user!._id));
    if (!isAuthor && !isMember) {
      res.status(403).json({ error: '仅活动成员可查看签到记录' });
      return;
    }
    const checkins = await CheckIn.find({ eventId: eventDoc._id }).sort({ time: 1 });
    const userIds = [...new Set(checkins.map((c) => String(c.userId)))];
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    res.json({
      checkins: checkins.map((c) => ({
        id: String(c._id),
        eventId: String(c.eventId),
        user: userMap.has(String(c.userId))
          ? toUserJson(userMap.get(String(c.userId))! as any)
          : { id: String(c.userId) },
        type: c.type,
        location: c.location,
        address: c.address,
        time: c.time,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// ── 13. POST /:id/sos - SOS 紧急求助 ────────────────────

router.post('/:id/sos', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const eventDoc = await HikeEvent.findById(req.params.id);
    if (!eventDoc) {
      res.status(404).json({ error: '活动不存在' });
      return;
    }
    const isAuthor = String(eventDoc.author) === String(req.user!._id);
    const isMember = eventDoc.invitees.some((id) => String(id) === String(req.user!._id));
    if (!isAuthor && !isMember) {
      res.status(403).json({ error: '仅活动成员可发起 SOS' });
      return;
    }

    const location = req.body?.location as { lat?: number; lng?: number } | undefined;
    const address = typeof req.body?.address === 'string' ? req.body.address : '';
    const message = typeof req.body?.message === 'string' ? req.body.message : '';

    const checkin = asOne(
      await CheckIn.create({
        eventId: eventDoc._id,
        userId: req.user!._id,
        type: 'sos',
        location: { lat: location?.lat ?? 0, lng: location?.lng ?? 0 },
        address,
      }),
    );
    if (!checkin) {
      res.status(500).json({ error: 'SOS 记录写入失败' });
      return;
    }

    res.status(201).json({
      sos: {
        id: String(checkin._id),
        eventId: String(checkin.eventId),
        userId: String(checkin.userId),
        type: 'sos',
        location: checkin.location,
        address: checkin.address,
        time: checkin.time,
        message,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
