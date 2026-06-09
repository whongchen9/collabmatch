import { asMany } from '../db/helpers.js';
import { User } from '../models/User.js';
import { DEFAULT_INSTALLED_SKILL_IDS } from '../config/skills.js';
import { Requirement } from '../models/Requirement.js';
import { Group } from '../models/Group.js';
import { Conversation } from '../models/Conversation.js';

const COLORS = {
  purple: 'linear-gradient(135deg, #8b7bf7, #6c5ce7)',
  blue: 'linear-gradient(135deg, #7c8cf7, #5b6ce7)',
  green: 'linear-gradient(135deg, #6bcf8e, #4ab87a)',
  orange: 'linear-gradient(135deg, #c4956a, #a87d5c)',
  pink: 'linear-gradient(135deg, #b07cc7, #9466b0)',
  cyan: 'linear-gradient(135deg, #6bb8c9, #5a9fb0)',
};

export async function seedIfEmpty(): Promise<void> {
  const count = await User.countDocuments();
  if (count > 0) {
    console.log('[seed] skipped, users exist:', count);
    // 补充已有用户的 email/passwordHash（从手机登录迁移到邮箱登录时需要）
    await backfillEmailAuth();
    return;
  }

  console.log('[seed] inserting demo data...');

  const main = await User.create({
    phone: '13800000000',
    email: 'yunfan@collabmatch.app',
    passwordHash: '$2b$10$Ph/Vm3Q47wObvi5s9sbbiOXoViHnfdGL2nJmJefMu703bXappMmG.',
    name: '李云帆',
    avatar: '李',
    avatarColor: COLORS.purple,
    position: '全栈工程师 & 技术创始人',
    bio: '热衷于用技术解决实际问题，有 5 年全栈开发经验，曾主导多个从 0 到 1 的产品。喜欢跨领域合作，尤其是 AI + 产品方向。',
    skills: ['React', 'Node.js', 'Python', 'AI/ML', '产品设计', '系统架构'],
    skillIds: [...DEFAULT_INSTALLED_SKILL_IDS],
    domain: 'tech',
    collabScore: 4.9,
    projects: 6,
    resources: [
      { icon: 'server', name: '高性能服务器', desc: '4核8G 云服务器，可共享算力' },
      { icon: 'database', name: '数据集资源', desc: '多领域脱敏数据集，可用于训练' },
      { icon: 'fund', name: '天使轮资金', desc: '可为优质项目提供种子资金支持' },
    ],
  });

  const others = asMany(
    await User.insertMany([
    {
      phone: '13800000001',
      email: 'xiaowei@collabmatch.app',
      passwordHash: '$2b$10$Ph/Vm3Q47wObvi5s9sbbiOXoViHnfdGL2nJmJefMu703bXappMmG.',
      name: '陈晓薇',
      avatar: '陈',
      avatarColor: COLORS.pink,
      position: 'UI/UX 设计师',
      bio: '专注于用户体验设计，擅长 Figma、设计系统构建。',
      skills: ['Figma', 'UI设计', 'UX研究', '设计系统', 'Framer', '品牌视觉'],
      domain: 'design',
      collabScore: 4.8,
      projects: 12,
    },
    {
      phone: '13800000002',
      email: 'zhanglei@collabmatch.app',
      passwordHash: '$2b$10$Ph/Vm3Q47wObvi5s9sbbiOXoViHnfdGL2nJmJefMu703bXappMmG.',
      name: '张磊',
      avatar: '张',
      avatarColor: COLORS.blue,
      position: '机器学习工程师',
      bio: '深度学习方向，熟悉 PyTorch、Transformer 架构。',
      skills: ['Python', 'PyTorch', 'NLP', '推荐算法', 'MLOps', 'LLM'],
      domain: 'tech',
      collabScore: 4.6,
      projects: 8,
    },
    {
      phone: '13800000003',
      email: 'siyuan@collabmatch.app',
      passwordHash: '$2b$10$Ph/Vm3Q47wObvi5s9sbbiOXoViHnfdGL2nJmJefMu703bXappMmG.',
      name: '王思远',
      avatar: '王',
      avatarColor: COLORS.green,
      position: '前端工程师',
      bio: '精通 React 生态，有丰富的复杂交互开发经验。',
      skills: ['React', 'TypeScript', 'Vue', '动效设计', 'WebGL', '性能优化'],
      domain: 'tech',
      collabScore: 4.7,
      projects: 15,
    },
    {
      phone: '13800000004',
      email: 'liufang@collabmatch.app',
      passwordHash: '$2b$10$Ph/Vm3Q47wObvi5s9sbbiOXoViHnfdGL2nJmJefMu703bXappMmG.',
      name: '刘芳',
      avatar: '刘',
      avatarColor: COLORS.orange,
      position: '产品经理',
      bio: '专注 ToB SaaS 产品，数据驱动。',
      skills: ['产品设计', '数据分析', '用户研究', 'PRD撰写', 'Axure', 'SQL'],
      domain: 'business',
      collabScore: 4.5,
      projects: 10,
    },
    {
      phone: '13800000005',
      email: 'zihao@collabmatch.app',
      passwordHash: '$2b$10$Ph/Vm3Q47wObvi5s9sbbiOXoViHnfdGL2nJmJefMu703bXappMmG.',
      name: '赵子豪',
      avatar: '赵',
      avatarColor: COLORS.cyan,
      position: '后端架构师',
      bio: '分布式系统和微服务架构设计经验。',
      skills: ['Go', 'Java', 'Kubernetes', '微服务', '数据库优化', 'Redis'],
      domain: 'tech',
      collabScore: 4.9,
      projects: 20,
    },
    ]),
  );

  const [u1, u2, u3, u4] = others;

  const reqs = asMany(
    await Requirement.insertMany([
    {
      title: 'AI 驱动的智能项目管理平台',
      author: main._id,
      status: 'open',
      visibility: 'public',
      domain: 'tech',
      skills: ['React', 'Node.js', 'AI/ML', 'UI设计', 'Product'],
      keywords: ['React', 'Node.js', 'AI', '项目管理', 'SaaS', 'UI'],
      background: '当前市场上项目管理工具功能繁杂但缺乏智能化。',
      goal: '打造面向中小型技术团队的 AI 项目管理工具。',
      timeline: '3-6 个月',
      outcome: '完成 MVP 并上线，目标 1000 注册用户',
      desc: '希望找到有 React + Node.js 开发经验的工程师和设计师。',
      matchProgress: 72,
    },
    {
      title: '医疗影像 AI 辅助诊断系统',
      author: u2._id,
      status: 'open',
      visibility: 'public',
      domain: 'tech',
      skills: ['Python', 'PyTorch', 'CV', '医疗数据', 'React'],
      keywords: ['Python', 'CV', '医疗', 'AI', 'PyTorch'],
      background: '基层医院影像科医生资源匮乏。',
      goal: '训练医疗影像识别模型，搭建 Web 端辅助诊断界面。',
      timeline: '6-12 个月',
      outcome: '完成核心模型并在至少 2 家医院试点',
      desc: '需要计算机视觉专家、医疗数据专家和前端开发者。',
      matchProgress: 45,
    },
    {
      title: '开源低代码表单生成器',
      author: u3._id,
      status: 'open',
      visibility: 'public',
      domain: 'tech',
      skills: ['Vue', 'React', 'TypeScript', 'UI设计', '开源'],
      keywords: ['Vue', 'React', 'TypeScript', '低代码', '开源', '组件库'],
      background: '社区缺少轻量、可嵌入的表单引擎。',
      goal: '打造可发布到 npm 的表单生成器组件库。',
      timeline: '2-4 个月',
      outcome: 'GitHub 500+ Star，发布 1.0 稳定版',
      desc: '期望找到 Vue 或 React 组件库开发经验的工程师。',
      matchProgress: 88,
    },
    {
      title: '新消费品牌 DTC 电商平台',
      author: u4._id,
      status: 'open',
      visibility: 'public',
      domain: 'business',
      skills: ['React', '后端开发', 'UI设计', '营销', '数据分析'],
      keywords: ['React', '电商', '支付', '营销', '设计', '数据'],
      background: '新消费品牌急需自建 DTC 官网和电商系统。',
      goal: '搭建具备商品管理、支付、会员体系的 DTC 平台。',
      timeline: '4-6 个月',
      outcome: '上线后 3 个月 GMV 突破 100 万',
      desc: '有电商或支付系统开发经验的工程师优先。',
      matchProgress: 33,
    },
    {
      title: '程序员副业知识变现社区',
      author: u1._id,
      status: 'open',
      visibility: 'public',
      domain: 'education',
      skills: ['React', 'Node.js', 'Python', '产品设计', '运营'],
      keywords: ['React', 'Node.js', '社区', '知识变现', '产品', '运营'],
      background: '程序员缺乏变现渠道。',
      goal: '打造知识付费 + 副业孵化社区平台。',
      timeline: '5-8 个月',
      outcome: '上线 3 个月达到 5000 注册用户',
      desc: '需要全栈工程师、产品设计师和运营伙伴。',
      matchProgress: 60,
    },
    ]),
  );

  const [r1, , r3] = reqs;

  await Group.insertMany([
    {
      name: 'AI 项目管理团队',
      emoji: '🚀',
      avatarColor: COLORS.purple,
      desc: '共同打造下一代 AI 项目管理工具',
      reqId: r1._id,
      members: [main._id, u1._id, u3._id],
      messages: [
        {
          user: u3._id,
          type: 'text',
          content: '大家好！很高兴加入这个项目团队。',
          time: new Date(),
        },
        {
          user: main._id,
          type: 'text',
          content: '完全同意，Vite 现在已经是标配了。',
          time: new Date(),
        },
      ],
    },
    {
      name: '低代码表单组',
      emoji: 'wrench',
      avatarColor: COLORS.blue,
      desc: '构建下一代开源低代码表单引擎',
      reqId: r3._id,
      members: [main._id, u3._id, u2._id],
      messages: [
        {
          user: u3._id,
          type: 'text',
          content: '项目仓库已经初始化好了，用的 monorepo + pnpm workspace。',
          time: new Date(),
        },
      ],
    },
  ]);

  await Conversation.create({
    userId: main._id,
    title: '默认对话',
    domain: 'tech',
    messages: [
      {
        role: 'ai',
        content:
          '嗨！我是 CollAI\n\n告诉我你的项目想法，我来帮你：\n• 整理成结构化需求\n• 匹配合适的协作者\n• 发布到需求广场\n\n直接说你想做什么就行！',
        time: new Date(),
      },
    ],
  });

  console.log('[seed] done. Demo login: email yunfan@collabmatch.app, password demo123456');
}

