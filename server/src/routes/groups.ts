import { Router } from 'express';
import { asOne } from '../db/helpers.js';
import { Group, type IGroup } from '../models/Group.js';
import type { Types } from 'mongoose';
import { Requirement } from '../models/Requirement.js';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';
import { toGroupJson, toUserJson, formatChatTime, isUserOnline } from '../utils/serialize.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { saveFileAsset } from '../services/fileStorage.js';
import { validate } from '../middleware/validate.js';

/** 群组消息最大条数，超出则保留最新 N 条 */
const MAX_MESSAGES = 500;

const router = Router();

async function loadGroupWithMembers(groupId: string, userId: string) {
  const group = await Group.findById(groupId);
  if (!group || !group.members.some((m: Types.ObjectId) => String(m) === String(userId))) {
    return null;
  }
  const members = await User.find({ _id: { $in: group.members } });
  return toGroupJson(group, members);
}

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const groups = await Group.find({ members: req.user!._id });
    // M-01: Batch-fetch all members to avoid N+1 queries
    const allMemberIds = [...new Set(groups.flatMap((g: IGroup) => g.members.map((m: Types.ObjectId) => String(m))))];
    const users = await User.find({ _id: { $in: allMemberIds } });
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const out = groups.map((g: IGroup) => {
      const members = g.members.map((m: Types.ObjectId) => userMap.get(String(m))).filter(Boolean) as import('../models/User.js').IUser[];
      return toGroupJson(g, members);
    });
    res.json(out);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const json = await loadGroupWithMembers(req.params.id, String(req.user!._id));
    if (!json) {
      res.status(404).json({ error: '群组不存在或无权限' });
      return;
    }
    res.json({ group: json });
  } catch (e) {
    next(e);
  }
});

