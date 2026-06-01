const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'index.html');
let html = fs.readFileSync(target, 'utf8');

const DOMAINS_BLOCK = `const DOMAINS = {
  tech: { name: '💻 技术开发', icon: '💻', color: '#8b5cf6',
    skills: ['React','Vue','Node.js','Python','Go','TypeScript','Java','Docker','Kubernetes','AI/ML','NLP','后端开发','前端开发','全栈开发','区块链','推荐算法','算法'],
    templates: [
      ['Side Project', '我想做一个 AI 工具 Side Project，缺一位会 React 的全栈联创，每周可投入 10 小时'],
      ['开源协作', '我有一个开源项目，需要前端贡献者和文档维护者'],
      ['SaaS 联创', '已有 MVP idea，寻找技术合伙人一起做 B2B SaaS'],
    ],
    chatIntro: '描述你的 Side Project 或开源计划，AI 帮你整理联创需求并匹配合适的工程师'
  },
  design: { name: '🎨 创意设计', icon: '🎨', color: '#f59e0b',
    skills: ['Figma','UI设计','UX研究','品牌视觉','插画','动画','3D','Framer','设计系统'],
    templates: [
      ['品牌设计', '寻找设计师一起做一套品牌 VI 系统'],
      ['插画合作', '找插画师合作出版绘本项目'],
      ['设计系统', '需要 UI 设计师共建组件库设计规范'],
    ],
    chatIntro: '描述你的创意项目，AI 帮你整理需求并匹配设计师、插画师等创意人才'
  },
  content: { name: '📝 内容创作', icon: '📝', color: '#22c55e',
    skills: ['写作','视频剪辑','播客','自媒体运营','编辑','新媒体','摄影','内容策划'],
    templates: [
      ['播客制作', '想找一个搭档一起做科技类播客节目'],
      ['视频创作', '组建视频创作团队做知识类短视频'],
      ['专栏合作', '寻找作者合作撰写专栏或电子书'],
    ],
    chatIntro: '描述你的内容创作方向，AI 帮你整理需求并匹配创作者、编辑、运营伙伴'
  },
  education: { name: '🎓 教育培训', icon: '🎓', color: '#3b82f6',
    skills: ['课程设计','教学设计','知识付费','培训','教育科技','教研','辅导'],
    templates: [
      ['课程共创', '寻找学科专家一起开发在线课程'],
      ['教育工具', '需要教育行业经验的产品经理合作'],
      ['知识社区', '想组建教育知识分享社区团队'],
    ],
    chatIntro: '描述你的教育项目或教学需求，AI 帮你整理并匹配教育行业伙伴'
  },
  business: { name: '📈 商业合作', icon: '📈', color: '#ef4444',
    skills: ['市场营销','BD','融资','数据分析','运营','产品管理','PRD撰写','商业模式','供应链'],
    templates: [
      ['技术联创', '有产品 idea，寻找技术合伙人一起创业，每周可投入 10-15 小时'],
      ['运营联创', 'Side Project 已有 MVP，需要运营合伙人一起做增长'],
      ['商业合伙', '项目已有原型，寻找商业合伙人负责市场和融资'],
    ],
    chatIntro: '描述你的创业 Side Project，AI 帮你整理需求并匹配技术或商业联创伙伴'
  },
};`;

