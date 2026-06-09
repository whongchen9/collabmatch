export type DomainKey = 'tech' | 'design' | 'content' | 'education' | 'business';

export interface DomainConfig {
  key: DomainKey;
  name: string;
  icon: string;
  color: string;
  skills: string[];
  templates: { label: string; text: string }[];
  chatIntro: string;
}

const raw: Record<DomainKey, Omit<DomainConfig, 'key'>> = {
  tech: {
    name: '技术开发',
    icon: '💻',
    color: '#8b5cf6',
    skills: [
      'React', 'Vue', 'Node.js', 'Python', 'Go', 'TypeScript', 'Java', 'Docker',
      'Kubernetes', 'AI/ML', 'NLP', '后端开发', '前端开发', '全栈开发', '区块链', '推荐算法', '算法',
    ],
    templates: [
      { label: 'Side Project', text: '我想做一个 AI 工具 Side Project，缺一位会 React 的全栈开发者，每周可投入 10 小时' },
      { label: '开源协作', text: '我有一个开源项目，需要前端贡献者和文档维护者' },
      { label: 'SaaS 合伙', text: '已有 MVP idea，寻找技术合伙人一起做 B2B SaaS' },
    ],
    chatIntro: '描述你的 Side Project 或开源计划，AI 帮你整理需求并匹配合适的工程师',
  },
  design: {
    name: '创意设计',
    icon: '🎨',
    color: '#f59e0b',
    skills: ['Figma', 'UI设计', 'UX研究', '品牌视觉', '插画', '动画', '3D', 'Framer', '设计系统'],
    templates: [
      { label: '品牌设计', text: '寻找设计师一起做一套品牌 VI 系统' },
      { label: '插画合作', text: '找插画师合作出版绘本项目' },
      { label: '设计系统', text: '需要 UI 设计师共建组件库设计规范' },
    ],
    chatIntro: '描述你的创意项目，AI 帮你整理需求并匹配设计师、插画师等创意人才',
  },
  content: {
    name: '内容创作',
    icon: '📝',
    color: '#22c55e',
    skills: ['写作', '视频剪辑', '播客', '自媒体运营', '编辑', '新媒体', '摄影', '内容策划'],
    templates: [
      { label: '播客制作', text: '想找一个搭档一起做科技类播客节目' },
      { label: '视频创作', text: '组建视频创作团队做知识类短视频' },
      { label: '专栏合作', text: '寻找作者合作撰写专栏或电子书' },
    ],
    chatIntro: '描述你的内容创作方向，AI 帮你整理需求并匹配创作者、编辑、运营伙伴',
  },
  education: {
    name: '教育培训',
    icon: '🎓',
    color: '#3b82f6',
    skills: ['课程设计', '教学设计', '知识付费', '培训', '教育科技', '教研', '辅导'],
    templates: [
      { label: '课程共创', text: '寻找学科专家一起开发在线课程' },
      { label: '教育工具', text: '需要教育行业经验的产品经理合作' },
      { label: '知识社区', text: '想组建教育知识分享社区团队' },
    ],
    chatIntro: '描述你的教育项目或教学需求，AI 帮你整理并匹配教育行业伙伴',
  },
  business: {
    name: '商业合作',
    icon: '📈',
    color: '#ef4444',
    skills: ['市场营销', 'BD', '融资', '数据分析', '运营', '产品管理', 'PRD撰写', '商业模式', '供应链'],
    templates: [
      { label: '技术合伙', text: '有产品 idea，寻找技术合伙人一起创业，每周可投入 10-15 小时' },
      { label: '运营合伙', text: 'Side Project 已有 MVP，需要运营合伙人一起做增长' },
      { label: '商业合伙', text: '项目已有原型，寻找商业合伙人负责市场和融资' },
    ],
    chatIntro: '描述你的创业 Side Project，AI 帮你整理需求并匹配技术或商业伙伴',
  },
};

export const DOMAINS: Record<DomainKey, DomainConfig> = Object.fromEntries(
  (Object.keys(raw) as DomainKey[]).map((key) => [key, { key, ...raw[key] }]),
) as Record<DomainKey, DomainConfig>;

export function getDomain(key: string): DomainConfig {
  return DOMAINS[(key as DomainKey) in DOMAINS ? (key as DomainKey) : 'tech'];
}
