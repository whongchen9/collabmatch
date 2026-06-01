export interface WorkflowStep {
  skillId?: string;
  /** skill | match_forward | match_reverse */
  action?: 'skill' | 'match_forward' | 'match_reverse';
  title: string;
  icon: string;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  desc: string;
  steps: WorkflowStep[];
  tags: string[];
}

export const WORKFLOWS: WorkflowConfig[] = [
  {
    id: 'wf1',
    name: '🚀 从想法到团队',
    desc: '完整流程：梳理需求 → 匹配协作者 → 组队开始协作',
    steps: [
      { skillId: 'generate_prd', icon: '📋', title: '生成需求文档' },
      { skillId: 'diagnose', icon: '🎯', title: '诊断需求可行性' },
      { skillId: 'optimize', icon: '✨', title: '优化需求描述' },
      { skillId: 'invite', icon: '📨', title: '生成邀请文案' },
      {
        action: 'match_forward',
        skillId: '__action_match_forward__',
        icon: '🔍',
        title: '智能匹配协作者',
      },
    ],
    tags: ['完整流程', '推荐'],
  },
  {
    id: 'wf2',
    name: '🎨 原型生成器',
    desc: '需求描述 → UI 原型 → 迭代优化',
    steps: [
      { skillId: 'generate_prd', icon: '📋', title: '整理需求' },
      { skillId: 'generate_ui', icon: '🖼️', title: '生成 UI 原型' },
    ],
    tags: ['设计', '快速原型'],
  },
  {
    id: 'wf3',
    name: '📊 项目体检',
    desc: '多维度评估项目 + 优化 + 重新匹配',
    steps: [
      { skillId: 'diagnose', icon: '🎯', title: '诊断评估' },
      { skillId: 'optimize', icon: '✨', title: '优化描述' },
      { skillId: 'swot', icon: '🔍', title: 'SWOT 分析' },
    ],
    tags: ['评估', '优化'],
  },
];

export function getWorkflow(id: string): WorkflowConfig | undefined {
  return WORKFLOWS.find((w) => w.id === id);
}
