import { Router, type Request, type Response } from 'express';
import { Requirement } from '../models/Requirement.js';
import { User } from '../models/User.js';

const router = Router();

// ─── API Key rate limiting (in-memory) ───────────────────────
const apiKeyRateMap = new Map<string, { count: number; windowStart: number }>();
const API_KEY_WINDOW = 60_000; // 1 minute
const API_KEY_MAX = 60; // 60 requests per minute per key

function checkApiKeyRate(apiKey: string): boolean {
  const now = Date.now();
  const r = apiKeyRateMap.get(apiKey);
  if (!r || now - r.windowStart > API_KEY_WINDOW) {
    apiKeyRateMap.set(apiKey, { count: 1, windowStart: now });
    return true;
  }
  if (r.count >= API_KEY_MAX) return false;
  r.count++;
  return true;
}

// Clean up every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of apiKeyRateMap) {
    if (now - v.windowStart > API_KEY_WINDOW * 2) apiKeyRateMap.delete(k);
  }
}, 300_000).unref();

function requireApiKey(req: Request, res: Response): string | null {
  const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string || '';
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API Key. Pass via X-API-Key header or api_key query param.' });
    return null;
  }
  if (!checkApiKeyRate(apiKey)) {
    res.status(429).json({ error: 'Rate limit exceeded. Max 60 requests/minute.' });
    return null;
  }
  return apiKey;
}

// ─── Register API Key ────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { site_name, site_url } = req.body as { site_name?: string; site_url?: string };
    if (!site_name) {
      res.status(400).json({ error: 'site_name is required' });
      return;
    }
    // For local dev, just return a generated key
    // In production, this would store in DB
    const key = 'cm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    res.json({
      api_key: key,
      message: 'Keep this key safe. Use it in X-API-Key header or api_key query param.',
      endpoints: {
        requirements: '/api/public/requirements',
        requirement_detail: '/api/public/requirements/:id',
        user_profile: '/api/public/users/:id',
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Public: List Requirements ───────────────────────────────
router.get('/requirements', async (req: Request, res: Response) => {
  const apiKey = requireApiKey(req, res);
  if (!apiKey) return;

  try {
    const { domain, keyword, limit: limitStr } = req.query as Record<string, string>;
    const limit = Math.min(Number(limitStr) || 20, 50);

    const filter: Record<string, unknown> = { status: 'open', visibility: 'public' };
    if (domain) filter.domain = domain;
    if (keyword) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { desc: { $regex: escaped, $options: 'i' } },
      ];
    }

    const docs = await Requirement.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', 'name avatar position')
      .lean();

    res.json({
      total: docs.length,
      items: docs.map(d => ({
        id: String((d as any)._id),
        title: d.title,
        domain: d.domain,
        skills: d.skills,
        desc: (d.desc || '').slice(0, 300),
        background: d.background,
        goal: d.goal,
        timeline: d.timeline,
        matchProgress: d.matchProgress,
        author: (d as any).author?.name || 'Unknown',
        createdAt: d.createdAt,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

// ─── Public: Requirement Detail ──────────────────────────────
router.get('/requirements/:id', async (req: Request, res: Response) => {
  const apiKey = requireApiKey(req, res);
  if (!apiKey) return;

  try {
    const doc = await Requirement.findById(req.params.id)
      .populate('author', 'name avatar position')
      .lean();

    if (!doc || doc.status !== 'open' || doc.visibility !== 'public') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({
      id: String((doc as any)._id),
      title: doc.title,
      domain: doc.domain,
      skills: doc.skills,
      desc: doc.desc,
      background: doc.background,
      goal: doc.goal,
      timeline: doc.timeline,
      outcome: doc.outcome,
      matchProgress: doc.matchProgress,
      author: (doc as any).author?.name || 'Unknown',
      createdAt: doc.createdAt,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch requirement' });
  }
});

// ─── Public: User Profile ────────────────────────────────────
router.get('/users/:id', async (req: Request, res: Response) => {
  const apiKey = requireApiKey(req, res);
  if (!apiKey) return;

  try {
    const user = await User.findById(req.params.id)
      .select('name avatar position skills domain collabScore projects')
      .lean();

    if (!user) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({
      id: String((user as any)._id),
      name: user.name,
      avatar: user.avatar,
      position: user.position,
      skills: user.skills,
      domain: user.domain,
      collabScore: user.collabScore,
      projects: user.projects,
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
