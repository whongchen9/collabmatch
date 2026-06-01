import { Router } from 'express';
import { asOne } from '../db/helpers.js';
import { User } from '../models/User.js';
import { env, useProductionAuth, hasTencentSms } from '../config/env.js';
import { signToken } from '../utils/jwt.js';
import { toUserJson } from '../utils/serialize.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { sendLoginSms, verifyLoginCode, normalizePhone } from '../services/sms.js';

const router = Router();

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
    res.json({ token, user: toUserJson(user, { includePrivatePortfolio: true }) });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: toUserJson(req.user!, { includePrivatePortfolio: true }) });
});

export default router;
