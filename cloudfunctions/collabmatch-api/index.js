const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const $ = db.command;
const JWT_SECRET = process.env.JWT_SECRET || 'c7f3a8e2b1d4f6a9c3e5b7d9f1a2c4e6a8b0d2f4a6c8e0b3d5f7a9c1e3b5d7f9';
const DEV_AUTH_CODE = process.env.DEV_AUTH_CODE || 'xsx7ii';

function auth(h) { const t = (h||'').replace('Bearer ',''); if(!t) return null; try { return jwt.verify(t,JWT_SECRET); } catch(e) { return null; } }
function err(msg, code) { return { _status: code||400, error: msg }; }
function addId(d) { if(!d||typeof d!='object') return d; if(d._id&&!d.id) d.id=d._id; return d; }
function addIds(arr) { if(!Array.isArray(arr)) return arr; return arr.map(addId); }

// L-05: MongoDB memory server 不支持持久化索引。生产环境建议在以下集合创建索引：
//   - users: { phone: 1 } unique, { skills: 1 }, { lastSeenAt: -1 }
//   - requirements: { status: 1, visibility: 1, createdAt: -1 }, { author: 1 }, { skills: 1 }
//   - applications: { requirementId: 1, applicant: 1 }, { applicant: 1 }
//   - conversations: { userId: 1, updatedAt: -1 }
//   - groups: { creatorId: 1 }, { 'members.id': 1 }
//   示例: db.collection('users').createIndex({ phone: 1 }, { unique: true })

const R = {}; // routes
function r(m,p,h) { R[m+':'+p]=h; }
// Register both with and without /api prefix (HTTP access service strips /api trigger prefix)
function r2(m,p,h) { R[m+':'+p]=h; if (p.startsWith('/api/')) R[m+':'+p.slice(4)]=h; else if (p==='/api') R[m+':'+'/']=h; }
const G=(p,h)=>r2('GET',p,h); const P=(p,h)=>r2('POST',p,h); const U=(p,h)=>r2('PUT',p,h); const D=(p,h)=>r2('DELETE',p,h);

// ─── Health ─────────────────────────
G('/health', ()=>({ok:true,version:'v3-fix',path:'/'}));
G('/api/health', ()=>({ok:true,version:'v3-fix',path:'/api'}));
const DOMAINS={tech:{key:'tech',name:'💻 技术开发',icon:'💻',color:'#8b7bf7',sceneTags:['项目需求','开源协作'],skills:['React','Vue','Node.js','Python','Go','TypeScript','Java','Docker','Kubernetes','AI/ML','NLP','后端开发','前端开发','全栈开发','区块链','推荐算法','算法'],templates:[{label:'项目协作',text:'我想做一个 AI 工具，缺一位会 React 的全栈开发者，每周可投入 10 小时'},{label:'开源协作',text:'我有一个开源项目，需要前端贡献者和文档维护者'},{label:'SaaS 合伙',text:'已有 MVP idea，寻找技术合伙人一起做 B2B SaaS'}],chatIntro:'描述你的项目或想法，AI 帮你整理需求并匹配合适的工程师'},design:{key:'design',name:'🎨 创意设计',icon:'🎨',color:'#a78bfa',sceneTags:['品牌设计','插画合作','UI/UX'],skills:['Figma','UI设计','UX研究','品牌视觉','插画','动画','3D','Framer','设计系统'],templates:[{label:'品牌设计',text:'寻找设计师一起做一套品牌 VI 系统'},{label:'插画合作',text:'找插画师合作出版绘本项目'},{label:'设计系统',text:'需要 UI 设计师共建组件库设计规范'}],chatIntro:'描述你的创意项目，AI 帮你整理需求并匹配设计师、插画师等创意人才'},content:{key:'content',name:'📝 内容创作',icon:'📝',color:'#7c8cf7',sceneTags:['播客制作','视频创作','专栏合作'],skills:['写作','视频剪辑','播客','自媒体运营','编辑','新媒体','摄影','内容策划'],templates:[{label:'播客制作',text:'想找一个搭档一起做科技类播客节目'},{label:'视频创作',text:'组建视频创作团队做知识类短视频'},{label:'专栏合作',text:'寻找作者合作撰写专栏或电子书'}],chatIntro:'描述你的内容创作方向，AI 帮你整理需求并匹配创作者、编辑、运营伙伴'},education:{key:'education',name:'🎓 教育培训',icon:'🎓',color:'#6bb8c9',sceneTags:['课程共创','教育工具','知识社区'],skills:['课程设计','教学设计','知识付费','培训','教育科技','教研','辅导'],templates:[{label:'课程共创',text:'寻找学科专家一起开发在线课程'},{label:'教育工具',text:'需要教育行业经验的产品经理合作'},{label:'知识社区',text:'想组建教育知识分享社区团队'}],chatIntro:'描述你的教育项目或教学需求，AI 帮你整理并匹配教育行业伙伴'},business:{key:'business',name:'📈 商业合作',icon:'📈',color:'#b07cc7',sceneTags:['技术合伙','运营合伙','融资合作'],skills:['市场营销','BD','融资','数据分析','运营','产品管理','PRD撰写','商业模式','供应链'],templates:[{label:'技术合伙',text:'有产品 idea，寻找技术合伙人一起创业，每周可投入 10-15 小时'},{label:'运营合伙',text:'项目已有 MVP，需要运营合伙人一起做增长'},{label:'商业合伙',text:'项目已有原型，寻找商业合伙人负责市场和融资'}],chatIntro:'描述你的创业项目，AI 帮你整理需求并匹配技术或商业伙伴'},campus:{key:'campus',name:'🏫 校园生活',icon:'🏫',color:'#7cc4a8',sceneTags:['跑腿互助','拼单拼车','组局活动','技能交换','课程项目'],skills:['代拿快递','拼外卖','拼车','二手交易','课程组队','比赛组队','论文互助','PPT制作','运动搭子','桌游','徒步','摄影','吉他','编程','设计'],templates:[{label:'代拿快递',text:'求人帮忙拿个快递，菜鸟驿站，今天18点前，有偿3元'},{label:'拼外卖',text:'有人一起拼外卖吗？想点XX家，凑满减'},{label:'周末组局',text:'周末想去徒步/打羽毛球/玩桌游，找人一起'},{label:'技能交换',text:'我会Python，想找人教我吉他/帮我做PPT'},{label:'课程组队',text:'期末大作业需要组队，缺一个会前端的'}],chatIntro:'说说你需要什么帮忙，或者想找什么搭子，AI 帮你匹配'}};

