import { getDomain, type DomainKey } from '../config/domains.js';
import type { IUser } from '../models/User.js';
import { Requirement } from '../models/Requirement.js';
import type { IRequirement } from '../models/Requirement.js';

export interface AiChatResult {
  content: string;
  reqCard?: IRequirement;
  renameTitle?: string;
}

function extractDomainSkills(text: string, domainKey: DomainKey): string[] {
  const domain = getDomain(domainKey);
  const found: string[] = [];
  const t = text.toLowerCase();
  for (const s of domain.skills) {
    if (t.includes(s.toLowerCase()) && !found.includes(s)) found.push(s);
    if (found.length >= 5) break;
  }
  if (found.length < 2) found.push(...domain.skills.slice(0, 2));
  return found;
}

function extractDomainTitle(text: string): string {
  const m = text.match(
    /(开发|做|打造|构建|搭建|创建|组建|寻找|找).*?(工具|平台|系统|应用|网站|社区|项目|团队|产品|品牌|课程|节目|视频|内容|合作)/i,
  );
  if (m) return m[0].slice(0, 30);
  return text.slice(0, 28) + (text.length > 28 ? '...' : '');
}

export function shouldGenerateRequirement(userText: string): boolean {
  const lower = userText.toLowerCase();
  const isOptimize = lower.includes('优化') || lower.includes('整理') || lower.includes('结构化');
  return (
    lower.includes('需求') ||
    lower.includes('开发') ||
    lower.includes('平台') ||
    lower.includes('工具') ||
    lower.includes('系统') ||
    isOptimize ||
    userText.length > 15
  );
}

/** LLM 未返回 REQ 标记时的启发式需求生成（仅生成数据，不持久化） */
export async function maybeGenerateRequirementFromText(
  userText: string,
  domainKey: DomainKey,
  user: IUser,
): Promise<IRequirement | undefined> {
  if (!shouldGenerateRequirement(userText)) return undefined;
  const result = await mockAiChat(userText, domainKey, user);
  return result.reqCard;
}

/** 生成需求数据对象（不持久化到数据库），调用方自行决定是否保存 */
function buildMockRequirement(
  userText: string,
  domainKey: DomainKey,
  user: IUser,
): IRequirement {
  const domain = getDomain(domainKey);
  const reqTitle = extractDomainTitle(userText);
  const skills = extractDomainSkills(userText, domainKey);
  const domainTag = domain.name.split(' ')[1] || domain.name;

  return new Requirement({
    title: reqTitle,
    author: user._id,
    status: 'draft',
    visibility: 'public',
    domain: domainKey,
    skills,
    keywords: skills,
    background: `用户描述：${userText.slice(0, 100)}${userText.length > 100 ? '...' : ''}`,
    goal: `在「${domainTag}」领域满足上述需求，实现核心目标。`,
    timeline: '3-6 个月',
    outcome: '完成阶段性目标并找到核心协作伙伴',
    desc: userText.slice(0, 120) + (userText.length > 120 ? '...' : ''),
    matchProgress: 0,
  }) as IRequirement;
}

