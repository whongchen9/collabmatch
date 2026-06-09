import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { asOne } from '../db/helpers.js';
import { User } from '../models/User.js';
import { env, useProductionAuth, hasTencentSms } from '../config/env.js';
import { signToken } from '../utils/jwt.js';
import { toUserJson } from '../utils/serialize.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { sendLoginSms, verifyLoginCode, normalizePhone } from '../services/sms.js';

const router = Router();

// Rate limiting: in-memory Map, 60s window per phone / 5s per IP
// 注意：此实现仅适用于单实例部署。多实例/生产环境建议使用 Redis 等外部存储。
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;
const IP_RATE_LIMIT_MS = 5_000; // SEC-09: IP 级限流，5秒内同一 IP 只能尝试一次登录

// SEC-15: 定期清理过期条目，防止内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of rateLimitMap) {
    if (now - ts > Math.max(RATE_LIMIT_MS, IP_RATE_LIMIT_MS) * 2) {
      rateLimitMap.delete(key);
    }
  }
}, 120_000).unref(); // 每 2 分钟清理一次

function checkRateLimit(key: string, windowMs = RATE_LIMIT_MS): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(key);
  if (last && now - last < windowMs) return false;
  rateLimitMap.set(key, now);
  return true;
}

function getClientIp(req: import('express').Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || '0.0.0.0';
}

router.get('/config', (_req, res) => {
  const devLoginAvailable = env.authMode === 'dev' || !hasTencentSms();
  res.json({
    authMode: env.authMode,
    smsEnabled: useProductionAuth(),
    devLoginAvailable,
    emailAuthEnabled: true,
    // SEC-10: 不再通过 API 响应泄露 devAuthCode
  });
});

router.post('/sms/send', async (req, res, next) => {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone) {
      res.status(400).json({ error: '需要 phone' });
      return;
    }
    // SEC-09: IP 级限流
    const clientIp = getClientIp(req);
    if (!checkRateLimit(`ip:${clientIp}`, IP_RATE_LIMIT_MS)) {
      res.status(429).json({ error: '操作过于频繁，请稍后再试' });
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
    // SEC-10: 开发模式不再通过 API 返回验证码
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
    // SEC-09: IP 级全局限流，5秒内同一 IP 只能尝试一次登录
    const clientIp = getClientIp(req);
    if (!checkRateLimit(`ip:${clientIp}`, IP_RATE_LIMIT_MS)) {
      res.status(429).json({ error: '操作过于频繁，请稍后再试' });
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
    res.json({ token, user: toUserJson(user, { includePrivatePortfolio: true }) });
  } catch (e) {
    next(e);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
    if (!email || !password || !name) {
      res.status(400).json({ error: '需要 email、password 和 name' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: '邮箱格式不正确' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: '密码长度至少 6 位' });
      return;
    }
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ error: '该邮箱已注册' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = asOne(
      await User.create({
        email,
        passwordHash,
        name,
        avatar: name[0] ?? '用',
        position: '协作者',
        bio: '',
        skills: [],
        domain: 'tech',
      }),
    );
    const token = signToken(String(user._id));
    res.status(201).json({ token, user: toUserJson(user, { includePrivatePortfolio: true }) });
  } catch (e) {
    next(e);
  }
});

router.post('/email-login', async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: '需要 email 和 password' });
      return;
    }
    // IP 级限流
    const clientIp = getClientIp(req);
    if (!checkRateLimit(`ip:${clientIp}`, IP_RATE_LIMIT_MS)) {
      res.status(429).json({ error: '操作过于频繁，请稍后再试' });
      return;
    }
    if (!checkRateLimit(`email-login:${email}`)) {
      res.status(429).json({ error: '登录过于频繁，请60秒后再试' });
      return;
    }
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: '邮箱或密码错误' });
      return;
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: '邮箱或密码错误' });
      return;
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