const SKILLS={generate_prd:{id:'generate_prd',icon:'📋',name:'生成需求文档',desktop:'将用户的描述整理为结构化需求文档',instruct:'请把用户刚才描述的内容整理成结构化需求文档。输出格式：标题、项目背景、核心目标、所需技能、预期时间线、预期成果。',category:'official',author:'CollabAI',tags:['文档','需求'],installs:12580,version:'1.3',isInstallable:!0},diagnose:{id:'diagnose',icon:'🎯',name:'诊断需求',desktop:'从市场/技术/资源三维度分析可行性',instruct:'请从市场可行性、技术难度、资源需求三个维度诊断用户刚才描述的需求，指出潜在风险和被忽略的关键点，给出务实建议。',category:'official',author:'CollabAI',tags:['诊断','分析'],installs:9820,version:'1.2',isInstallable:!0},optimize:{id:'optimize',icon:'✨',name:'优化描述',desktop:'让需求描述更吸引协作者',instruct:'请优化用户刚才的需求描述，使其更吸引潜在协作者。突出：项目亮点、为什么值得参与、合作能获得什么。保持简洁有力。',category:'official',author:'CollabAI',tags:['优化','文案'],installs:8640,version:'1.1',isInstallable:!0},estimate:{id:'estimate',icon:'⏱️',name:'估算周期',desktop:'给项目阶段划分和时间估算',instruct:'请根据用户描述的项目需求，给出分阶段的周期估算。拆成 MVP/核心功能/上线/迭代四个阶段，每个阶段给时间范围和关键交付物。',category:'official',author:'CollabAI',tags:['周期','规划'],installs:7200,version:'1.0',isInstallable:!0},invite:{id:'invite',icon:'📨',name:'生成邀请文案',desktop:'为匹配到的协作者生成个性化邀请',instruct:'请基于当前需求和匹配到的协作者信息，生成一段自然、真诚的协作邀请文案。包含：项目简介、为什么选对方、合作模式建议。',category:'official',author:'CollabAI',tags:['邀请','协作'],installs:6100,version:'1.0',isInstallable:!0},summary:{id:'summary',icon:'📊',name:'协作周报',desktop:'自动总结群组近期讨论内容',instruct:'请总结当前群组最近的讨论要点。按以下结构：本周进展、关键决策、待解决问题、下周计划。如果讨论内容不足，告知无法总结。',category:'official',author:'CollabAI',tags:['周报','总结'],installs:5400,version:'1.0',isInstallable:!0},generate_ui:{id:'generate_ui',icon:'🖼️',name:'生成 UI 原型',desktop:'根据描述生成可交互的产品界面原型',instruct:'请根据用户描述的产品需求，输出 UI 原型方案：页面结构、核心组件、交互流程、设计建议（配色与布局）。用 Markdown 分节描述，便于设计师落地。',category:'official',author:'CollabAI',tags:['原型','UI','设计'],installs:4300,version:'1.0',isInstallable:!0},swot:{id:'swot',icon:'🔍',name:'SWOT 分析',desktop:'竞品 SWOT 分析矩阵',instruct:'请对用户描述的项目做 SWOT 分析，按优势、劣势、机会、威胁四象限输出，每条 2-4 点，并给出 1-2 条战略建议。',category:'community',author:'策略大师',tags:['分析','竞品','商业'],installs:3200,version:'1.0',isInstallable:!0},roadmap:{id:'roadmap',icon:'🗺️',name:'产品路线图',desktop:'生成分阶段产品路线图',instruct:'请根据用户需求生成分阶段产品路线图：里程碑、时间范围、关键交付物、依赖关系。用表格或列表呈现。',category:'community',author:'PM助手',tags:['规划','产品','路线图'],installs:1800,version:'1.0',isInstallable:!0}};

const DOMAIN_SKILL_MAP={tech:['generate_prd','diagnose','optimize','estimate','invite','summary','generate_ui'],design:['generate_prd','diagnose','optimize','estimate','invite','generate_ui'],content:['generate_prd','diagnose','optimize','invite','generate_ui'],education:['generate_prd','diagnose','optimize','estimate','invite','generate_ui'],business:['generate_prd','diagnose','optimize','estimate','invite','generate_ui'],campus:['generate_prd','diagnose','optimize','invite']};

const WORKFLOWS=[{id:'wf1',name:'🚀 从想法到团队',desc:'完整流程：梳理需求 → 匹配协作者 → 组队开始协作',steps:[{skillId:'generate_prd',icon:'📋',title:'生成需求文档'},{skillId:'diagnose',icon:'🎯',title:'诊断需求可行性'},{skillId:'optimize',icon:'✨',title:'优化需求描述'},{skillId:'invite',icon:'📨',title:'生成邀请文案'},{action:'match_forward',skillId:'__action_match_forward__',icon:'🔍',title:'智能匹配协作者'}],tags:['完整流程','推荐']},{id:'wf2',name:'🎨 原型生成器',desc:'需求描述 → UI 原型 → 迭代优化',steps:[{skillId:'generate_prd',icon:'📋',title:'整理需求'},{skillId:'generate_ui',icon:'🖼️',title:'生成 UI 原型'}],tags:['设计','快速原型']},{id:'wf3',name:'📊 项目体检',desc:'多维度评估项目 + 优化 + 重新匹配',steps:[{skillId:'diagnose',icon:'🎯',title:'诊断评估'},{skillId:'optimize',icon:'✨',title:'优化描述'},{skillId:'swot',icon:'🔍',title:'SWOT 分析'}],tags:['评估','优化']}];

G('/api/config', ()=>({authMode:'dev',devAuthCode:DEV_AUTH_CODE,domains:{tech:{id:'tech',name:'💻 技术开发',icon:'💻'},design:{id:'design',name:'🎨 创意设计',icon:'🎨'},content:{id:'content',name:'✍️ 内容创作',icon:'✍️'},education:{id:'education',name:'📚 知识教育',icon:'📚'},business:{id:'business',name:'💼 商业运营',icon:'💼'},campus:{id:'campus',name:'🏫 校园生活',icon:'🏫'}}}));
G('/api/config/domains', ()=>DOMAINS);
G('/api/config/skills', ()=>({skills:SKILLS,domainSkillMap:DOMAIN_SKILL_MAP}));
G('/api/config/workflows', ()=>WORKFLOWS);

