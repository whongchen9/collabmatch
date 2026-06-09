import { Router } from 'express';
import { asOne } from '../db/helpers.js';
import { Conversation } from '../models/Conversation.js';
import { FileAsset } from '../models/FileAsset.js';
import { Requirement } from '../models/Requirement.js';
import { toConversationJson, toRequirementJson, populateReqAuthor } from '../utils/serialize.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDomain } from '../config/domains.js';
import { formatChatTime } from '../utils/serialize.js';
import { saveFileAsset } from '../services/fileStorage.js';
import { validate } from '../middleware/validate.js';

/** 单条对话最大消息数，超出则保留最新 N 条 */
const MAX_MESSAGES = 500;

const router = Router();

export async function enrichConversation(conv: import('../models/Conversation.js').IConversation, cardMap?: Map<string, unknown>) {
  const reqIds = conv.messages.filter((m) => m.reqCard).map((m) => m.reqCard!);
  if (!cardMap) {
    const rawReqs = reqIds.length ? await Requirement.find({ _id: { $in: reqIds } }) : [];
    const reqs = await populateReqAuthor(rawReqs);
    cardMap = new Map<string, unknown>();
    for (const r of reqs) {
      cardMap.set(r.id, r);
    }
  }
  return toConversationJson(conv, cardMap);
}

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const list = await Conversation.find({ userId: req.user!._id }).sort({ updatedAt: -1 });
    // ARCH-01: 批量预加载所有 reqCard ID，避免 N+1 查询
    const allReqIds = [...new Set(list.flatMap((c) =>
      c.messages.filter((m) => m.reqCard).map((m) => m.reqCard!)
    ))];
    const rawReqs = allReqIds.length ? await Requirement.find({ _id: { $in: allReqIds } }) : [];
    const reqs = await populateReqAuthor(rawReqs);
    const sharedCardMap = new Map<string, unknown>();
    for (const r of reqs) sharedCardMap.set(r.id, r);
    const out = list.map((c) => toConversationJson(c, sharedCardMap));
    res.json(out);
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, validate({
  domain: { type: 'string' },
}), async (req: AuthRequest, res, next) => {
  try {
    const domain = (req.body.domain as string) || req.user!.domain || 'tech';
    const d = getDomain(domain);
    const conv = asOne(await Conversation.create({
      userId: req.user!._id,
      title: '新需求对话',
      domain,
      messages: [
        {
          role: 'ai',
          content: `嗨！欢迎来到「${d.name}」频道\n\n告诉我你想做什么项目，我来帮你整理需求、匹配协作者。\n\n直接说就行，不用想太多。`,
          time: new Date(),
        },
      ],
    }));
    res.status(201).json({ conversation: await enrichConversation(conv) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!conv) {
      res.status(404).json({ error: '对话不存在' });
      return;
    }
    res.json({ conversation: await enrichConversation(conv) });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const conv = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!conv) {
      res.status(404).json({ error: '对话不存在' });
      return;
    }
    // M-05: Clean up associated file assets
    await FileAsset.deleteMany({ conversationId: conv._id });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/attachments', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { fileName, fileData, fileId } = req.body as {
      fileName?: string;
      fileData?: string;
      fileId?: string;
    };
    if (!fileName) {
      res.status(400).json({ error: '需要 fileName' });
      return;
    }
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!conv) {
      res.status(404).json({ error: '对话不存在' });
      return;
    }
    let saved: { id: string; url: string; publicUrl?: string; mimeType: string; size: number };
    if (fileId) {
      const { canAccessFile } = await import('../services/fileStorage.js');
      const existing = await canAccessFile(fileId, req.user!._id);
      if (!existing) {
        res.status(400).json({ error: '文件不存在或无权使用' });
        return;
      }
      saved = {
        id: String(existing._id),
        url: `/api/files/${existing._id}`,
        publicUrl: existing.publicUrl,
        mimeType: existing.mimeType,
        size: existing.size,
      };
    } else if (fileData) {
      saved = await saveFileAsset({
        ownerId: req.user!._id,
        fileName,
        fileData,
        conversationId: conv._id,
      });
    } else {
      res.status(400).json({ error: '需要 fileData 或 fileId' });
      return;
    }
    conv.messages.push({
      role: 'user',
      content: `已发送文件：${fileName}\n${saved.url}`,
      time: new Date(),
    });
    if (conv.messages.length > MAX_MESSAGES) {
      conv.messages = conv.messages.slice(-MAX_MESSAGES);
    }
    await conv.save();
    res.status(201).json({
      conversation: await enrichConversation(conv),
      file: saved,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/forward', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { messageIndex, targetConversationId } = req.body as {
      messageIndex?: number;
      targetConversationId?: string;
    };
    if (messageIndex === undefined || messageIndex < 0) {
      res.status(400).json({ error: '需要 messageIndex' });
      return;
    }

    const source = await Conversation.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!source) {
      res.status(404).json({ error: '源对话不存在' });
      return;
    }
    const msg = source.messages[messageIndex];
    if (!msg) {
      res.status(404).json({ error: '消息不存在' });
      return;
    }

    let target = targetConversationId
      ? await Conversation.findOne({ _id: targetConversationId, userId: req.user!._id })
      : source;
    if (!target) {
      res.status(404).json({ error: '目标对话不存在' });
      return;
    }

    const forwarded = `转发：\n${msg.content}`;
    target.messages.push({ role: 'user', content: forwarded, time: new Date() });
    if (target.messages.length > MAX_MESSAGES) {
      target.messages = target.messages.slice(-MAX_MESSAGES);
    }
    await target.save();

    res.json({
      conversation: await enrichConversation(target),
      forwarded: true,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