const SKILLS_BLOCK = `const SKILLS = {
  generate_prd: { icon: '📋', name: '生成需求文档', desktop: '将用户的描述整理为结构化需求文档', instruct: '请把用户刚才描述的内容整理成结构化需求文档。输出格式：标题、项目背景、核心目标、所需技能、预期时间线、预期成果。', category: 'official', author: 'CollabAI', tags: ['文档','需求'], installs: 12580, version: '1.3' },
  diagnose:     { icon: '🎯', name: '诊断需求',     desktop: '从市场/技术/资源三维度分析可行性', instruct: '请从市场可行性、技术难度、资源需求三个维度诊断用户刚才描述的需求，指出潜在风险和被忽略的关键点，给出务实建议。', category: 'official', author: 'CollabAI', tags: ['诊断','分析'], installs: 9820, version: '1.2' },
  optimize:     { icon: '✨', name: '优化描述',     desktop: '让需求描述更吸引协作者', instruct: '请优化用户刚才的需求描述，使其更吸引潜在协作者。突出：项目亮点、为什么值得参与、合作能获得什么。保持简洁有力。', category: 'official', author: 'CollabAI', tags: ['优化','文案'], installs: 8640, version: '1.1' },
  estimate:     { icon: '⏱️', name: '估算周期',     desktop: '给项目阶段划分和时间估算', instruct: '请根据用户描述的项目需求，给出分阶段的周期估算。拆成 MVP/核心功能/上线/迭代四个阶段，每个阶段给时间范围和关键交付物。', category: 'official', author: 'CollabAI', tags: ['周期','规划'], installs: 7200, version: '1.0' },
  invite:       { icon: '📨', name: '生成邀请文案', desktop: '为匹配到的协作者生成个性化邀请', instruct: '请基于当前需求和匹配到的协作者信息，生成一段自然、真诚的协作邀请文案。包含：项目简介、为什么选对方、合作模式建议。', category: 'official', author: 'CollabAI', tags: ['邀请','协作'], installs: 6100, version: '1.0' },
  summary:      { icon: '📊', name: '协作周报',     desktop: '自动总结群组近期讨论内容', instruct: '请总结当前群组最近的讨论要点。按以下结构：本周进展、关键决策、待解决问题、下周计划。如果讨论内容不足，告知无法总结。', category: 'official', author: 'CollabAI', tags: ['周报','总结'], installs: 5400, version: '1.0' },
  generate_ui:  { icon: '🖼️', name: '生成 UI 原型', desktop: '根据描述生成可交互的产品界面原型', instruct: '...', category: 'official', author: 'CollabAI', tags: ['原型','UI','设计'], installs: 4300, version: '1.0' },
  swot:         { icon: '🔍', name: 'SWOT 分析',    desktop: '竞品SWOT分析矩阵',       instruct: '...', category: 'community', author: '策略大师', tags: ['分析','竞品','商业'],   installs: 3200, version: '1.0' },
  roadmap:      { icon: '🗺️', name: '产品路线图',   desktop: '生成分阶段产品路线图',   instruct: '...', category: 'community', author: 'PM助手',   tags: ['规划','产品','路线图'], installs: 1800, version: '1.0' },
};`;

const WORKFLOWS_BLOCK = `const WORKFLOWS = [
  {
    id: 'wf1', name: '🚀 Side Project 组队', desc: '从 idea 到联创团队：整理需求 → 匹配伙伴 → 发布联创广场',
    steps: [
      { skill: 'generate_prd', icon: '📋', title: '生成需求文档' },
      { skill: 'diagnose',     icon: '🎯', title: '诊断需求可行性' },
      { skill: 'optimize',     icon: '✨', title: '优化需求描述' },
      { skill: 'invite',       icon: '📨', title: '生成邀请文案' },
    ],
    tags: ['完整流程', '推荐']
  },
  {
    id: 'wf2', name: '🎨 原型生成器', desc: '需求描述 → UI 原型 → 迭代优化',
    steps: [
      { skill: 'generate_prd', icon: '📋', title: '整理需求' },
      { skill: 'generate_ui',  icon: '🖼️', title: '生成 UI 原型' },
    ],
    tags: ['设计', '快速原型']
  },
  {
    id: 'wf3', name: '📊 项目体检', desc: '多维度评估项目 + 优化 + 重新匹配',
    steps: [
      { skill: 'diagnose',  icon: '🎯', title: '诊断评估' },
      { skill: 'optimize',  icon: '✨', title: '优化描述' },
      { skill: 'swot',      icon: '🔍', title: 'SWOT 分析' },
    ],
    tags: ['评估', '优化']
  },
];`;

function replaceBlock(name, startMarker, endMarker, replacement) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    console.warn('skip block', name, start, end);
    return;
  }
  html = html.slice(0, start) + replacement + html.slice(end);
  console.log('replaced', name);
}

replaceBlock('DOMAINS', 'const DOMAINS = {', '};', DOMAINS_BLOCK);
replaceBlock('SKILLS', 'const SKILLS = {', '};', SKILLS_BLOCK);
replaceBlock('WORKFLOWS', 'const WORKFLOWS = [', '];', WORKFLOWS_BLOCK);