// ─── Auth ───────────────────────────
G('/api/auth/config', ()=>{
  const githubEnabled = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  return {mode:'dev',emailAuthEnabled:true,githubEnabled};
});
P('/api/auth/sms/send', ()=>({ok:true}));
P('/api/auth/send-code', ()=>({ok:true}));
P('/api/auth/login', async (p,b)=>{
  const {phone,code}=b;
  if(code!==DEV_AUTH_CODE) return err('验证码错误');
  let u=await db.collection('users').where({phone}).limit(1).get();
  if(!u.data.length){ const r=await db.collection('users').add({phone,name:'用户'+phone.slice(-4),skills:[],position:'',createdAt:Date.now()}); u={data:[{_id:r.id,phone,name:'用户'+phone.slice(-4),skills:[],position:''}]}; }
  const token=jwt.sign({userId:u.data[0]._id},JWT_SECRET,{expiresIn:'7d'});
  const user={...u.data[0], id:u.data[0]._id};
  return {token,user};
});
P('/api/auth/register', async (p,b)=>{
  const {email,password,name}=b;
  if(!email||!password||!name) return err('需要 email、password 和 name');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('邮箱格式不正确');
  if(password.length<6) return err('密码长度至少 6 位');
  const existing=await db.collection('users').where({email}).limit(1).get();
  if(existing.data.length) return err('该邮箱已注册',409);
  const passwordHash=await bcrypt.hash(password,10);
  const r=await db.collection('users').add({email,passwordHash,name,avatar:name[0]||'用',skills:[],position:'',domain:'tech',collabScore:null,projects:0,resources:[],portfolio:[],createdAt:Date.now(),updatedAt:Date.now()});
  const token=jwt.sign({userId:r.id},JWT_SECRET,{expiresIn:'7d'});
  const user={_id:r.id,id:r.id,email,name,avatar:name[0]||'用',skills:[],position:'',domain:'tech'};
  return {token,user};
});
P('/api/auth/email-login', async (p,b)=>{
  const {email,password}=b;
  if(!email||!password) return err('需要 email 和 password');
  const u=await db.collection('users').where({email}).limit(1).get();
  if(!u.data.length||!u.data[0].passwordHash) return err('邮箱或密码错误',401);
  const match=await bcrypt.compare(password,u.data[0].passwordHash);
  if(!match) return err('邮箱或密码错误',401);
  await db.collection('users').doc(u.data[0]._id).update({lastSeenAt:Date.now()});
  const token=jwt.sign({userId:u.data[0]._id},JWT_SECRET,{expiresIn:'7d'});
  const user={...u.data[0],id:u.data[0]._id};
  return {token,user};
});
G('/api/auth/me', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); const user=addId(d.data[0]||{}); return {user}; });

// ─── GitHub OAuth ───────────────────
G('/api/auth/github', async(p,b,q)=>{
  const clientId = process.env.GITHUB_CLIENT_ID;
  if(!clientId) return err('未配置 GitHub OAuth',400);
  const callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL || `https://${q.headers.host}/api/auth/github/callback`;
  const redirectUri = encodeURIComponent(callbackUrl);
  return {_redirect: `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`};
});
G('/api/auth/github/callback', async(p,b,q)=>{
  const code = q.code;
  if(!code) return err('缺少授权码',400);
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if(!clientId||!clientSecret) return err('未配置 GitHub OAuth',400);
  // 换取 access_token
  let tokenData;
  try {
    const https = require('https');
    tokenData = await new Promise((resolve, reject) => {
      const req = https.request('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Accept':'application/json'},
      }, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
      });
      req.on('error', reject);
      req.write(JSON.stringify({client_id:clientId,client_secret:clientSecret,code}));
      req.end();
    });
  } catch(e) { return err('GitHub token exchange failed',500); }
  const accessToken = tokenData.access_token;
  if(!accessToken) return err('GitHub 授权失败',401);
  // 获取用户信息
  let ghUser;
  try {
    const https = require('https');
    ghUser = await new Promise((resolve, reject) => {
      const req = https.request('https://api.github.com/user', {
        headers: {'Authorization':`Bearer ${accessToken}`,'Accept':'application/json','User-Agent':'CollabMatch'},
      }, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
      });
      req.on('error', reject);
      req.end();
    });
  } catch(e) { return err('获取 GitHub 用户信息失败',401); }
  if(!ghUser.id) return err('获取 GitHub 用户信息失败',401);
  // 获取邮箱
  let email = ghUser.email || '';
  if(!email) {
    try {
      const https = require('https');
      const emails = await new Promise((resolve, reject) => {
        const req = https.request('https://api.github.com/user/emails', {
          headers: {'Authorization':`Bearer ${accessToken}`,'Accept':'application/json','User-Agent':'CollabMatch'},
        }, res => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
        });
        req.on('error', reject);
        req.end();
      });
      const primary = (Array.isArray(emails) ? emails : []).find(e => e.primary && e.verified);
      if(primary) email = primary.email;
    } catch(e) {}
  }
  const githubId = String(ghUser.id);
  const name = ghUser.name || ghUser.login || `GitHub${ghUser.id}`;
  const avatarUrl = ghUser.avatar_url || '';
  // 查找或创建用户
  let u = await db.collection('users').where({githubId}).limit(1).get();
  if(!u.data.length && email) {
    u = await db.collection('users').where({email}).limit(1).get();
    if(u.data.length) {
      await db.collection('users').doc(u.data[0]._id).update({githubId, avatarUrl: avatarUrl||undefined});
    }
  }
  if(!u.data.length) {
    const r = await db.collection('users').add({
      email: email || `gh${githubId}@github.placeholder`,
      name, avatar: name[0]||'G', avatarUrl, githubId,
      skills:[], position:'', domain:'tech', collabScore:null, projects:0,
      resources:[], portfolio:[], createdAt:Date.now(), updatedAt:Date.now()
    });
    u = {data:[{_id:r.id, email: email || `gh${githubId}@github.placeholder`, name, avatar: name[0]||'G', avatarUrl, githubId, skills:[], position:'', domain:'tech'}]};
  }
  await db.collection('users').doc(u.data[0]._id).update({lastSeenAt:Date.now()});
  const token = jwt.sign({userId:u.data[0]._id},JWT_SECRET,{expiresIn:'7d'});
  const frontendUrl = process.env.GITHUB_OAUTH_CALLBACK_URL ? new URL(process.env.GITHUB_OAUTH_CALLBACK_URL).origin : `https://${q.headers.host}`;
  return {_redirect: `${frontendUrl}/?github_token=${token}#/`};
});