/** 为已有用户补充 email 和 passwordHash（手机登录迁移到邮箱登录） */
const DEMO_EMAIL_MAP: Record<string, { email: string; name: string }> = {
  '13800000000': { email: 'yunfan@collabmatch.app', name: '李云帆' },
  '13800000001': { email: 'xiaowei@collabmatch.app', name: '陈晓薇' },
  '13800000002': { email: 'zhanglei@collabmatch.app', name: '张磊' },
  '13800000003': { email: 'siyuan@collabmatch.app', name: '王思远' },
  '13800000004': { email: 'liufang@collabmatch.app', name: '刘芳' },
  '13800000005': { email: 'zihao@collabmatch.app', name: '赵子豪' },
};

async function backfillEmailAuth(): Promise<void> {
  const users = await User.find({ email: { $exists: false } });
  if (users.length === 0) return;
  const passwordHash = '$2b$10$Ph/Vm3Q47wObvi5s9sbbiOXoViHnfdGL2nJmJefMu703bXappMmG.'; // demo123456
  let updated = 0;
  for (const u of users) {
    const mapping = DEMO_EMAIL_MAP[u.phone];
    if (mapping) {
      u.email = mapping.email;
      u.passwordHash = passwordHash;
      await u.save();
      updated++;
    }
  }
  if (updated > 0) {
    console.log(`[seed] backfilled email/passwordHash for ${updated} users`);
  }
}
