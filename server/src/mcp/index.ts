/**
 * CollabMatch MCP Server
 *
 * 通过 stdio 暴露 5 个工具给任意 MCP 客户端：
 *   create_requirement   — 创建协作需求
 *   publish_requirement  — 发布到广场
 *   search_requirements  — 搜索广场需求
 *   find_matches         — 为需求找匹配协作者
 *   get_requirement      — 查询需求详情
 *
 * 使用方式：
 *   Cursor / Claude Desktop 配置中添加 MCP Server
 *   { "command": "npx", "args": ["tsx", "src/mcp/index.ts"], "cwd": "..." }
 *
 *   或 HTTP 桥接模式（开发调试用）：
 *   npx tsx src/mcp/index.ts --http --port 3099
 */

import { connectDb } from '../db/connect.js';
import { Requirement, type IRequirement } from '../models/Requirement.js';
import { User } from '../models/User.js';
import pkg from 'jsonwebtoken';
const { verify } = pkg;
import type { Request, Response } from 'express';

// ─── JSON-RPC 2.0 types ──────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ─── Auth helper ─────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'collabmatch-dev-secret';

function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = verify(token, JWT_SECRET) as { userId: string };
    return payload;
  } catch {
    return null;
  }
}

function unauthorized(id: number | string): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32001, message: 'Unauthorized: provide a valid API token in params.token' },
  };
}

// ─── Tool handlers ───────────────────────────────────────────

async function handleCreateRequirement(
  params: Record<string, unknown>,
): Promise<JsonRpcResponse['result']> {
  const { token, title, background, goal, skills, domain, desc, timeline, outcome } = params;
  const auth = verifyToken(String(token || ''));
  if (!auth) throw Object.assign(new Error('Unauthorized'), { code: -32001 });

  const user = await User.findById(auth.userId);
  if (!user) throw Object.assign(new Error('User not found'), { code: -32004 });

  const doc = await Requirement.create({
    title: String(title || 'Untitled'),
    author: user._id,
    status: 'draft',
    visibility: 'public',
    domain: String(domain || 'tech'),
    skills: Array.isArray(skills) ? skills : String(skills || '').split(',').map(s => s.trim()).filter(Boolean),
    background: String(background || ''),
    goal: String(goal || ''),
    desc: String(desc || ''),
    timeline: String(timeline || '3-6 个月'),
    outcome: String(outcome || ''),
  });

  return {
    id: String(doc._id),
    title: doc.title,
    status: doc.status,
    url: `${process.env.PUBLIC_URL || 'http://localhost:3001'}/#/requirement/${doc._id}`,
    message: '需求已创建，草稿状态。调用 publish_requirement 发布到广场。',
  };
}

async function handlePublishRequirement(
  params: Record<string, unknown>,
): Promise<JsonRpcResponse['result']> {
  const { token, requirement_id, visibility } = params;
  const auth = verifyToken(String(token || ''));
  if (!auth) throw Object.assign(new Error('Unauthorized'), { code: -32001 });

  const doc = await Requirement.findById(String(requirement_id));
  if (!doc) throw Object.assign(new Error('Requirement not found'), { code: -32004 });
  if (String(doc.author) !== auth.userId) throw Object.assign(new Error('Not the author'), { code: -32003 });

  doc.status = 'open';
  doc.visibility = (['public', 'match_only', 'invite_only'].includes(String(visibility)) ? String(visibility) : 'public') as IRequirement['visibility'];
  await doc.save();

  return {
    id: String(doc._id),
    status: doc.status,
    visibility: doc.visibility,
    url: `${process.env.PUBLIC_URL || 'http://localhost:3001'}/#/requirement/${doc._id}`,
    message: '需求已发布到广场，现在可以被其他用户搜索和申请。',
  };
}

