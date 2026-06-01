import type { Request, Response, NextFunction } from 'express';
import { User, type IUser } from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  try {
    const { userId } = verifyToken(header.slice(7));
    const user = await User.findById(userId);
    if (!user) {
      res.status(401).json({ error: '用户不存在' });
      return;
    }
    req.user = user;
    user.lastSeenAt = new Date();
    void user.save();
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const { userId } = verifyToken(header.slice(7));
      req.user = (await User.findById(userId)) ?? undefined;
    } catch {
      /* ignore */
    }
  }
  next();
}
