import type { IUser } from '../models/User.js';
import { hasLlm } from './llm.js';
import { getDomain } from '../config/domains.js';

const SUGGESTION_POOL = ['系统设计', '技术演讲', '敏捷开发', '开源贡献', '跨团队协作', '产品思维'];

export async function enhanceUserProfile(user: IUser): Promise<{ bio: string; skills: string[] }> {
  const domain = getDomain(user.domain);
  const extra = domain.skills.filter((s) => !user.skills.includes(s)).slice(0, 2);
  const fromPool = SUGGESTION_POOL.filter((s) => !user.skills.includes(s)).slice(0, 2);
  const newSkills = [...new Set([...user.skills, ...extra, ...fromPool])].slice(0, 12);

  let bio = user.bio || '';
  if (!bio.includes('协作')) {
    bio = bio.trim()
      ? `${bio.trim()} 善于跨团队协作，具备从想法到落地的综合能力。`
      : `专注于「${domain.name}」方向，期待与志同道合的伙伴一起做出有影响力的作品。`;
  }

  if (hasLlm()) {
    try {
      const { env } = await import('../config/env.js');
      const res = await fetch(`${env.doubaoBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.doubaoApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.doubaoModel,
          messages: [
            {
              role: 'system',
              content:
                '你是 CollabMatch 名片优化助手。根据用户现有信息，输出 JSON：{"bio":"80字以内简介","skills":["技能1","技能2"]}，skills 最多 8 个，不要客套话。',
            },
            {
              role: 'user',
              content: `姓名：${user.name}\n职位：${user.position}\n领域：${domain.name}\n现有技能：${user.skills.join(', ')}\n现有简介：${user.bio}`,
            },
          ],
          stream: false,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content ?? '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { bio?: string; skills?: string[] };
          if (parsed.bio) bio = parsed.bio;
          if (parsed.skills?.length) return { bio, skills: parsed.skills.slice(0, 10) };
        }
      }
    } catch {
      /* fallback below */
    }
  }

  return { bio, skills: newSkills };
}
