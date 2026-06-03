import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

/**
 * Express 4 异步路由包装器：自动捕获 async handler 中的 rejected promise，
 * 转发给 Express 错误处理中间件，避免请求挂起。
 *
 * 用法：router.get('/path', asyncWrap(async (req, res) => { ... }));
 */
export function asyncWrap(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: '接口不存在' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error('[error]', err);
  const message = env.nodeEnv === 'production'
    ? '服务器内部错误'
    : (err instanceof Error ? err.message : '服务器错误');
  res.status(500).json({ error: message });
}
