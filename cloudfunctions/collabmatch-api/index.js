const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const jwt = require('jsonwebtoken');
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
const G=(p,h)=>r('GET',p,h); const P=(p,h)=>r('POST',p,h); const U=(p,h)=>r('PUT',p,h); const D=(p,h)=>r('DELETE',p,h);

// ─── Health ─────────────────────────
G('/health', ()=>({ok:true,version:'v3-fix',path:'/'}));
G('/api/health', ()=>({ok:true,version:'v3-fix',path:'/api'}));
const DOMAINS={tech:{key:'tech',name:'💻 技术开发',icon:'💻',color:'#8b5cf6',sceneTags:['项目需求','开源协作'],skills:['React','Vue','Node.js','Python','Go','TypeScript','Java','Docker','Kubernetes','AI/ML','NLP','后端开发','前端开发','全栈开发','区块链','推荐算法','算法'],templates:[{label:'Side Project',text:'我想做一个 AI 工具 Side Project，缺一位会 React 的全栈开发者，每周可投入 10 小时'},{label:'开源协作',text:'我有一个开源项目，需要前端贡献者和文档维护者'},{label:'SaaS 合伙',text:'已有 MVP idea，寻找技术合伙人一起做 B2B SaaS'}],chatIntro:'描述你的 Side Project 或开源计划，AI 帮你整理需求并匹配合适的工程师'},design:{key:'design',name:'🎨 创意设计',icon:'🎨',color:'#f59e0b',sceneTags:['品牌设计','插画合作','UI/UX'],skills:['Figma','UI设计','UX研究','品牌视觉','插画','动画','3D','Framer','设计系统'],templates:[{label:'品牌设计',text:'寻找设计师一起做一套品牌 VI 系统'},{label:'插画合作',text:'找插画师合作出版绘本项目'},{label:'设计系统',text:'需要 UI 设计师共建组件库设计规范'}],chatIntro:'描述你的创意项目，AI 帮你整理需求并匹配设计师、插画师等创意人才'},content:{key:'content',name:'📝 内容创作',icon:'📝',color:'#22c55e',sceneTags:['播客制作','视频创作','专栏合作'],skills:['写作','视频剪辑','播客','自媒体运营','编辑','新媒体','摄影','内容策划'],templates:[{label:'播客制作',text:'想找一个搭档一起做科技类播客节目'},{label:'视频创作',text:'组建视频创作团队做知识类短视频'},{label:'专栏合作',text:'寻找作者合作撰写专栏或电子书'}],chatIntro:'描述你的内容创作方向，AI 帮你整理需求并匹配创作者、编辑、运营伙伴'},education:{key:'education',name:'🎓 教育培训',icon:'🎓',color:'#3b82f6',sceneTags:['课程共创','教育工具','知识社区'],skills:['课程设计','教学设计','知识付费','培训','教育科技','教研','辅导'],templates:[{label:'课程共创',text:'寻找学科专家一起开发在线课程'},{label:'教育工具',text:'需要教育行业经验的产品经理合作'},{label:'知识社区',text:'想组建教育知识分享社区团队'}],chatIntro:'描述你的教育项目或教学需求，AI 帮你整理并匹配教育行业伙伴'},business:{key:'business',name:'📈 商业合作',icon:'📈',color:'#ef4444',sceneTags:['技术合伙','运营合伙','融资合作'],skills:['市场营销','BD','融资','数据分析','运营','产品管理','PRD撰写','商业模式','供应链'],templates:[{label:'技术合伙',text:'有产品 idea，寻找技术合伙人一起创业，每周可投入 10-15 小时'},{label:'运营合伙',text:'Side Project 已有 MVP，需要运营合伙人一起做增长'},{label:'商业合伙',text:'项目已有原型，寻找商业合伙人负责市场和融资'}],chatIntro:'描述你的创业 Side Project，AI 帮你整理需求并匹配技术或商业伙伴'},food:{key:'food',name:'🧋 餐饮美食',icon:'🧋',color:'#f97316',sceneTags:['找商家','拼单组队','新品推广','美食探店'],skills:['奶茶','咖啡','甜品','烘焙','火锅','日料','小吃','中餐','西餐','轻食','素食','调酒','私房菜','外卖运营','食品安全'],templates:[{label:'找奶茶店',text:'我想找一家能做无糖燕麦奶+黑糖珍珠的奶茶店，离我近的'},{label:'找顾客',text:'本店推出新品"桂花酒酿奶茶"，寻找喜欢尝鲜的顾客'},{label:'拼单组队',text:'想组办公室奶茶拼单，5杯起送，求拼友'}],chatIntro:'描述你的口味偏好或饮食需求，AI 帮你匹配商家、拼单伙伴或推荐新店'},service:{key:'service',name:'🏠 本地服务',icon:'🏠',color:'#14b8a6',sceneTags:['找服务','提供服务','急需帮忙'],skills:['家政保洁','搬家','维修','装修','美容美发','健身私教','宠物寄养','摄影跟拍','补习辅导','月嫂','家电清洗','二手回收'],templates:[{label:'找服务',text:'我需要一个靠谱的家政阿姨，每周打扫一次'},{label:'提供服务',text:'我是专业摄影师，可接婚礼跟拍、写真约拍'},{label:'找人帮忙',text:'周末需要搬家帮手，有偿'}],chatIntro:'描述你需要什么本地服务或你能提供什么技能，AI 帮你精准匹配'}};

