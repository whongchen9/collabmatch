import { env } from '../config/env.js';
import { getDomain, type DomainKey } from '../config/domains.js';
import type { IUser } from '../models/User.js';
import type { IChatMessage } from '../models/Conversation.js';
import type { SkillConfig } from '../config/skills.js';
import { mockAiChat, mockSkillResponse } from './aiMock.js';

export function hasLlm(): boolean {
  return Boolean(env.doubaoApiKey);
}

type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type LlmMessage = { role: string; content: string | LlmContentPart[] };

function visionModel(): string {
  return env.doubaoVisionModel || env.doubaoModel;
}

function pickModel(hasImages: boolean): string {
  return hasImages ? visionModel() : env.doubaoModel;
}

function buildSystemPrompt(user: IUser, domainKey: DomainKey, hasImages: boolean): string {
  const domain = getDomain(domainKey);
  const visionHint = hasImages
    ? '\n用户可能附带截图或图片，请结合图片内容理解 Side Project 需求、界面或文档，并给出具体建议。'
    : '';
  return `你是 CollabAI，协作匹配助手。

职责：理解用户需求，整理成结构化文档，评估可行性，帮找协作者。
${visionHint}
当前用户：${user.name}，技能：${user.skills.join(', ')}，领域：${domain.name}

## 需求对齐规则
当用户描述了一个项目想法或需求时，先判断信息是否充分。关键维度：
1. 做什么 — 项目核心目标
2. 缺什么 — 需要什么样的协作者
3. 怎么做 — 协作方式（远程/同城/线下）、时间投入

如果信息不够，先追问再整理。追问时：
- 一次最多问 2-3 个关键问题，别像审讯
- 用选择题而非开放式问题，比如"你是想做远程协作还是同城？"
- 可以给建议，比如"听起来像是个 Side Project，你每周大概能投入多少时间？"
- 如果用户已经说清楚了大部分，就别追问了，直接整理

只有信息足够时，才生成结构化文档，末尾加一行：
<!--REQ:{"title":"...","skills":[],"background":"...","goal":"...","timeline":"3-6 个月","outcome":"..."}-->

说话风格：
- 干脆利落，短句为主，不啰嗦
- 像聊天不像写报告，别用"首先...其次..."
- 可以有情绪、有判断，不用面面俱到
- 可靠但不死板，偶尔开玩笑
- 给建议但不push，有自己的主见，敢反对不合理的想法
- 先处理核心问题，细节看情况补
- 不确定就直说，不编`;
}

function buildUserContent(text: string, imageUrls: string[]): string | LlmContentPart[] {
  const trimmed = text.trim();
  if (!imageUrls.length) return trimmed;
  const parts: LlmContentPart[] = [];
  if (trimmed) parts.push({ type: 'text', text: trimmed });
  else parts.push({ type: 'text', text: '请结合附图理解我的 Side Project 需求或问题。' });
  for (const url of imageUrls) {
    parts.push({ type: 'image_url', image_url: { url } });
  }
  return parts;
}

function historyToMessages(history: IChatMessage[]): LlmMessage[] {
  return history.map((m) => ({
    role: m.role === 'ai' ? 'assistant' : 'user',
    content: m.content,
  }));
}

async function callDoubao(messages: LlmMessage[], model: string): Promise<string> {
  const url = `${env.doubaoBaseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.doubaoApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`豆包 API 错误: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? '';
}

export async function* streamDoubao(messages: LlmMessage[], model: string): AsyncGenerator<string> {
  const url = `${env.doubaoBaseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.doubaoApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`豆包流式 API 错误: ${res.status} ${text}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const chunk = json.choices?.[0]?.delta?.content;
        if (chunk) yield chunk;
      } catch {
        /* skip malformed */
      }
    }
  }
}

export async function chatWithAi(
  userText: string,
  history: IChatMessage[],
  domainKey: DomainKey,
  user: IUser,
  imageUrls: string[] = [],
): Promise<{ content: string; stream?: AsyncGenerator<string> }> {
  const hasImages = imageUrls.length > 0;

  if (!hasLlm()) {
    const result = await mockAiChat(userText, domainKey, user, { hasImages });
    return { content: result.content };
  }

  const model = pickModel(hasImages);
  const messages: LlmMessage[] = [
    { role: 'system', content: buildSystemPrompt(user, domainKey, hasImages) },
    ...historyToMessages(history),
    { role: 'user', content: buildUserContent(userText, imageUrls) },
  ];

  return {
    content: '',
    stream: streamDoubao(messages, model),
  };
}

export async function runSkill(
  skill: SkillConfig,
  context: string,
  _domainKey: DomainKey,
  _user: IUser,
): Promise<{ content: string }> {
  if (!hasLlm()) {
    const r = await mockSkillResponse(skill.id, context, _domainKey, _user, skill);
    return { content: r.content };
  }

  const content = await callDoubao(
    [
      { role: 'system', content: skill.instruct },
      { role: 'user', content: `用户需求内容：\n${context}` },
    ],
    env.doubaoModel,
  );
  return { content };
}

export { mockAiChat, mockSkillResponse };