// ─── Users ──────────────────────────
G('/api/users', async()=>{ const r=await db.collection('users').limit(50).get(); const items=addIds(r.data); return {items,total:items.length}; });
G('/api/users/:id', async(p)=>{ const d=await db.collection('users').doc(p.id).get(); return addId(d.data[0])||{}; });
U('/api/users/me', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('users').doc(u.userId).update({...b,updatedAt:Date.now()}); return {ok:true}; });
G('/api/users/me/portfolio', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); return (addId(d.data[0])||{}).portfolio||[]; });
P('/api/users/me/portfolio', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const ud=await db.collection('users').doc(u.userId).get(); const items=(addId(ud.data[0])||{}).portfolio||[]; items.push({...b,id:Date.now().toString(),createdAt:Date.now()}); await db.collection('users').doc(u.userId).update({portfolio:items,updatedAt:Date.now()}); return {ok:true}; });
U('/api/users/me/portfolio/:itemId', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const ud=await db.collection('users').doc(u.userId).get(); const items=(addId(ud.data[0])||{}).portfolio||[]; const idx=items.findIndex(i=>i.id===p.itemId); if(idx>=0){ items[idx]={...items[idx],...b}; await db.collection('users').doc(u.userId).update({portfolio:items,updatedAt:Date.now()}); } return {ok:true}; });
D('/api/users/me/portfolio/:itemId', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const ud=await db.collection('users').doc(u.userId).get(); const items=((addId(ud.data[0])||{}).portfolio||[]).filter(i=>i.id!==p.itemId); await db.collection('users').doc(u.userId).update({portfolio:items,updatedAt:Date.now()}); return {ok:true}; });
G('/api/users/me/applications', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('applications').where({applicant:u.userId}).get(); const items=addIds(r.data); return {items,total:items.length}; });
P('/api/users/me/presence', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('users').doc(u.userId).update({lastSeenAt:Date.now()}); return {ok:true}; });

// ─── Requirements ───────────────────
G('/api/requirements', async(p,b,q)=>{
  let col=db.collection('requirements');
  if(q.search){ col=col.where({title: db.RegExp({regexp:q.search||'',options:'i'})}); } else { col=col.where({status:'open',visibility:'public'}); }
  const r=await col.orderBy('createdAt','desc').limit(Number(q.limit)||20).get();
  const items=addIds(r.data); return {items,total:items.length};
});
G('/api/requirements/mine', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('requirements').where({author:u.userId}).orderBy('createdAt','desc').get(); const items=addIds(r.data); return {items,total:items.length}; });
P('/api/requirements', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={...b,author:u.userId,status:'draft','visibility':'public',skills:b.skills||[],matchProgress:0,background:b.background||'',goal:b.goal||'',desc:b.desc||'',timeline:b.timeline||'3-6 个月',outcome:b.outcome||'',createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('requirements').add(data); return {requirement:addId({_id:r.id,...data})}; });
G('/api/requirements/:id', async(p)=>{ const r=await db.collection('requirements').doc(p.id).get(); const req=addId(r.data[0]); return req?{requirement:req}:err('Not found',404); });
U('/api/requirements/:id', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('requirements').doc(p.id).update({...b,updatedAt:Date.now()}); return {ok:true}; });
U('/api/requirements/:id/publish', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('requirements').doc(p.id).update({status:'open','visibility':b.visibility||'public',updatedAt:Date.now()}); return {ok:true}; });
U('/api/requirements/:id/apply', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('applications').add({requirementId:p.id,applicant:u.userId,message:b.message||'',status:'pending',createdAt:Date.now()}); return {ok:true}; });
G('/api/requirements/:id/applications', async(p,b,q)=>{ const u=auth(q.headers.authorization); const r=await db.collection('applications').where({requirementId:p.id}).get(); const items=addIds(r.data); return {items,total:items.length}; });
U('/api/requirements/:id/applications/:appId', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('applications').doc(p.appId).update({status:b.status,updatedAt:Date.now()}); return {ok:true}; });
D('/api/requirements/:id', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('requirements').doc(p.id).remove(); return {ok:true}; });

// ─── Match ──────────────────────────
G('/api/match/forward', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('requirements').doc(p.requirementId||q.requirementId).get(); if(!r.data.length) return {items:[],total:0}; const skills=r.data[0].skills||[]; const users=await db.collection('users').limit(50).get(); const scored=users.data.filter(x=>String(x._id)!==u.userId).map(x=>{ const o=(x.skills||[]).filter(s=>skills.includes(s)); return {userId:x._id,name:x.name,avatar:x.avatar,avatarColor:x.avatarColor,avatarUrl:x.avatarUrl,position:x.position,skills:x.skills,matchPct:skills.length?Math.round(o.length/skills.length*100):0,matchedSkills:o}; }); scored.sort((a,b)=>b.matchPct-a.matchPct); const items=scored.slice(0,10); return {items,total:scored.length}; });
G('/api/match/reverse', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const user=await db.collection('users').doc(u.userId).get(); const uSkills=(user.data[0]||{}).skills||[]; const reqs=await db.collection('requirements').where({status:'open'}).limit(50).get(); const scored=reqs.data.filter(r=>String(r.author)!==u.userId).map(r=>{ const o=(r.skills||[]).filter(s=>uSkills.includes(s)); return {id:r._id,title:r.title,skills:r.skills,matchPct:r.skills?.length?Math.round(o.length/r.skills.length*100):0}; }); scored.sort((a,b)=>b.matchPct-a.matchPct); const items=scored.slice(0,10); return {items,total:scored.length}; });

