import type { Request, Response, NextFunction } from 'express';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: '接口不存在' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error('[error]', err);
  const message = err instanceof Error ? err.message : '服务器错误';
  res.status(500).json({ error: message });
}