async function handleSearchRequirements(
  params: Record<string, unknown>,
): Promise<JsonRpcResponse['result']> {
  const { token, domain, skills, keyword, limit } = params;
  const auth = verifyToken(String(token || ''));
  if (!auth) throw Object.assign(new Error('Unauthorized'), { code: -32001 });

  const filter: Record<string, unknown> = { status: 'open', visibility: 'public' };
  if (domain) filter.domain = String(domain);
  if (keyword) {
    // SEC-03: Escape regex special characters to prevent ReDoS
    const escaped = String(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { desc: { $regex: escaped, $options: 'i' } },
    ];
  }
  if (skills) {
    const skillList = Array.isArray(skills) ? skills : String(skills).split(',').map(s => s.trim());
    filter.skills = { $in: skillList };
  }

  const docs = await Requirement.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 10, 50))
    .populate('author', 'name avatar skills')
    .lean();

  return {
    total: docs.length,
    items: docs.map(d => ({
      id: String(d._id),
      title: d.title,
      domain: d.domain,
      skills: (d as any).skills,
      desc: (d as any).desc?.slice(0, 200),
      author: (d as any).author?.name || 'Unknown',
      createdAt: (d as any).createdAt,
      url: `${process.env.PUBLIC_URL || 'http://localhost:3001'}/#/requirement/${d._id}`,
    })),
  };
}

async function handleFindMatches(
  params: Record<string, unknown>,
): Promise<JsonRpcResponse['result']> {
  const { token, requirement_id } = params;
  const auth = verifyToken(String(token || ''));
  if (!auth) throw Object.assign(new Error('Unauthorized'), { code: -32001 });

  const reqDoc = await Requirement.findById(String(requirement_id));
  if (!reqDoc) throw Object.assign(new Error('Requirement not found'), { code: -32004 });

  // Simple skill-based matching
  const matches = await User.find({
    _id: { $ne: reqDoc.author },
    skills: { $in: reqDoc.skills },
  })
    .select('name avatar skills position bio')
    .limit(Number(params.limit) || 10)
    .lean();

  const scored = matches.map(user => {
    const overlap = ((user as any).skills || []).filter((s: string) => reqDoc.skills.includes(s));
    return {
      userId: String((user as any)._id),
      name: (user as any).name,
      avatar: (user as any).avatar,
      position: (user as any).position,
      bio: (user as any).bio?.slice(0, 150),
      skills: (user as any).skills,
      matchPct: Math.round((overlap.length / Math.max(reqDoc.skills.length, 1)) * 100),
      matchedSkills: overlap,
    };
  });

  scored.sort((a, b) => b.matchPct - a.matchPct);

  return {
    requirementId: String(reqDoc._id),
    requirementTitle: reqDoc.title,
    total: scored.length,
    matches: scored,
    tip: '匹配结果基于技能重合度。可在 CollabMatch 中发送协作邀请。',
  };
}

async function handleGetRequirement(
  params: Record<string, unknown>,
): Promise<JsonRpcResponse['result']> {
  const { token, requirement_id } = params;
  const auth = verifyToken(String(token || ''));
  if (!auth) throw Object.assign(new Error('Unauthorized'), { code: -32001 });

  const doc = await Requirement.findById(String(requirement_id))
    .populate('author', 'name avatar position')
    .lean();
  if (!doc) throw Object.assign(new Error('Requirement not found'), { code: -32004 });

  return {
    id: String(doc._id),
    title: (doc as any).title,
    status: (doc as any).status,
    visibility: (doc as any).visibility,
    domain: (doc as any).domain,
    skills: (doc as any).skills,
    background: (doc as any).background,
    goal: (doc as any).goal,
    desc: (doc as any).desc,
    timeline: (doc as any).timeline,
    outcome: (doc as any).outcome,
    author: (doc as any).author?.name || 'Unknown',
    matchProgress: (doc as any).matchProgress,
    createdAt: (doc as any).createdAt,
    url: `${process.env.PUBLIC_URL || 'http://localhost:3001'}/#/requirement/${doc._id}`,
  };
}

// ─── Tool registry ───────────────────────────────────────────