// ─── Groups ─────────────────────────
G('/api/groups', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('groups').get(); const items=addIds(r.data).map(g=>({...g,messages:g.messages||[],members:g.members||[]})); return {items,total:items.length}; });
P('/api/groups', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={name:b.name||'协作群组',creatorId:u.userId,reqId:b.reqId||'',members:[{id:u.userId,name:'',avatar:''}],messages:[],createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('groups').add(data); const group=addId({_id:r.id,...data}); return {group}; });
P('/api/groups/create', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={name:b.name,creatorId:u.userId,members:[{id:u.userId,name:'',avatar:''}],messages:[],createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('groups').add(data); const group=addId({_id:r.id,...data}); return {group}; });
G('/api/groups/:id', async(p)=>{ const r=await db.collection('groups').doc(p.id).get(); const raw=addId(r.data[0]); if(!raw) return err('Not found',404); return {group:{...raw,messages:raw.messages||[],members:raw.members||[]}}; });
P('/api/groups/:id/messages', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const g=await db.collection('groups').doc(p.id).get(); if(!g.data.length) return err('Not found',404); const msgs=g.data[0].messages||[]; msgs.push({userId:u.userId,content:b.text||b.content||'',createdAt:Date.now()}); await db.collection('groups').doc(p.id).update({messages:msgs,updatedAt:Date.now()}); return {ok:true}; });
P('/api/groups/:id/meeting', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); return {meetingUrl:'https://meet.jit.si/collabmatch-'+Date.now()}; });

// ─── AI ──────────────────────────────
P('/api/ai/chat', async(p,b,q)=>{
  const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401);
  const convId=b.conversationId||'';
  const msg=b.message||'';
  const userLlm=b.llmConfig||null;
  if(!convId||!msg) return err('缺少 conversationId 或 message');
  const c=await db.collection('conversations').doc(convId).get();
  if(!c.data.length) return err('对话不存在',404);
  const msgs=c.data[0].messages||[];
  const userMsg={role:'user',content:msg,time:new Date().toISOString()};
  msgs.push(userMsg);
  // ── LLM 接入（用户自定义 > 豆包 > Hermes > 离线） ──
  let reply = '';
  const systemPrompt='你是需求匹配助手。\n职责：理解用户需求，整理成结构化文档，评估可行性，帮找协作者。\n\n## 需求对齐规则\n当用户描述了一个项目想法或需求时，先判断信息是否充分。关键维度：\n1. 做什么 — 项目核心目标\n2. 缺什么 — 需要什么样的协作者\n3. 怎么做 — 协作方式（远程/同城/线下）、时间投入\n\n如果信息不够，先追问再整理。追问时：\n- 一次最多问 2-3 个关键问题，别像审讯\n- 用选择题而非开放式问题，比如"你是想做远程协作还是同城？"\n- 可以给建议，比如"听起来像是个 Side Project，你每周大概能投入多少时间？"\n- 如果用户已经说清楚了大部分，就别追问了，直接整理\n\n只有信息足够时，才生成结构化文档，末尾加一行：<!--REQ:{"title":"...","skills":[],"background":"...","goal":"...","timeline":"3-6 个月","outcome":"..."}-->\n\n说话风格：干脆利落，短句为主，不啰嗦。像聊天不像写报告，别用"首先...其次..."。可以有情绪、有判断。可靠但不死板，偶尔开玩笑。给建议但不push，有自己的主见，敢反对不合理的想法。先处理核心问题，细节看情况补。不确定就直说，不编。中文回复，不超过300字。';
  const chatMsgs=[{role:'system',content:systemPrompt},...msgs.filter(m=>m.role==='user'||m.role==='ai').slice(-6).map(m=>({role:m.role==='ai'?'assistant':'user',content:m.content}))];

  // 优先使用用户自定义模型
  if (userLlm && userLlm.apiKey && userLlm.baseUrl && userLlm.model) {
    try {
      const userRes = await fetch(userLlm.baseUrl.replace(/\/+$/,'') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userLlm.apiKey },
        body: JSON.stringify({ model: userLlm.model, messages: chatMsgs, stream: false, max_tokens: 800 }),
      });
      if (!userRes.ok) {
        const errText = await userRes.text().catch(() => '');
        console.error('[UserLLM] HTTP' + userRes.status + ':', errText.slice(0, 200));
        reply = '[你的模型返回错误（' + userRes.status + '），已回退到平台模型]';
      } else {
        const d = await userRes.json();
        reply = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '[模型没有返回有效回复]';
      }
    } catch(e) {
      console.error('[UserLLM]', e.message);
      reply = '[你的模型连接失败：' + e.message.slice(0, 60) + '，已回退到平台模型]';
    }
    // 如果用户模型成功，直接跳到保存
    if (reply && !reply.startsWith('[')) {
      // success, skip default LLM
    } else {
      reply = ''; // reset to try default
    }
  }

  const doubaoKey = process.env.DOUBAO_API_KEY || '';
  const doubaoModel = process.env.DOUBAO_MODEL || '';
  const doubaoBaseUrl = (process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '');

  if (!reply && doubaoKey && doubaoModel) {
    // 使用豆包 API
    try {
      const doubaoRes = await fetch(doubaoBaseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + doubaoKey,
        },
        body: JSON.stringify({
          model: doubaoModel,
          messages: chatMsgs,
          stream: false,
          max_tokens: 800
        }),
      });
      if (!doubaoRes.ok) {
        const errText = await doubaoRes.text().catch(() => '');
        console.error('[Doubao] HTTP' + doubaoRes.status + ':', errText.slice(0, 200));
        reply = '[AI 服务暂时不可用（错误码 ' + doubaoRes.status + '），请稍后重试。]';
      } else {
        const d = await doubaoRes.json();
        reply = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '[AI 没有返回有效回复，能换个方式描述你的问题？]';
      }
    } catch(e) {
      console.error('[Doubao]', e.message);
      reply = '[AI 服务出错：' + e.message.slice(0, 80) + ']';
    }
  } else if (!reply) {
    // Hermes Agent 回退
    const hermesUrl = (process.env.HERMES_AGENT_URL||'').replace(/\/+$/,'');
    if (hermesUrl) {
      try {
        const hermesRes = await fetch(hermesUrl+'/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (process.env.HERMES_API_KEY||'change-me-local-dev'),
          },
          body: JSON.stringify({
            model: 'hermes-agent',
            messages: chatMsgs,
            stream: false,
            max_tokens: 800
          }),
        });
        if (!hermesRes.ok) {
          const errText = await hermesRes.text().catch(()=>'');
          console.error('[Hermes] HTTP'+hermesRes.status+':', errText.slice(0,200));
          reply = '[AI 服务暂时不可用（错误码 '+hermesRes.status+'），请稍后重试。你也可以直接去需求广场浏览已发布的需求。]';
        } else {
          const d = await hermesRes.json();
          reply = (d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||'[AI 没有返回有效回复，能换个方式描述你的问题吗？]';
        }
      } catch(e) {
        console.error('[Hermes]', e.message);
        if (e.name==='AbortError' || String(e).includes('timeout')) reply = '[AI 响应超时，请稍后重试，或尝试更简洁地描述你的问题。]';
        else if (String(e).includes('ENOTFOUND')||String(e).includes('ECONNREFUSED')) reply = '[无法连接 AI 服务，请确认 Hermes Agent 是否正常运行，并检查云函数环境变量 HERMES_AGENT_URL 是否配置正确。]';
        else reply = '[AI 服务出错：'+e.message.slice(0,80)+']';
      }
    } else {
      reply = '欢迎使用需求匹配！\n\n（当前为离线模式，管理员请在云函数环境变量中配置 DOUBAO_API_KEY 和 DOUBAO_MODEL 以启用 AI 对话功能。）\n\n你可以继续和我对话（离线模式仅返回提示），或者直接去需求广场浏览已发布的需求。';
    }
  }
  const aiMsg={role:'ai',content:reply,time:new Date().toISOString()};
  msgs.push(aiMsg);
  await db.collection('conversations').doc(convId).update({messages:msgs,updatedAt:Date.now()});
  return {message:aiMsg,conversation:{...addId(c.data[0]),messages:msgs},userMessage:userMsg};
});
P('/api/ai/skill', async(p,b,q)=>{
  const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401);
  const skillId=b.skillId||'';
  const skill=SKILLS[skillId];
  if(!skill) return err('技能不存在',404);
  const reply='已执行「'+skill.name+'」：\n\n根据你的需求，我进行了分析并生成以下结果。你可以查看并进一步完善。';
  return {message:{role:'ai',content:reply,time:new Date().toISOString()}};
});

