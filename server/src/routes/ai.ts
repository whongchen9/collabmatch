import { Router, type Response } from 'express';
import { Types } from '../db/objectId.js';
import { Conversation, type IConversation } from '../models/Conversation.js';
import { hasLlm, chatWithAi } from '../services/llm.js';
import { mockAiChat } from '../services/aiMock.js';
import { processLlmChatResult } from '../services/reqFromLlm.js';
import { executeSkillForUser } from '../services/skillRunner.js';
import type { DomainKey } from '../config/domains.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { enrichConversation } from './conversations.js';
import { formatChatTime } from '../utils/serialize.js';
import { resolveChatFileAttachments } from '../services/fileStorage.js';

const router = Router();

function sseWrite(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function buildUserMessageText(text: string, attachmentNames: string[]): string {
  const trimmed = text.trim();
  if (trimmed) return trimmed;
  if (attachmentNames.length) {
    return attachmentNames.length === 1
      ? `${attachmentNames[0]}`
      : `发送了 ${attachmentNames.length} 个文件：${attachmentNames.join('、')}`;
  }
  return '';
}

router.post('/chat', requireAuth, async (req: AuthRequest, res, next) => {
  const convId = (req.body as { conversationId?: string }).conversationId;
  let conv: IConversation | null = null;

  try {
    const { conversationId, message, fileIds } = req.body as {
      conversationId?: string;
      message?: string;
      fileIds?: string[];
    };
    const ids = Array.isArray(fileIds) ? fileIds.filter((id) => typeof id === 'string' && id.trim()) : [];
    const rawText = typeof message === 'string' ? message : '';

    if (!conversationId || (!rawText.trim() && !ids.length)) {
      res.status(400).json({ error: '需要 conversationId，以及 message 或 fileIds' });
      return;
    }

    conv = await Conversation.findOne({
      _id: conversationId,
      userId: req.user!._id,
    });
    if (!conv) {
      res.status(404).json({ error: '对话不存在' });
      return;
    }

    const { attachments, imageUrls } = await resolveChatFileAttachments(ids, req.user!._id);
    if (ids.length && !attachments.length) {
      res.status(400).json({ error: '附件无效或无权访问' });
      return;
    }

    const domainKey = (conv.domain as DomainKey) || 'tech';
    const userMessage = buildUserMessageText(rawText, attachments.map((a) => a.fileName));
    conv.messages.push({
      role: 'user',
      content: userMessage,
      time: new Date(),
      ...(attachments.length ? { attachments } : {}),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    let fullContent = '';
    let reqCardId: string | undefined;
    let renameTitle: string | undefined;

    if (!hasLlm()) {
      const mock = await mockAiChat(userMessage, domainKey, req.user!, { hasImages: imageUrls.length > 0 });
      fullContent = mock.content;
      if (mock.reqCard) {
        reqCardId = String(mock.reqCard._id);
        renameTitle = mock.renameTitle;
      }
      const chunkSize = 8;
      for (let i = 0; i < fullContent.length; i += chunkSize) {
        sseWrite(res, { chunk: fullContent.slice(i, i + chunkSize), conversationId });
        await new Promise((r) => setTimeout(r, 25));
      }
    } else {
      const history = conv.messages.slice(0, -1);
      const result = await chatWithAi(userMessage, history, domainKey, req.user!, imageUrls);
      if (result.stream) {
        for await (const chunk of result.stream) {
          fullContent += chunk;
          sseWrite(res, { chunk, conversationId });
        }
      } else {
        fullContent = result.content;
        sseWrite(res, { chunk: fullContent, conversationId });
      }

      const processed = await processLlmChatResult(fullContent, userMessage, domainKey, req.user!);
      fullContent = processed.content;
      if (processed.reqCard) {
        reqCardId = String(processed.reqCard._id);
        renameTitle = processed.renameTitle;
      }
    }

    conv.messages.push({
      role: 'ai',
      content: fullContent,
      time: new Date(),
      ...(reqCardId ? { reqCard: new Types.ObjectId(reqCardId) } : {}),
    } as import('../models/Conversation.js').IChatMessage);
    const aiMsg = conv.messages[conv.messages.length - 1];
    if (renameTitle && (conv.title === '新需求对话' || conv.title === '默认对话')) {
      conv.title = renameTitle;
    }
    await conv.save();

    const updated = await Conversation.findById(conv._id);
    const { Requirement } = await import('../models/Requirement.js');
    const { toRequirementJson } = await import('../utils/serialize.js');
    const reqDoc = reqCardId ? await Requirement.findById(reqCardId) : null;
    const userMsg = conv.messages[conv.messages.length - 2];

    sseWrite(res, {
      done: true,
      conversationId,
      message: {
        role: 'ai',
        content: fullContent,
        time: formatChatTime(aiMsg.time),
        reqCard: reqDoc ? toRequirementJson(reqDoc, req.user!) : undefined,
        protoCard: aiMsg.protoCard,
      },
      userMessage: userMsg
        ? {
            role: 'user',
            content: userMsg.content,
            time: formatChatTime(userMsg.time),
            attachments: (userMsg.attachments || []).map((a) => ({
              fileId: a.fileId,
              fileName: a.fileName,
              mimeType: a.mimeType,
              url: `/api/files/${a.fileId}`,
            })),
          }
        : undefined,
      conversation: updated ? await enrichConversation(updated) : undefined,
    });
    res.end();
  } catch (e) {
    if (conv && convId) {
      const last = conv.messages[conv.messages.length - 1];
      if (last?.role === 'user' && !res.headersSent) {
        conv.messages.pop();
      }
    }
    if (!res.headersSent) next(e);
    else res.end();
  }
});

router.post('/skill', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { conversationId, skillId, context } = req.body as {
      conversationId?: string;
      skillId?: string;
      context?: string;
    };
    if (!skillId) {
      res.status(400).json({ error: '需要 skillId' });
      return;
    }

    const message = await executeSkillForUser(
      conversationId,
      skillId,
      context ?? '',
      req.user!,
    );

    res.json({ message });
  } catch (e) {
    next(e);
  }
});

export default router;
