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
  return `你是 CollabAI，一个专注于协作匹配的 AI 助手。你的职责：

1. 理解用户的项目需求或协作意向
2. 整理为结构化需求文档（标题、背景、目标、所需技能、时间线、预期成果）
3. 评估需求可行性，给出务实建议
4. 生成吸引协作者的优化描述
${visionHint}
当前用户信息：
- 姓名：${user.name}
- 技能：${user.skills.join(', ')}
- 当前领域：${domain.name}

如果用户描述了一个具体需求，你应该：
1. 生成结构化需求文档
2. 在回复末尾用一行 JSON 标注：<!--REQ:{"title":"...","skills":[],"background":"...","goal":"...","timeline":"3-6 个月","outcome":"..."}-->

回复风格：友好、专业、极简，不用"你好！很高兴为你服务"之类客套话。`;
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