// ─── Conversations ──────────────────
G('/api/conversations', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('conversations').where({userId:u.userId}).orderBy('updatedAt','desc').get(); const items=addIds(r.data); return {items,total:items.length}; });
P('/api/conversations', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={userId:u.userId,title:b.title||'新对话',domain:b.domain||'tech',messages:[{role:'ai',content:'嗨！欢迎来到需求匹配 👋\n\n告诉我你想做什么项目，我来帮你整理需求、匹配协作者。\n\n直接说就行，不用想太多。',time:new Date().toISOString()}],requirementId:b.requirementId||'',createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('conversations').add(data); const conv=addId({_id:r.id,...data}); return {conversation:conv}; });
G('/api/conversations/:id', async(p)=>{ const r=await db.collection('conversations').doc(p.id).get(); const conv=addId(r.data[0]); return conv?{conversation:conv}:err('Not found',404); });
P('/api/conversations/:id', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const c=await db.collection('conversations').doc(p.id).get(); if(!c.data.length) return err('Not found',404); const msgs=c.data[0].messages||[]; msgs.push({role:'user',content:b.text||b.content||'',createdAt:Date.now()}); msgs.push({role:'ai',content:b.text?'收到。关于「'+(b.text||'').slice(0,30)+'」，我来帮你分析。':'收到你的消息。',createdAt:Date.now()}); await db.collection('conversations').doc(p.id).update({messages:msgs,updatedAt:Date.now()}); return {ok:true}; });
D('/api/conversations/:id', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('conversations').doc(p.id).remove(); return {ok:true}; });
P('/api/conversations/:id/forward', async(p,b,q)=>{ return {ok:true,message:'Forwarded'}; });

// ─── Files ──────────────────────────
P('/api/conversations/:id/attachments', async(p,b,q)=>{ const u=auth(q.headers.authorization); return {ok:true,fileUrl:b.fileData||''}; });

// ─── Skills ─────────────────────────
G('/api/skills/market', async()=>{ const items=Object.values(SKILLS).filter(s=>s.isInstallable); return {items,total:items.length}; });
G('/api/skills/:skillId', async(p)=>{ const s=SKILLS[p.skillId]; return s?{skill:s}:err('技能不存在',404); });
G('/api/users/me/skills', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); return (d.data[0]||{}).skillIds||[]; });
P('/api/users/me/skills', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); const ids=((d.data[0]||{}).skillIds||[]).filter(id=>id!==b.skillId); if(b.skillId) ids.push(b.skillId); await db.collection('users').doc(u.userId).update({skillIds:ids,updatedAt:Date.now()}); return {ok:true}; });

// ─── User Skills ─────────────────────
G('/api/user-skills', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); const skills=((d.data[0]||{}).skillIds||[]).map(id=>SKILLS[id]).filter(Boolean); return {skills}; });
P('/api/user-skills', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); return {ok:true}; });
D('/api/user-skills/:skillId', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); const ids=((d.data[0]||{}).skillIds||[]).filter(id=>id!==p.skillId); await db.collection('users').doc(u.userId).update({skillIds:ids,updatedAt:Date.now()}); return {ok:true}; });

// ─── User Workflows ──────────────────
G('/api/user-workflows', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); return {workflows:[]}; });
P('/api/user-workflows', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); return {ok:true}; });
D('/api/user-workflows/:workflowId', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); return {ok:true}; });

// ─── Workflows ──────────────────────
G('/api/workflows', async()=>WORKFLOWS);
P('/api/workflows/run', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const wfId=b.workflowId||''; const ctx=b.context||''; const steps=[]; const wf=WORKFLOWS.find(w=>w.id===wfId); if(!wf) return err('工作流不存在',404); for(const s of wf.steps){ if(s.skillId){ const skill=SKILLS[s.skillId]; if(skill) steps.push({title:s.title,result:'已执行「'+skill.name+'」—— 基于上下文：'+ctx.slice(0,50)}); } } return {messages:steps}; });
G('/api/users/me/workflows', async(p,b,q)=>{ const u=auth(q.headers.authorization); return []; });

// ─── Resources ──────────────────────
G('/api/users/me/resources', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); return (addId(d.data[0])||{}).resources||[]; });
U('/api/users/me/resources', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('users').doc(u.userId).update({resources:b.resources||[],updatedAt:Date.now()}); return {ok:true}; });
P('/api/users/me/ai-enhance-profile', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); return {user:addId(d.data[0])||{}}; });

