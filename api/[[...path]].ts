import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/dist/app.js';
import { connectDb } from '../server/dist/db/connect.js';

let dbReady = false;
let dbPromise: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!dbReady) {
    if (!dbPromise) {
      dbPromise = connectDb().then(() => { dbReady = true; });
    }
    try {
      await dbPromise;
    } catch (err) {
      dbPromise = null;
      console.error('[api] DB connection failed:', err);
      res.status(503).json({ error: 'Database connection failed' });
      return;
    }
  }
  return app(req, res);
}