const TOOLS = [
  {
    name: 'create_requirement',
    description:
      '在 CollabMatch 平台创建一个新的协作需求。用户在你的 Agent 中描述项目想法后，调用此工具将其发布为可匹配的需求。',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'CollabMatch API token（在平台设置页获取）' },
        title: { type: 'string', description: '项目名称' },
        background: { type: 'string', description: '项目背景' },
        goal: { type: 'string', description: '项目目标' },
        skills: { type: ['array', 'string'], description: '所需技能列表' },
        domain: { type: 'string', description: '领域: tech/design/content/education/business', default: 'tech' },
        desc: { type: 'string', description: '详细描述' },
        timeline: { type: 'string', description: '时间线', default: '3-6 个月' },
        outcome: { type: 'string', description: '预期成果' },
      },
      required: ['token', 'title'],
    },
  },
  {
    name: 'publish_requirement',
    description: '将草稿需求发布到 CollabMatch 广场，使其对所有人可见。',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'CollabMatch API token' },
        requirement_id: { type: 'string', description: '需求 ID' },
        visibility: { type: 'string', description: '可见性: public/match_only/invite_only', default: 'public' },
      },
      required: ['token', 'requirement_id'],
    },
  },
  {
    name: 'search_requirements',
    description: '搜索 CollabMatch 广场上的协作需求。可按领域、技能、关键词筛选。',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'CollabMatch API token' },
        domain: { type: 'string', description: '领域筛选' },
        skills: { type: ['array', 'string'], description: '技能筛选' },
        keyword: { type: 'string', description: '关键词搜索' },
        limit: { type: 'number', description: '返回数量上限', default: 10 },
      },
      required: ['token'],
    },
  },
  {
    name: 'find_matches',
    description: '为指定的需求查找匹配的协作者。根据技能重合度排序。',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'CollabMatch API token' },
        requirement_id: { type: 'string', description: '需求 ID' },
        limit: { type: 'number', description: '返回数量上限', default: 10 },
      },
      required: ['token', 'requirement_id'],
    },
  },
  {
    name: 'get_requirement',
    description: '查询需求的完整详情。',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'CollabMatch API token' },
        requirement_id: { type: 'string', description: '需求 ID' },
      },
      required: ['token', 'requirement_id'],
    },
  },
];

// ─── Transport: stdio ─────────────────────────────────────────

async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'collabmatch-mcp', version: '1.0.0' },
        capabilities: { tools: {} },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS },
    };
  }

  if (method === 'tools/call') {
    const toolName = (params as any)?.name;
    const toolParams = (params as any)?.arguments || {};

    try {
      let result: JsonRpcResponse['result'];
      switch (toolName) {
        case 'create_requirement': result = await handleCreateRequirement(toolParams); break;
        case 'publish_requirement': result = await handlePublishRequirement(toolParams); break;
        case 'search_requirements': result = await handleSearchRequirements(toolParams); break;
        case 'find_matches': result = await handleFindMatches(toolParams); break;
        case 'get_requirement': result = await handleGetRequirement(toolParams); break;
        default: return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${toolName}` } };
      }
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } };
    } catch (e: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: e.code || -32603, message: e.message || 'Internal error' },
      };
    }
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } };
}

// ─── Entry ────────────────────────────────────────────────────

async function main() {
  await connectDb();

  const args = process.argv.slice(2);
  if (args.includes('--http')) {
    // HTTP bridge for debugging / remote access
    const port = Number(args[args.indexOf('--port') + 1]) || 3099;
    const { default: express } = await import('express');
    const cors = (await import('cors')).default || (await import('cors'));
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.post('/mcp', async (req: Request, res: Response) => {
      const response = await handleRequest(req.body as JsonRpcRequest);
      res.json(response);
    });

    app.get('/mcp/health', (_req: Request, res: Response) => res.json({ ok: true }));

    app.listen(port, () => {
      console.log(`[mcp] CollabMatch MCP Server (HTTP) http://localhost:${port}/mcp`);
    });
  } else {
    // stdio transport (standard MCP)
    process.stdin.setEncoding('utf8');
    let buffer = '';

    process.stdin.on('data', async (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const req: JsonRpcRequest = JSON.parse(line);
          const res = await handleRequest(req);
          process.stdout.write(JSON.stringify(res) + '\n');
        } catch {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n');
        }
      }
    });

    process.on('SIGTERM', () => process.exit(0));
    process.on('SIGINT', () => process.exit(0));
  }
}

main().catch(err => {
  console.error('[mcp] Failed to start:', err);
  process.exit(1);
});