// ─── Files / Upload ─────────────────
G('/api/upload/config', async()=>({maxBytes:2097152,storage:'inline'}));
P('/api/upload', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); return {file:{url:'',fileName:''}}; });
G('/api/files/:fileId', async(p)=>{ return {url:''}; });
P('/api/users/me/api-token/generate', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const token=jwt.sign({userId:u.userId,apiToken:true},JWT_SECRET,{expiresIn:'365d'}); await db.collection('users').doc(u.userId).update({apiToken:token,apiTokenLastGenerated:Date.now()}); return {token}; });
P('/api/users/me/api-token/revoke', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('users').doc(u.userId).update({apiToken:'',updatedAt:Date.now()}); return {ok:true}; });

// ─── Public Read-Only API (API Key required) ─────────────────
const API_KEY_RATE = new Map(); // key -> {count, windowStart}
const API_KEY_WINDOW = 60000; // 1 minute
const API_KEY_MAX = 60; // 60 requests per minute per key

function checkApiKeyRate(apiKey) {
  const now = Date.now();
  const r = API_KEY_RATE.get(apiKey);
  if (!r || now - r.windowStart > API_KEY_WINDOW) {
    API_KEY_RATE.set(apiKey, { count: 1, windowStart: now });
    return true;
  }
  if (r.count >= API_KEY_MAX) return false;
  r.count++;
  return true;
}

// Clean up rate limit entries every 5 minutes
setInterval(() => { const now = Date.now(); for (const [k, v] of API_KEY_RATE) { if (now - v.windowStart > API_KEY_WINDOW * 2) API_KEY_RATE.delete(k); } }, 300000);

function requireApiKey(q) {
  const apiKey = (q.headers['x-api-key'] || q.query?.api_key || '');
  if (!apiKey) return { ok: false, error: 'Missing API Key. Pass via X-API-Key header or api_key query param.' };
  if (!checkApiKeyRate(apiKey)) return { ok: false, error: 'Rate limit exceeded. Max 60 requests/minute.' };
  return { ok: true, apiKey };
}

// Register / generate API Key for external sites
P('/api/public/register', async(p,b,q)=>{
  const { site_name, site_url } = b;
  if (!site_name) return err('site_name is required');
  const existing = await db.collection('api_keys').where({ site_url: site_url || '' }).limit(1).get();
  if (existing.data.length) return { api_key: existing.data[0].key, message: 'API Key already exists for this site' };
  const key = 'cm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  await db.collection('api_keys').add({ key, siteName: site_name, siteUrl: site_url || '', createdAt: Date.now(), requestCount: 0 });
  return { api_key: key, message: 'Keep this key safe. Use it in X-API-Key header or api_key query param.' };
});

G('/api/public/requirements', async(p,b,q)=>{
  const k = requireApiKey(q); if (!k.ok) return err(k.error, 401);
  let col = db.collection('requirements').where({ status: 'open', visibility: 'public' });
  const domain = q.query?.domain;
  const keyword = q.query?.keyword;
  const limit = Math.min(Number(q.query?.limit) || 20, 50);
  if (domain) col = col.where({ domain });
  if (keyword) col = col.where({ title: db.RegExp({ regexp: keyword, options: 'i' }) });
  const r = await col.orderBy('createdAt', 'desc').limit(limit).get();
  return { total: r.data.length, items: addIds(r.data).map(d => ({ id: d.id, title: d.title, domain: d.domain, skills: d.skills || [], desc: (d.desc || '').slice(0, 300), background: d.background, goal: d.goal, timeline: d.timeline, matchProgress: d.matchProgress, createdAt: d.createdAt })) };
});

G('/api/public/requirements/:id', async(p,b,q)=>{
  const k = requireApiKey(q); if (!k.ok) return err(k.error, 401);
  const r = await db.collection('requirements').doc(p.id).get();
  if (!r.data.length) return err('Not found', 404);
  const d = addId(r.data[0]);
  if (d.status !== 'open' || d.visibility !== 'public') return err('Not found', 404);
  return { id: d.id, title: d.title, domain: d.domain, skills: d.skills || [], desc: d.desc, background: d.background, goal: d.goal, timeline: d.timeline, outcome: d.outcome, matchProgress: d.matchProgress, createdAt: d.createdAt };
});

G('/api/public/users/:id', async(p,b,q)=>{
  const k = requireApiKey(q); if (!k.ok) return err(k.error, 401);
  const r = await db.collection('users').doc(p.id).get();
  if (!r.data.length) return err('Not found', 404);
  const d = addId(r.data[0]);
  return { id: d.id, name: d.name, avatar: d.avatar, avatarColor: d.avatarColor, avatarUrl: d.avatarUrl, position: d.position, skills: d.skills || [], domain: d.domain, collabScore: d.collabScore, projects: d.projects };
});

// ─── MCP (Model Context Protocol) ─────────────────
const MCP_TOOLS=[
  {name:'create_requirement',description:'在需求匹配平台创建协作需求',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},title:{type:'string',description:'项目名称'},background:{type:'string',description:'项目背景'},goal:{type:'string',description:'项目目标'},skills:{type:'array',items:{type:'string'},description:'所需技能'},domain:{type:'string',description:'领域: tech/design/content/education/business'},desc:{type:'string',description:'详细描述'},timeline:{type:'string',description:'时间线'},outcome:{type:'string',description:'预期成果'}},required:['token','title']}},
  {name:'publish_requirement',description:'将草稿需求发布到广场',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},requirement_id:{type:'string',description:'需求 ID'},visibility:{type:'string',description:'可见性: public/match_only'}},required:['token','requirement_id']}},
  {name:'search_requirements',description:'搜索广场上的协作需求',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},domain:{type:'string',description:'领域筛选'},skills:{type:'array',items:{type:'string'},description:'技能筛选'},keyword:{type:'string',description:'关键词'},limit:{type:'number',description:'返回数量上限'}},required:['token']}},
  {name:'find_matches',description:'为需求查找匹配的协作者',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},requirement_id:{type:'string',description:'需求 ID'},limit:{type:'number',description:'返回数量上限'}},required:['token','requirement_id']}},
  {name:'get_requirement',description:'查询需求详情',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},requirement_id:{type:'string',description:'需求 ID'}},required:['token','requirement_id']}}
];