const SKILLS={generate_prd:{id:'generate_prd',icon:'📋',name:'生成需求文档',desktop:'将用户的描述整理为结构化需求文档',instruct:'请把用户刚才描述的内容整理成结构化需求文档。输出格式：标题、项目背景、核心目标、所需技能、预期时间线、预期成果。',category:'official',author:'CollabAI',tags:['文档','需求'],installs:12580,version:'1.3',isInstallable:!0},diagnose:{id:'diagnose',icon:'🎯',name:'诊断需求',desktop:'从市场/技术/资源三维度分析可行性',instruct:'请从市场可行性、技术难度、资源需求三个维度诊断用户刚才描述的需求，指出潜在风险和被忽略的关键点，给出务实建议。',category:'official',author:'CollabAI',tags:['诊断','分析'],installs:9820,version:'1.2',isInstallable:!0},optimize:{id:'optimize',icon:'✨',name:'优化描述',desktop:'让需求描述更吸引协作者',instruct:'请优化用户刚才的需求描述，使其更吸引潜在协作者。突出：项目亮点、为什么值得参与、合作能获得什么。保持简洁有力。',category:'official',author:'CollabAI',tags:['优化','文案'],installs:8640,version:'1.1',isInstallable:!0},estimate:{id:'estimate',icon:'⏱️',name:'估算周期',desktop:'给项目阶段划分和时间估算',instruct:'请根据用户描述的项目需求，给出分阶段的周期估算。拆成 MVP/核心功能/上线/迭代四个阶段，每个阶段给时间范围和关键交付物。',category:'official',author:'CollabAI',tags:['周期','规划'],installs:7200,version:'1.0',isInstallable:!0},invite:{id:'invite',icon:'📨',name:'生成邀请文案',desktop:'为匹配到的协作者生成个性化邀请',instruct:'请基于当前需求和匹配到的协作者信息，生成一段自然、真诚的协作邀请文案。包含：项目简介、为什么选对方、合作模式建议。',category:'official',author:'CollabAI',tags:['邀请','协作'],installs:6100,version:'1.0',isInstallable:!0},summary:{id:'summary',icon:'📊',name:'协作周报',desktop:'自动总结群组近期讨论内容',instruct:'请总结当前群组最近的讨论要点。按以下结构：本周进展、关键决策、待解决问题、下周计划。如果讨论内容不足，告知无法总结。',category:'official',author:'CollabAI',tags:['周报','总结'],installs:5400,version:'1.0',isInstallable:!0},generate_ui:{id:'generate_ui',icon:'🖼️',name:'生成 UI 原型',desktop:'根据描述生成可交互的产品界面原型',instruct:'请根据用户描述的产品需求，输出 UI 原型方案：页面结构、核心组件、交互流程、设计建议（配色与布局）。用 Markdown 分节描述，便于设计师落地。',category:'official',author:'CollabAI',tags:['原型','UI','设计'],installs:4300,version:'1.0',isInstallable:!0},swot:{id:'swot',icon:'🔍',name:'SWOT 分析',desktop:'竞品 SWOT 分析矩阵',instruct:'请对用户描述的项目做 SWOT 分析，按优势、劣势、机会、威胁四象限输出，每条 2-4 点，并给出 1-2 条战略建议。',category:'community',author:'策略大师',tags:['分析','竞品','商业'],installs:3200,version:'1.0',isInstallable:!0},roadmap:{id:'roadmap',icon:'🗺️',name:'产品路线图',desktop:'生成分阶段产品路线图',instruct:'请根据用户需求生成分阶段产品路线图：里程碑、时间范围、关键交付物、依赖关系。用表格或列表呈现。',category:'community',author:'PM助手',tags:['规划','产品','路线图'],installs:1800,version:'1.0',isInstallable:!0}};