// Remove duplicate mobile bar outside #app
html = html.replace(/\n\s*<!-- Mobile bottom bar -->[\s\S]*?<\/motion><!-- end #app -->/m, '\n</div><!-- end #app -->');
html = html.replace(/\n\s*<!-- Mobile bottom bar -->[\s\S]*?<\/motion>\s*<!-- end #app -->/m, '\n</div><!-- end #app -->');
html = html.replace(/\n\s*<!-- Mobile bottom bar -->\s*<div class="mobile-bar" id="mobile-bar">[\s\S]*?<\/div>\s*(<\/div><!-- end #app -->)/, '\n$1');

// Fix broken closing tags missing '<'
html = html.replace(/([^<])(\/(motion|div|label|button|span|p|h2|h3|option)>)/g, (m, ch, tag) => {
  if (ch === '"' || ch === "'" || ch === '>' || ch === '/' || ch === '=') return m;
  return `</${tag.slice(1)}`;
});

// Fix broken attributes: placeholder/title ending without quote before style/onclick
html = html.replace(/(placeholder="[^"]*?) style="/g, '$1" style="');
html = html.replace(/(title="[^"]*?) onclick="/g, '$1" onclick="');
html = html.replace(/ rows="2"/g, '" rows="2"');

// Explicit high-value fixes
const fixes = [
  ['加载中 /div>', '加载中…</div>'],
  ['加载中…</div>', '加载中…</div>'],
  ['Side Project 联创  说一个项目，找到一起做的伙伀/p>', 'Side Project 联创 — 说一个项目，找到一起做的伙伴</p>'],
  ['手机叀/label>', '手机号</label>'],
  ['验证砀/label>', '验证码</label>'],
  ['获取验证砀/button>', '获取验证码</button>'],
  ['需求详惀/span>', '需求详情</span>'],
  ['发送协作邀诀/span>', '发送协作邀请</span>'],
  ['发布需汀/span>', '发布需求</span>'],
  ['创建自定义技胀/span>', '创建自定义技能</span>'],
  ['技能名秀/label>', '技能名称</label>'],
  ['简什/label>', '简介</label>'],
  ['创建并安裀/button>', '创建并安装</button>'],
  ['选择技能（按顺序）＀/motion>', '选择技能（按顺序）：</div>'],
  ['流程预览＀/motion>', '流程预览：</div>'],
  ['流程预览：</div>', '流程预览：</div>'],
  ['创建工作浀/button>', '创建工作流</button>'],
  ['⚀技能市圀/span>', '⚡ 技能市场</span>'],
  ['搜索技胀..', '搜索技能..'],
  ['🔄 工作浀/span>', '🔄 工作流</span>'],
  ['转发到对诀/span>', '转发到对话</span>'],
  ['<span class="nav-icon">⚀/span>', '<span class="nav-icon">⚡</span>'],
  ['<span class="nav-label">技能市圀/span>', '<span class="nav-label">技能市场</span>'],
  ['">杀/div>', '">李</div>'],
  ['李云帀/div>', '李云帆</div>'],
  ['李云帆</div>', '李云帆</div>'],
  ['退出登彀/button>', '退出登录</button>'],
  ['Side Project 联创助手  整理需求、匹配伙伴、一键组阀/div>', 'Side Project 联创助手 — 整理需求、匹配伙伴、一键组队</div>'],
  ['placeholder="例如：我想做一一AI 工具 Side Project，缺一位会 React 的联创，每周可投兀10 小时  rows="2"', 'placeholder="例如：我想做一个 AI 工具 Side Project，缺一位会 React 的联创，每周可投入 10 小时…" rows="2"'],
  ['title="AI 技胀 onclick="toggleSkillPanel()">⚀/button>', 'title="AI 技能" onclick="toggleSkillPanel()">⚡</button>'],
  ['title="发送文什 onclick="sendChatFile()">📎</button>', 'title="发送文件" onclick="sendChatFile()">📎</button>'],
  ['💬 对话与需�?', '💬 对话与需求'],
  ['showToast(\'视频会议已创�?, \'success\')', "showToast('视频会议已创建', 'success')"],
  ['✀/button>', '✕</button>'],
  ['◀在线', '● 在线'],
  ['filterSkillCat(\'沟�?,this)', "filterSkillCat('沟通',this)"],
  ['💬 沟�?/span>', '💬 沟通</span>'],
  ['编辑精�?/h3>', '编辑精选</h3>'],
  ['查看更多 �?/span>', '查看更多 →</span>'],
];
for (const [from, to] of fixes) {
  html = html.split(from).join(to);
}

// Fix remaining broken showToast / strings ending with wrong char before comma-quote
html = html.replace(/showToast\('([^']*?)�?, '/g, "showToast('$1', '");
html = html.replace(/showToast\('([^']*?)�?, '/g, "showToast('$1', '");

fs.writeFileSync(target, html, 'utf8');

const script = html.split('<script>').pop().split('</script>')[0];
try {
  new Function(script);
  console.log('JS parse OK');
} catch (e) {
  console.log('JS parse FAIL:', e.message);
  const lines = script.split('\n');
  for (let i = 0; i < lines.length; i++) {
    try {
      new Function(lines.slice(0, i + 1).join('\n'));
    } catch (err) {
      if (/Invalid|Unexpected|Unterminated/.test(err.message)) {
        console.log('near line', i + 1, lines[i].slice(0, 120));
        break;
      }
    }
  }
}

console.log('written', target);