/** 手动创建群组（不经过匹配邀请） */
router.post('/create', requireAuth, validate({
  name: { required: true, type: 'string' },
}), async (req: AuthRequest, res, next) => {
  try {
    const { name, reqId, memberIds } = req.body as {
      name?: string;
      reqId?: string;
      memberIds?: string[];
    };
    if (!name?.trim()) {
      res.status(400).json({ error: '需要群组名称' });
      return;
    }

    const members = new Set<string>([String(req.user!._id)]);
    for (const id of memberIds || []) {
      if (id) members.add(String(id));
    }

    const memberDocs = await User.find({ _id: { $in: [...members] } });
    if (memberDocs.length < 1) {
      res.status(400).json({ error: '成员无效' });
      return;
    }

    let requirementId = reqId;
    if (reqId) {
      const reqDoc = await Requirement.findById(reqId);
      if (!reqDoc) {
        res.status(404).json({ error: '关联需求不存在' });
        return;
      }
      requirementId = String(reqDoc._id);
    } else {
      const fallbackRows = await Requirement.find({ author: req.user!._id })
        .sort({ updatedAt: -1 })
        .limit(1);
      let fallback = fallbackRows[0];
      if (!fallback) {
        fallback = asOne(
          await Requirement.create({
          title: `${name.trim()} 协作`,
          author: req.user!._id,
          status: 'draft',
          visibility: 'match_only',
          domain: req.user!.domain || 'tech',
          desc: '群组关联需求',
          }),
        );
      }
      requirementId = String(fallback._id);
    }

    const group = asOne(
      await Group.create({
      name: name.trim(),
      emoji: '🤝',
      desc: '协作群组',
      reqId: requirementId,
      members: [...members],
      messages: [
        {
          user: req.user!._id,
          type: 'text',
          content: `${req.user!.name} 创建了群组`,
          time: new Date(),
        },
      ],
      }),
    );

    res.status(201).json({ group: toGroupJson(group, memberDocs) });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, validate({
  reqId: { required: true, type: 'string' },
  invitedUserId: { required: true, type: 'string' },
}), async (req: AuthRequest, res, next) => {
  try {
    const { reqId, invitedUserId, inviteMessage } = req.body as {
      reqId?: string;
      invitedUserId?: string;
      inviteMessage?: string;
    };
    if (!reqId || !invitedUserId) {
      res.status(400).json({ error: '需要 reqId 和 invitedUserId' });
      return;
    }

    const requirement = await Requirement.findById(reqId);
    if (!requirement) {
      res.status(404).json({ error: '需求不存在' });
      return;
    }
    if (String(requirement.author) !== String(req.user!._id)) {
      res.status(403).json({ error: '仅需求发布者可邀请协作者' });
      return;
    }

    const invited = await User.findById(invitedUserId);
    if (!invited) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    let group = await Group.findOne({
      reqId,
      members: { $all: [req.user!._id, invited._id] },
    });

    const inviteeIds = requirement.invitees || [];
    if (!inviteeIds.some((id) => String(id) === String(invited._id))) {
      requirement.invitees.push(invited._id);
      await requirement.save();
    }

    await Application.findOneAndUpdate(
      { requirementId: requirement._id, applicantId: invited._id },
      { $set: { status: 'accepted', message: inviteMessage?.trim() || '' } },
      { upsert: true },
    );

    const firstMsg =
      inviteMessage?.trim() ||
      `邀请 ${invited.name} 加入协作，一起推进「${requirement.title}」`;

    if (!group) {
      group = asOne(
        await Group.create({
        name: `${requirement.title.slice(0, 12)}团队`,
        emoji: '🚀',
        desc: requirement.desc || requirement.title,
        reqId: requirement._id,
        members: [req.user!._id, invited._id],
        messages: [
          {
            user: req.user!._id,
            type: 'text',
            content: firstMsg,
            time: new Date(),
          },
        ],
        }),
      );
    }

    const members = await User.find({ _id: { $in: group.members } });
    res.status(201).json({ group: toGroupJson(group, members) });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/messages', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { content, type, fileName, fileSize, fileData, fileId } = req.body as {
      content?: string;
      type?: 'text' | 'file' | 'system';
      fileName?: string;
      fileSize?: string;
      fileData?: string;
      fileId?: string;
    };

    const group = await Group.findById(req.params.id);
    if (!group || !group.members.some((m) => String(m) === String(req.user!._id))) {
      res.status(404).json({ error: '群组不存在或无权限' });
      return;
    }

    let msgContent = content || '';
    if (type === 'file' && fileId && fileName) {
      const { canAccessFile } = await import('../services/fileStorage.js');
      const existing = await canAccessFile(fileId, req.user!._id);
      if (!existing) {
        res.status(400).json({ error: '文件不存在或无权使用' });
        return;
      }
      msgContent = `/api/files/${fileId}`;
    } else if (type === 'file' && fileData && fileName) {
      const saved = await saveFileAsset({
        ownerId: req.user!._id,
        fileName,
        fileData,
        groupId: group._id,
      });
      msgContent = saved.url;
    }

    const msg = {
      user: req.user!._id,
      type: (type || 'text') as 'text' | 'file',
      content: msgContent,
      fileName,
      fileSize,
      time: new Date(),
    };
    group.messages.push(msg);
    if (group.messages.length > MAX_MESSAGES) {
      group.messages = group.messages.slice(-MAX_MESSAGES);
    }
    await group.save();

    const members = await User.find({ _id: { $in: group.members } });
    const last = group.messages[group.messages.length - 1];
    const fileUrl = msg.type === 'file' && msgContent.startsWith('/api/files/') ? msgContent : undefined;

    res.status(201).json({
      message: {
        id: String((last as { _id?: { toString: () => string } })._id ?? Date.now()),
        user: toUserJson(req.user!),
        type: msg.type,
        content: content || msgContent,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        fileUrl,
        time: formatChatTime(msg.time),
        self: true,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/meeting', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.members.some((m) => String(m) === String(req.user!._id))) {
      res.status(404).json({ error: '群组不存在或无权限' });
      return;
    }
    const slug = `${String(group._id).slice(-8)}-${Date.now().toString(36)}`;
    const meetingUrl = `https://meet.jit.si/collabmatch-${slug}`;
    group.messages.push({
      user: req.user!._id,
      type: 'text',
      content: `📹 视频会议已创建：${meetingUrl}`,
      time: new Date(),
    });
    if (group.messages.length > MAX_MESSAGES) {
      group.messages = group.messages.slice(-MAX_MESSAGES);
    }
    await group.save();
    const members = await User.find({ _id: { $in: group.members } });
    res.json({ meetingUrl, group: toGroupJson(group, members) });
  } catch (e) {
    next(e);
  }
});

// M-04: Leave a group
router.post('/:id/leave', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.members.some((m: Types.ObjectId) => String(m) === String(req.user!._id))) {
      res.status(404).json({ error: '群组不存在或无权限' });
      return;
    }
    group.members = group.members.filter((m: Types.ObjectId) => String(m) !== String(req.user!._id));
    group.messages.push({
      user: req.user!._id,
      type: 'system',
      content: `${req.user!.name} 退出了群组`,
      time: new Date(),
    });
    if (group.messages.length > MAX_MESSAGES) {
      group.messages = group.messages.slice(-MAX_MESSAGES);
    }
    await group.save();
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// M-04: Remove a member from a group
router.post('/:id/remove/:userId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.members.some((m: Types.ObjectId) => String(m) === String(req.user!._id))) {
      res.status(404).json({ error: '群组不存在或无权限' });
      return;
    }
    const targetId = req.params.userId;
    if (!group.members.some((m: Types.ObjectId) => String(m) === String(targetId))) {
      res.status(404).json({ error: '目标用户不在群组中' });
      return;
    }
    if (String(targetId) === String(req.user!._id)) {
      res.status(400).json({ error: '不能移除自己，请使用退出群组功能' });
      return;
    }
    const removedUser = await User.findById(targetId);
    group.members = group.members.filter((m: Types.ObjectId) => String(m) !== String(targetId));
    group.messages.push({
      user: req.user!._id,
      type: 'system',
      content: `${req.user!.name} 将 ${removedUser?.name || '用户'} 移出了群组`,
      time: new Date(),
    });
    if (group.messages.length > MAX_MESSAGES) {
      group.messages = group.messages.slice(-MAX_MESSAGES);
    }
    await group.save();
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