const DOMAIN_SKILL_MAP={tech:['generate_prd','diagnose','optimize','estimate','invite','summary','generate_ui'],design:['generate_prd','diagnose','optimize','estimate','invite','generate_ui'],content:['generate_prd','diagnose','optimize','invite','generate_ui'],education:['generate_prd','diagnose','optimize','estimate','invite','generate_ui'],business:['generate_prd','diagnose','optimize','estimate','invite','generate_ui'],food:['diagnose','optimize','invite','summary'],service:['diagnose','optimize','invite','summary']};

const WORKFLOWS=[{id:'wf1',name:'🚀 从想法到团队',desc:'完整流程：梳理需求 → 匹配协作者 → 组队开始协作',steps:[{skillId:'generate_prd',icon:'📋',title:'生成需求文档'},{skillId:'diagnose',icon:'🎯',title:'诊断需求可行性'},{skillId:'optimize',icon:'✨',title:'优化需求描述'},{skillId:'invite',icon:'📨',title:'生成邀请文案'},{action:'match_forward',skillId:'__action_match_forward__',icon:'🔍',title:'智能匹配协作者'}],tags:['完整流程','推荐']},{id:'wf2',name:'🎨 原型生成器',desc:'需求描述 → UI 原型 → 迭代优化',steps:[{skillId:'generate_prd',icon:'📋',title:'整理需求'},{skillId:'generate_ui',icon:'🖼️',title:'生成 UI 原型'}],tags:['设计','快速原型']},{id:'wf3',name:'📊 项目体检',desc:'多维度评估项目 + 优化 + 重新匹配',steps:[{skillId:'diagnose',icon:'🎯',title:'诊断评估'},{skillId:'optimize',icon:'✨',title:'优化描述'},{skillId:'swot',icon:'🔍',title:'SWOT 分析'}],tags:['评估','优化']}];

G('/api/config', ()=>({authMode:'dev',devAuthCode:DEV_AUTH_CODE,domains:{tech:{id:'tech',name:'💻 技术开发',icon:'💻'},design:{id:'design',name:'🎨 创意设计',icon:'🎨'},content:{id:'content',name:'✍️ 内容创作',icon:'✍️'},education:{id:'education',name:'📚 知识教育',icon:'📚'},business:{id:'business',name:'💼 商业运营',icon:'💼'},food:{id:'food',name:'🧋 餐饮美食',icon:'🧋'},service:{id:'service',name:'🏠 本地服务',icon:'🏠'}}}));
G('/api/config/domains', ()=>DOMAINS);
G('/api/config/skills', ()=>({skills:SKILLS,domainSkillMap:DOMAIN_SKILL_MAP}));
G('/api/config/workflows', ()=>WORKFLOWS);