export async function mockAiChat(
  userText: string,
  domainKey: DomainKey,
  user: IUser,
  opts?: { hasImages?: boolean },
): Promise<AiChatResult> {
  const lower = userText.toLowerCase();
  const domain = getDomain(domainKey);
  const shouldGenReq = shouldGenerateRequirement(userText);
  const imageNote = opts?.hasImages
    ? '\n\n📷 *演示模式：图片已收到；配置 `DOUBAO_API_KEY` + `DOUBAO_VISION_MODEL` 后可真正识图。*'
    : '';

  if (opts?.hasImages && !userText.trim()) {
    return {
      content:
        '我已收到你发送的图片 📷\n\n当前为**本地演示模式**（未配置豆包 API），无法真正识图。配置 `DOUBAO_API_KEY` 与 `DOUBAO_VISION_MODEL` 后，我可以结合截图帮你整理 Side Project 需求。\n\n也可以直接输入文字描述你的项目 idea。',
    };
  }

  if (shouldGenReq) {
    const req = buildMockRequirement(userText, domainKey, user);

    return {
      content: `已为你在「${domain.name}」领域生成结构化需求文档 ✨\n\n**需求已整理完成**，你可以：\n• 点击下方卡片查看完整详情\n• 发布到需求广场\n• 进入智能匹配查看推荐${imageNote}`,
      reqCard: req,
      renameTitle: req.title.slice(0, 20),
    };
  }

  const respPool: Record<string, string[]> = {
    tech: [
      '我理解你的技术需求！\n\n建议补充：\n• **技术栈偏好** — React/Vue/全栈？\n• **目标平台** — Web/移动端/小程序？\n• **需要几位工程师？**\n\n我帮你生成精准需求文档 😊',
      '有意思的方向！✨\n\n技术项目匹配成功率很高，建议突出：\n• **差异化亮点** — 和现有方案有何不同？\n• **技术难度** — 需要侧重前端还是后端？\n\n需要我整理成结构化需求吗？',
    ],
    design: [
      '创意类项目最容易找到志同道合的伙伴！\n\n建议补充：\n• **设计风格** — 极简/复古/科技感？\n• **交付形式** — 品牌VI/插画/动效？\n\n我帮你整理成设计合作需求 🎨',
    ],
    content: [
      '内容创作合作是好方向！\n\n建议细化：\n• **内容形式** — 播客/视频/图文？\n• **目标受众** — 面向哪类人群？\n\n我帮你把想法整理成需求 📝',
    ],
    education: [
      '教育是长坡厚雪的赛道！\n\n建议明确：\n• **目标学员** — K12/大学/职场？\n• **内容类型** — 课程/训练营/工具？\n\n我帮你整理成教育项目需求 🎓',
    ],
    business: [
      '商业合作第一步是明确价值主张！\n\n建议梳理：\n• **项目阶段** — 想法/原型/已有收入？\n• **资源需求** — 资金/渠道/技术？\n\n我帮你生成需求文档 📈',
    ],
  };

  if (lower.includes('你好') || lower.includes('hi') || lower.includes('hello')) {
    return {
      content: `你好！欢迎来到 CollabMatch「${domain.name}」频道 😊\n\n我是 CollabAI，帮你找到志同道合的协作伙伴。\n\n你有什么项目想法或协作需求？告诉我，我来帮你整理！${imageNote}`,
    };
  }

  const pool = respPool[domainKey] || respPool.tech;
  return { content: pool[Math.floor(Math.random() * pool.length)] + imageNote };
}

export async function mockSkillResponse(
  skillId: string,
  context: string,
  domainKey: DomainKey,
  user: IUser,
  skill?: { id: string; name: string; instruct: string },
): Promise<{ content: string; requirement?: IRequirement }> {
  const { SKILLS } = await import('../config/skills.js');
  const resolved = skill ?? SKILLS[skillId];
  if (!resolved) throw new Error('未知技能');

  if (skillId === 'generate_prd') {
    const result = await mockAiChat(context || '请根据对话生成需求文档', domainKey, user);
    return { content: result.content, requirement: result.reqCard };
  }

  const templates: Record<string, string> = {
    diagnose: `**需求诊断报告**\n\n针对「${context.slice(0, 40)}...」：\n\n• **市场**：细分领域仍有空间，建议明确目标用户\n• **技术**：复杂度中等，可先做 MVP 验证\n• **资源**：建议 2-3 人核心团队起步`,
    optimize: `**优化后的需求描述**\n\n${context.slice(0, 80)}\n\n我们寻找志同道合的伙伴，一起把想法落地。你将获得：清晰分工、成长空间、成果共享。`,
    estimate: `**周期估算**\n\n| 阶段 | 时间 | 交付物 |\n|------|------|--------|\n| MVP | 4-6 周 | 核心流程可演示 |\n| 核心功能 | 8-12 周 | 主要模块上线 |\n| 上线 | 2-4 周 | 部署与监控 |\n| 迭代 | 持续 | 根据反馈优化 |`,
    invite: `📨 **邀请文案已生成**\n\nHi！我在 CollabMatch 看到你的资料，觉得技能很契合「${context.slice(0, 25)}」项目。\n\n合作方式灵活，有兴趣我们可以先聊聊？`,
    summary: `**协作周报**\n\n• 本周进展：讨论技术方案与分工\n• 关键决策：待定\n• 待解决：里程碑确认\n• 下周计划：kickoff 会议`,
    generate_ui: `**UI 原型方案**\n\n针对「${context.slice(0, 30)}」：\n\n• **首页**：核心功能入口 + 数据概览\n• **详情页**：分步表单与状态反馈\n• **交互**：关键路径 3 步完成主任务\n• **视觉**：简洁专业，主色建议蓝紫渐变`,
    swot: `**SWOT 分析**\n\n| 优势 | 劣势 |\n|------|------|\n| 需求明确 | 资源有限 |\n\n| 机会 | 威胁 |\n|------|------|\n| 市场增长 | 竞品增多 |\n\n建议：先 MVP 验证核心假设。`,
    roadmap: `**产品路线图**\n\n1. **M1（1-2月）**：需求验证 + 原型\n2. **M2（3-4月）**：核心功能开发\n3. **M3（5-6月）**：公测与迭代\n\n关键交付：可演示 MVP、首批用户反馈。`,
  };

  return {
    content:
      templates[skillId] ||
      `**${resolved.name}**\n\n${context.slice(0, 400) || '（无上下文）'}\n\n---\n已按技能指令处理完成。`,
  };
}
