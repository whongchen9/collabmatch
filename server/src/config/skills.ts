export type SkillCategory = 'official' | 'community';

export interface SkillConfig {
  id: string;
  icon: string;
  name: string;
  desktop: string;
  instruct: string;
  category?: SkillCategory;
  author?: string;
  tags?: string[];
  installs?: number;
  version?: string;
  isInstallable?: boolean;
}

export const SKILLS: Record<string, SkillConfig> = {
  generate_prd: {
    id: 'generate_prd',
    icon: '📋',
    name: '生成需求文档',
    desktop: '将用户的描述整理为结构化需求文档',
    instruct:
      '请把用户刚才描述的内容整理成结构化需求文档。输出格式：标题、项目背景、核心目标、所需技能、预期时间线、预期成果。',
    category: 'official',
    author: 'CollabAI',
    tags: ['文档', '需求'],
    installs: 12580,
    version: '1.3',
    isInstallable: true,
  },
  diagnose: {
    id: 'diagnose',
    icon: '🎯',
    name: '诊断需求',
    desktop: '从市场/技术/资源三维度分析可行性',
    instruct:
      '请从市场可行性、技术难度、资源需求三个维度诊断用户刚才描述的需求，指出潜在风险和被忽略的关键点，给出务实建议。',
    category: 'official',
    author: 'CollabAI',
    tags: ['诊断', '分析'],
    installs: 9820,
    version: '1.2',
    isInstallable: true,
  },
  optimize: {
    id: 'optimize',
    icon: '✨',
    name: '优化描述',
    desktop: '让需求描述更吸引协作者',
    instruct:
      '请优化用户刚才的需求描述，使其更吸引潜在协作者。突出：项目亮点、为什么值得参与、合作能获得什么。保持简洁有力。',
    category: 'official',
    author: 'CollabAI',
    tags: ['优化', '文案'],
    installs: 8640,
    version: '1.1',
    isInstallable: true,
  },
  estimate: {
    id: 'estimate',
    icon: '⏱️',
    name: '估算周期',
    desktop: '给项目阶段划分和时间估算',
    instruct:
      '请根据用户描述的项目需求，给出分阶段的周期估算。拆成 MVP/核心功能/上线/迭代四个阶段，每个阶段给时间范围和关键交付物。',
    category: 'official',
    author: 'CollabAI',
    tags: ['周期', '规划'],
    installs: 7200,
    version: '1.0',
    isInstallable: true,
  },
  invite: {
    id: 'invite',
    icon: '📨',
    name: '生成邀请文案',
    desktop: '为匹配到的协作者生成个性化邀请',
    instruct:
      '请基于当前需求和匹配到的协作者信息，生成一段自然、真诚的协作邀请文案。包含：项目简介、为什么选对方、合作模式建议。',
    category: 'official',
    author: 'CollabAI',
    tags: ['邀请', '协作'],
    installs: 6100,
    version: '1.0',
    isInstallable: true,
  },
  summary: {
    id: 'summary',
    icon: '📊',
    name: '协作周报',
    desktop: '自动总结群组近期讨论内容',
    instruct:
      '请总结当前群组最近的讨论要点。按以下结构：本周进展、关键决策、待解决问题、下周计划。如果讨论内容不足，告知无法总结。',
    category: 'official',
    author: 'CollabAI',
    tags: ['周报', '总结'],
    installs: 5400,
    version: '1.0',
    isInstallable: true,
  },
  generate_ui: {
    id: 'generate_ui',
    icon: '🖼️',
    name: '生成 UI 原型',
    desktop: '根据描述生成可交互的产品界面原型',
    instruct:
      '请根据用户描述的产品需求，输出 UI 原型方案：页面结构、核心组件、交互流程、设计建议（配色与布局）。用 Markdown 分节描述，便于设计师落地。',
    category: 'official',
    author: 'CollabAI',
    tags: ['原型', 'UI', '设计'],
    installs: 4300,
    version: '1.0',
    isInstallable: true,
  },
  swot: {
    id: 'swot',
    icon: '🔍',
    name: 'SWOT 分析',
    desktop: '竞品 SWOT 分析矩阵',
    instruct:
      '请对用户描述的项目做 SWOT 分析，按优势、劣势、机会、威胁四象限输出，每条 2-4 点，并给出 1-2 条战略建议。',
    category: 'community',
    author: '策略大师',
    tags: ['分析', '竞品', '商业'],
    installs: 3200,
    version: '1.0',
    isInstallable: true,
  },
  roadmap: {
    id: 'roadmap',
    icon: '🗺️',
    name: '产品路线图',
    desktop: '生成分阶段产品路线图',
    instruct:
      '请根据用户需求生成分阶段产品路线图：里程碑、时间范围、关键交付物、依赖关系。用表格或列表呈现。',
    category: 'community',
    author: 'PM助手',
    tags: ['规划', '产品', '路线图'],
    installs: 1800,
    version: '1.0',
    isInstallable: true,
  },
};

export const DOMAIN_SKILL_MAP: Record<string, string[]> = {
  tech: ['generate_prd', 'diagnose', 'optimize', 'estimate', 'invite', 'summary', 'generate_ui'],
  design: ['generate_prd', 'diagnose', 'optimize', 'estimate', 'invite', 'generate_ui'],
  content: ['generate_prd', 'diagnose', 'optimize', 'invite', 'generate_ui'],
  education: ['generate_prd', 'diagnose', 'optimize', 'estimate', 'invite', 'generate_ui'],
  business: ['generate_prd', 'diagnose', 'optimize', 'estimate', 'invite', 'generate_ui'],
};

export const DEFAULT_INSTALLED_SKILL_IDS = [
  'generate_prd',
  'diagnose',
  'optimize',
  'estimate',
  'invite',
  'generate_ui',
  'summary',
];

export function listMarketSkills(query?: string): SkillConfig[] {
  let list = Object.values(SKILLS).filter((s) => s.isInstallable);
  const q = query?.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.tags || []).some((t) => t.toLowerCase().includes(q)),
    );
  }
  return list;
}