// ─── Auth ───────────────────────────
G('/api/auth/config', ()=>({mode:'dev',code:DEV_AUTH_CODE}));
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
G('/api/auth/me', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); const user=addId(d.data[0]||{}); return {user}; });

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
G('/api/match/forward', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('requirements').doc(p.requirementId||q.requirementId).get(); if(!r.data.length) return {items:[],total:0}; const skills=r.data[0].skills||[]; const users=await db.collection('users').limit(50).get(); const scored=users.data.filter(x=>String(x._id)!==u.userId).map(x=>{ const o=(x.skills||[]).filter(s=>skills.includes(s)); return {userId:x._id,name:x.name,avatar:x.avatar,position:x.position,skills:x.skills,matchPct:skills.length?Math.round(o.length/skills.length*100):0,matchedSkills:o}; }); scored.sort((a,b)=>b.matchPct-a.matchPct); const items=scored.slice(0,10); return {items,total:scored.length}; });
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
  if(!convId||!msg) return err('缺少 conversationId 或 message');
  const c=await db.collection('conversations').doc(convId).get();
  if(!c.data.length) return err('对话不存在',404);
  const msgs=c.data[0].messages||[];
  const userMsg={role:'user',content:msg,time:new Date().toISOString()};
  msgs.push(userMsg);
  // ── LLM 接入（豆包 / 火山方舟优先，其次 Hermes Agent，最后离线模式） ──
  let reply = '';
  const doubaoKey = process.env.DOUBAO_API_KEY || '';
  const doubaoModel = process.env.DOUBAO_MODEL || '';
  const doubaoBaseUrl = (process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '');

  if (doubaoKey && doubaoModel) {
    // 优先使用豆包 API
    try {
      const doubaoRes = await fetch(doubaoBaseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + doubaoKey,
        },
        body: JSON.stringify({
          model: doubaoModel,
          messages: [
            {role:'system', content:'你是 CollabMatch 的 AI 助手 CollabAI。\n职责：1) 帮助用户梳理协作需求 2) 推荐合适的技能标签 3) 引导用户完善项目描述 4) 必要时建议用户去需求广场匹配协作者。\n要求：回答简洁有用，中文回复，不超过300字。'},
            ...msgs.filter(m => m.role === 'user' || m.role === 'ai').slice(-6).map(m => ({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.content
            }))
          ],
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
  } else {
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
            messages: [
              {role:'system', content:'你是 CollabMatch 的 AI 助手 CollabAI。\n职责：1) 帮助用户梳理协作需求 2) 推荐合适的技能标签 3) 引导用户完善项目描述 4) 必要时建议用户去需求广场匹配协作者。\n要求：回答简洁有用，中文回复，不超过300字。'},
              {role:'user', content: msg}
            ],
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
      reply = '欢迎使用 CollabMatch AI 助手！\n\n（当前为离线模式，管理员请在云函数环境变量中配置 DOUBAO_API_KEY 和 DOUBAO_MODEL 以启用 AI 对话功能。）\n\n你可以继续和我对话（离线模式仅返回提示），或者直接去需求广场浏览已发布的协作需求。';
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
P('/api/conversations', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={userId:u.userId,title:b.title||'新对话',domain:b.domain||'tech',messages:[{role:'ai',content:'你好！欢迎来到 CollabMatch 😊\n\n我是 CollabAI，帮你找到志同道合的协作伙伴。\n\n你有什么项目想法或协作需求？',time:new Date().toISOString()}],requirementId:b.requirementId||'',createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('conversations').add(data); const conv=addId({_id:r.id,...data}); return {conversation:conv}; });
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
P('/api/users/me/api-token/generate', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); return {token:'dev-token-'+Date.now()}; });

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
    const status=result._status||200; delete result._status;
    return {statusCode:status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify(result)};
  } catch(e) {
    return {statusCode:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({error:e.message,stack:e.stack?.split('\n').slice(0,3)})};
  }
};
