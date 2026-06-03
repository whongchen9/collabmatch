import { Router } from 'express';
import { asOne } from '../db/helpers.js';
import { User } from '../models/User.js';
import { env, useProductionAuth, hasTencentSms } from '../config/env.js';
import { signToken } from '../utils/jwt.js';
import { toUserJson } from '../utils/serialize.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { sendLoginSms, verifyLoginCode, normalizePhone } from '../services/sms.js';

const router = Router();

// Rate limiting: in-memory Map, 60s window per phone
// 注意：此实现仅适用于单实例部署。多实例/生产环境建议使用 Redis 等外部存储。
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(key);
  if (last && now - last < RATE_LIMIT_MS) return false;
  rateLimitMap.set(key, now);
  return true;
}

router.get('/config', (_req, res) => {
  const devLoginAvailable = env.authMode === 'dev' || !hasTencentSms();
  res.json({
    authMode: env.authMode,
    smsEnabled: useProductionAuth(),
    devLoginAvailable,
    devAuthCode: devLoginAvailable ? env.devAuthCode : undefined,
  });
});

router.post('/sms/send', async (req, res, next) => {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone) {
      res.status(400).json({ error: '需要 phone' });
      return;
    }
    // Rate limit: 60s per phone number
    if (!checkRateLimit(`sms:${phone}`)) {
      res.status(429).json({ error: '发送过于频繁，请60秒后再试' });
      return;
    }
    normalizePhone(phone);
    const { expiresIn } = await sendLoginSms(phone);
    const payload: Record<string, unknown> = {
      success: true,
      expiresIn,
      message: '验证码已发送',
    };
    if (!useProductionAuth()) {
      payload.hint = `开发模式验证码：${env.devAuthCode}`;
    }
    res.json(payload);
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { phone, code } = req.body as { phone?: string; code?: string };
    if (!phone || !code) {
      res.status(400).json({ error: '需要 phone 和 code' });
      return;
    }
    // Rate limit: 60s per phone number
    if (!checkRateLimit(`login:${phone}`)) {
      res.status(429).json({ error: '登录过于频繁，请60秒后再试' });
      return;
    }

    const normalized = normalizePhone(phone);
    const ok = await verifyLoginCode(normalized, code);
    if (!ok) {
      res.status(401).json({ error: '验证码错误或已过期' });
      return;
    }

    let user = await User.findOne({ phone: normalized });
    if (!user) {
      const name = `用户${normalized.slice(-4)}`;
      user = asOne(
        await User.create({
          phone: normalized,
          name,
          avatar: name[0] ?? '用',
          position: '协作者',
          bio: '',
          skills: [],
          domain: 'tech',
        }),
      );
    }

    user.lastSeenAt = new Date();
    await user.save();

    const token = signToken(String(user._id));
    res.json({ token, user: toUserJson(user, { includePrivatePortfolio: true, includePhone: true }) });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: toUserJson(req.user!, { includePrivatePortfolio: true, includePhone: true }) });
});

export default router;
