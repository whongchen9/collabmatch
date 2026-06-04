import { Router } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { ExternalAccount } from '../models/ExternalAccount.js';
import { Requirement } from '../models/Requirement.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { populateReqAuthor } from '../utils/serialize.js';
import { toExternalJson } from '../utils/xcdIntegration.js';
import { isXcdConfigured, syncRequirementToXcd } from '../services/xcdSync.js';
import type { FulfillmentType } from '../models/Requirement.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    configured: isXcdConfigured(),
    platform: env.xcdPlatform,
  });
});

/** 绑定 CollabMatch 账号 ↔ 即DAO openid（小程序登录后把 openid 传给 Web 端） */
router.post('/link', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const openid = String(req.body?.openid || '').trim();
    if (!openid) {
      res.status(400).json({ error: '缺少 openid' });
      return;
    }

    const doc = await ExternalAccount.findOneAndUpdate(
      { userId: req.user!._id, provider: 'xiaoChen-dao' },
      {
        $set: {
          externalId: openid,
          metadata: {
            linkedAt: new Date().toISOString(),
            phone: req.user!.phone || '',
          },
        },
      },
      { upsert: true, new: true },
    );

    res.json({
      ok: true,
      provider: doc.provider,
      openid: doc.externalId,
      linkedAt: doc.updatedAt,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/account', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const doc = await ExternalAccount.findOne({
      userId: req.user!._id,
      provider: 'xiaoChen-dao',
    });
    if (!doc) {
      res.json({ linked: false, provider: 'xiaoChen-dao' });
      return;
    }
    res.json({
      linked: true,
      provider: doc.provider,
      openid: doc.externalId,
      metadata: doc.metadata,
      updatedAt: doc.updatedAt,
    });
  } catch (e) {
    next(e);
  }
});

router.delete('/account', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    await ExternalAccount.deleteOne({ userId: req.user!._id, provider: 'xiaoChen-dao' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

async function loadOwnedRequirement(reqId: string, userId: string) {
  return Requirement.findOne({ _id: reqId, author: userId });
}

router.get('/requirements/:reqId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const reqDoc = await Requirement.findById(req.params.reqId);
    if (!reqDoc) {
      res.status(404).json({ error: '需求不存在' });
      return;
    }
    if (String(reqDoc.author) !== String(req.user!._id)) {
      res.status(403).json({ error: '仅发布者可查看即DAO 同步状态' });
      return;
    }
    res.json({
      requirementId: String(reqDoc._id),
      fulfillmentType: reqDoc.fulfillmentType,
      external: toExternalJson(reqDoc),
      xcdConfigured: isXcdConfigured(),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/requirements/:reqId/sync', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const reqDoc = await loadOwnedRequirement(req.params.reqId, String(req.user!._id));
    if (!reqDoc) {
      res.status(404).json({ error: '需求不存在或无权限' });
      return;
    }

    const account = await ExternalAccount.findOne({
      userId: req.user!._id,
      provider: 'xiaoChen-dao',
    });
    if (!account?.externalId) {
      res.status(400).json({
        error: '未绑定即DAO 账号',
        hint: '请先在即DAO 小程序登录，再 POST /api/integrations/xcd/link 提交 openid',
      });
      return;
    }

    reqDoc.externalSyncStatus = 'pending';
    reqDoc.externalSyncError = '';
    await reqDoc.save();

    const result = await syncRequirementToXcd(reqDoc, account.externalId);
    if (result.ok === true) {
      reqDoc.externalSource = 'xiaoChen-dao';
      reqDoc.externalPlanId = result.planId;
      reqDoc.externalRoomId = result.roomId || reqDoc.externalRoomId;
      reqDoc.externalSyncStatus = 'synced';
      reqDoc.externalSyncError = '';
      reqDoc.externalSyncedAt = new Date();
      await reqDoc.save();

      const list = await populateReqAuthor([reqDoc]);
      res.json({
        ok: true,
        existed: result.existed,
        planId: result.planId,
        roomId: result.roomId || null,
        requirement: list[0],
      });
      return;
    }

    reqDoc.externalSyncStatus = 'failed';
    reqDoc.externalSyncError = result.errMsg;
    await reqDoc.save();
    res.status(502).json({
      error: result.errMsg,
      hint: result.hint,
      external: toExternalJson(reqDoc),
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/requirements/:reqId/fulfillment', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const reqDoc = await loadOwnedRequirement(req.params.reqId, String(req.user!._id));
    if (!reqDoc) {
      res.status(404).json({ error: '需求不存在或无权限' });
      return;
    }
    const ft = req.body?.fulfillmentType as FulfillmentType | undefined;
    if (ft !== 'project' && ft !== 'instant') {
      res.status(400).json({ error: 'fulfillmentType 须为 project 或 instant' });
      return;
    }
    reqDoc.fulfillmentType = ft;
    await reqDoc.save();
    const list = await populateReqAuthor([reqDoc]);
    res.json({ requirement: list[0] });
  } catch (e) {
    next(e);
  }
});

function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!env.xcdWebhookSecret) {
    // SEC-06: 生产环境未配置 Webhook Secret 时拒绝所有请求
    if (env.nodeEnv === 'production') return false;
    // 开发/测试环境未配置时也拒绝，避免意外绕过
    console.warn('[xcd] Webhook Secret 未配置，拒绝所有 webhook 请求');
    return false;
  }
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', env.xcdWebhookSecret)
    .update(rawBody)
    .digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** 即DAO 回调：计划状态变更、匹配结果等（骨架，按 event 扩展） */
router.post('/webhook', async (req, res, next) => {
  try {
    const rawBody = JSON.stringify(req.body ?? {});
    const sig = req.headers['x-xcd-signature'];
    const signature = typeof sig === 'string' ? sig : undefined;
    if (!verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ error: '签名校验失败' });
      return;
    }

    const event = String(req.body?.event || '');
    const requirementId = String(req.body?.requirementId || req.body?.externalRef || '').trim();
    const planId = String(req.body?.planId || '').trim();
    const roomId = String(req.body?.roomId || '').trim();

    let updated = false;
    if (requirementId) {
      const reqDoc = await Requirement.findById(requirementId);
      if (reqDoc) {
        if (planId) reqDoc.externalPlanId = planId;
        if (roomId) reqDoc.externalRoomId = roomId;
        if (req.body?.syncStatus) reqDoc.externalSyncStatus = req.body.syncStatus;
        await reqDoc.save();
        updated = true;
      }
    } else if (planId) {
      const reqDoc = await Requirement.findOne({ externalPlanId: planId });
      if (reqDoc) {
        if (roomId) reqDoc.externalRoomId = roomId;
        await reqDoc.save();
        updated = true;
      }
    }

    res.json({ ok: true, event, updated });
  } catch (e) {
    next(e);
  }
});

export default router;