function mcpAuth(token){ try{ const p=jwt.verify(token,JWT_SECRET); return p&&p.userId?p:null; }catch{ return null; } }

async function mcpCreateRequirement(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  const data={title:args.title||'Untitled',author:u.userId,status:'draft',visibility:'public',domain:args.domain||'tech',skills:args.skills||[],background:args.background||'',goal:args.goal||'',desc:args.desc||'',timeline:args.timeline||'3-6 个月',outcome:args.outcome||'',matchProgress:0,createdAt:Date.now(),updatedAt:Date.now()};
  const r=await db.collection('requirements').add(data);
  return {id:r.id,title:data.title,status:data.status,message:'需求已创建（草稿）。调用 publish_requirement 发布到广场。'};
}
async function mcpPublishRequirement(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  const d=await db.collection('requirements').doc(args.requirement_id).get();
  if(!d.data.length) return {error:{code:-32004,message:'Requirement not found'}};
  await db.collection('requirements').doc(args.requirement_id).update({status:'open',visibility:args.visibility||'public',updatedAt:Date.now()});
  return {id:args.requirement_id,status:'open',message:'需求已发布到广场。'};
}
async function mcpSearchRequirements(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  let col=db.collection('requirements').where({status:'open',visibility:'public'});
  if(args.domain) col=col.where({domain:args.domain});
  if(args.keyword) col=col.where({title:db.RegExp({regexp:args.keyword,options:'i'})});
  const r=await col.orderBy('createdAt','desc').limit(args.limit||10).get();
  return {total:r.data.length,items:r.data.map(d=>({id:d._id,title:d.title,domain:d.domain,skills:d.skills||[],desc:(d.desc||'').slice(0,200),author:d.author,createdAt:d.createdAt}))};
}
async function mcpFindMatches(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  const reqDoc=await db.collection('requirements').doc(args.requirement_id).get();
  if(!reqDoc.data.length) return {error:{code:-32004,message:'Requirement not found'}};
  const skills=reqDoc.data[0].skills||[];
  const users=await db.collection('users').limit(50).get();
  const scored=users.data.filter(x=>String(x._id)!==u.userId).map(x=>{const o=(x.skills||[]).filter(s=>skills.includes(s));return{userId:x._id,name:x.name,position:x.position,skills:x.skills,matchPct:skills.length?Math.round(o.length/skills.length*100):0,matchedSkills:o};}).sort((a,b)=>b.matchPct-a.matchPct).slice(0,args.limit||10);
  return {requirementId:args.requirement_id,total:scored.length,matches:scored};
}
async function mcpGetRequirement(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  const d=await db.collection('requirements').doc(args.requirement_id).get();
  if(!d.data.length) return {error:{code:-32004,message:'Requirement not found'}};
  const r=d.data[0]; return {id:r._id,title:r.title,status:r.status,visibility:r.visibility,domain:r.domain,skills:r.skills||[],background:r.background,goal:r.goal,desc:r.desc,timeline:r.timeline,outcome:r.outcome,matchProgress:r.matchProgress,createdAt:r.createdAt};
}

P('/api/mcp', async(p,body,q)=>{
  const {jsonrpc,id,method,params}=body;
  if(method==='initialize') return {jsonrpc:'2.0',id,result:{protocolVersion:'2024-11-05',serverInfo:{name:'collabmatch-mcp',version:'1.0.0'},capabilities:{tools:{}}}};
  if(method==='notifications/initialized') return {jsonrpc:'2.0',id,result:{}};
  if(method==='tools/list') return {jsonrpc:'2.0',id,result:{tools:MCP_TOOLS}};
  if(method==='tools/call'){
    const toolName=params?.name; const args=params?.arguments||{};
    try{
      let result;
      switch(toolName){
        case 'create_requirement': result=await mcpCreateRequirement(args); break;
        case 'publish_requirement': result=await mcpPublishRequirement(args); break;
        case 'search_requirements': result=await mcpSearchRequirements(args); break;
        case 'find_matches': result=await mcpFindMatches(args); break;
        case 'get_requirement': result=await mcpGetRequirement(args); break;
        default: return {jsonrpc:'2.0',id,error:{code:-32601,message:'Unknown tool: '+toolName}};
      }
      if(result.error) return {jsonrpc:'2.0',id,error:result.error};
      return {jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}]}};
    }catch(e){ return {jsonrpc:'2.0',id,error:{code:-32603,message:e.message}}; }
  }
  return {jsonrpc:'2.0',id,error:{code:-32601,message:'Unknown method: '+method}};
});
G('/api/mcp/health', ()=>({ok:true,service:'collabmatch-mcp',version:'1.0.0'}));

// ─── Router ─────────────────────────
exports.main = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    }, body: '' };
  }

  const method = event.httpMethod||'GET';
  let path = event.path||'/';

  // Find matching route — try exact match first
  let handler = R[method+':'+path];
  // HTTP 访问服务可能会截掉 /api 前缀，尝试补回
  if(!handler && !path.startsWith('/api')) {
    path = '/api' + path;
    handler = R[method+':'+path];
  }
  const body = event.body?(typeof event.body==='string'?JSON.parse(event.body):event.body):{};
  const params = {};

  // Fallback: parameterized matching
  if(!handler) {
    const parts = path.split('/').filter(Boolean);
    for(const [k,h] of Object.entries(R)) {
      const [km,kp]=k.split(':');
      if(km!==method) continue;
      const kps=kp.split('/').filter(Boolean);
      if(kps.length!==parts.length) continue;
      let match=true;
      for(let i=0;i<kps.length;i++){
        if(kps[i].startsWith(':')) params[kps[i].slice(1)]=parts[i];
        else if(kps[i]!==parts[i]){ match=false; break; }
      }
      if(match){ handler=h; break; }
    }
  }

  if(!handler) return {statusCode:404,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Not found',path})};

  try {
    const req={headers:event.headers||{},query:event.queryStringParameters||{}};
    const result = await handler(params,body,req);
    // 处理重定向
    if(result._redirect) {
      return {statusCode:302,headers:{'Location':result._redirect,'Access-Control-Allow-Origin':'*'},body:''};
    }
    const status=result._status||200; delete result._status;
    return {statusCode:status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify(result)};
  } catch(e) {
    return {statusCode:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({error:e.message,stack:e.stack?.split('\n').slice(0,3)})};
  }
};
