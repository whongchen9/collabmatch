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

// L-05: MongoDB memory server \u4e0d\u652f\u6301\u6301\u4e45\u5316\u7d22\u5f15\u3002\u751f\u4ea7\u73af\u5883\u5efa\u8bae\u5728\u4ee5\u4e0b\u96c6\u5408\u521b\u5efa\u7d22\u5f15\uff1a
//   - users: { phone: 1 } unique, { skills: 1 }, { lastSeenAt: -1 }
//   - requirements: { status: 1, visibility: 1, createdAt: -1 }, { author: 1 }, { skills: 1 }
//   - applications: { requirementId: 1, applicant: 1 }, { applicant: 1 }
//   - conversations: { userId: 1, updatedAt: -1 }
//   - groups: { creatorId: 1 }, { 'members.id': 1 }
//   \u793a\u4f8b: db.collection('users').createIndex({ phone: 1 }, { unique: true })

const R = {}; // routes
function r(m,p,h) { R[m+':'+p]=h; }
// Register both with and without /api prefix (HTTP access service strips /api trigger prefix)
function r2(m,p,h) { R[m+':'+p]=h; if (p.startsWith('/api/')) R[m+':'+p.slice(4)]=h; else if (p==='/api') R[m+':'+'/']=h; }
const G=(p,h)=>r2('GET',p,h); const P=(p,h)=>r2('POST',p,h); const U=(p,h)=>r2('PUT',p,h); const D=(p,h)=>r2('DELETE',p,h);

// ─── Health ─────────────────────────
G('/health', ()=>({ok:true,version:'v3-fix',path:'/'}));
G('/api/health', ()=>({ok:true,version:'v3-fix',path:'/api'}));
const DOMAINS={tech:{key:'tech',name:'💻 \u6280\u672f\u5f00\u53d1',icon:'💻',color:'#8b7bf7',sceneTags:['\u9879\u76ee\u9700\u6c42','\u5f00\u6e90\u534f\u4f5c'],skills:['React','Vue','Node.js','Python','Go','TypeScript','Java','Docker','Kubernetes','AI/ML','NLP','\u540e\u7aef\u5f00\u53d1','\u524d\u7aef\u5f00\u53d1','\u5168\u6808\u5f00\u53d1','\u533a\u5757\u94fe','\u63a8\u8350\u7b97\u6cd5','\u7b97\u6cd5'],templates:[{label:'\u9879\u76ee\u534f\u4f5c',text:'\u6211\u60f3\u505a\u4e00\u4e2a AI \u5de5\u5177\uff0c\u7f3a\u4e00\u4f4d\u4f1a React \u7684\u5168\u6808\u5f00\u53d1\u8005\uff0c\u6bcf\u5468\u53ef\u6295\u5165 10 \u5c0f\u65f6'},{label:'\u5f00\u6e90\u534f\u4f5c',text:'\u6211\u6709\u4e00\u4e2a\u5f00\u6e90\u9879\u76ee\uff0c\u9700\u8981\u524d\u7aef\u8d21\u732e\u8005\u548c\u6587\u6863\u7ef4\u62a4\u8005'},{label:'SaaS \u5408\u4f19',text:'\u5df2\u6709 MVP idea\uff0c\u5bfb\u627e\u6280\u672f\u5408\u4f19\u4eba\u4e00\u8d77\u505a B2B SaaS'}],chatIntro:'\u63cf\u8ff0\u4f60\u7684\u9879\u76ee\u6216\u60f3\u6cd5\uff0cAI \u5e2e\u4f60\u6574\u7406\u9700\u6c42\u5e76\u5339\u914d\u5408\u9002\u7684\u5de5\u7a0b\u5e08'},design:{key:'design',name:'🎨 \u521b\u610f\u8bbe\u8ba1',icon:'🎨',color:'#a78bfa',sceneTags:['\u54c1\u724c\u8bbe\u8ba1','\u63d2\u753b\u5408\u4f5c','UI/UX'],skills:['Figma','UI\u8bbe\u8ba1','UX\u7814\u7a76','\u54c1\u724c\u89c6\u89c9','\u63d2\u753b','\u52a8\u753b','3D','Framer','\u8bbe\u8ba1\u7cfb\u7edf'],templates:[{label:'\u54c1\u724c\u8bbe\u8ba1',text:'\u5bfb\u627e\u8bbe\u8ba1\u5e08\u4e00\u8d77\u505a\u4e00\u5957\u54c1\u724c VI \u7cfb\u7edf'},{label:'\u63d2\u753b\u5408\u4f5c',text:'\u627e\u63d2\u753b\u5e08\u5408\u4f5c\u51fa\u7248\u7ed8\u672c\u9879\u76ee'},{label:'\u8bbe\u8ba1\u7cfb\u7edf',text:'\u9700\u8981 UI \u8bbe\u8ba1\u5e08\u5171\u5efa\u7ec4\u4ef6\u5e93\u8bbe\u8ba1\u89c4\u8303'}],chatIntro:'\u63cf\u8ff0\u4f60\u7684\u521b\u610f\u9879\u76ee\uff0cAI \u5e2e\u4f60\u6574\u7406\u9700\u6c42\u5e76\u5339\u914d\u8bbe\u8ba1\u5e08\u3001\u63d2\u753b\u5e08\u7b49\u521b\u610f\u4eba\u624d'},content:{key:'content',name:'📝 \u5185\u5bb9\u521b\u4f5c',icon:'📝',color:'#7c8cf7',sceneTags:['\u64ad\u5ba2\u5236\u4f5c','\u89c6\u9891\u521b\u4f5c','\u4e13\u680f\u5408\u4f5c'],skills:['\u5199\u4f5c','\u89c6\u9891\u526a\u8f91','\u64ad\u5ba2','\u81ea\u5a92\u4f53\u8fd0\u8425','\u7f16\u8f91','\u65b0\u5a92\u4f53','\u6444\u5f71','\u5185\u5bb9\u7b56\u5212'],templates:[{label:'\u64ad\u5ba2\u5236\u4f5c',text:'\u60f3\u627e\u4e00\u4e2a\u642d\u6863\u4e00\u8d77\u505a\u79d1\u6280\u7c7b\u64ad\u5ba2\u8282\u76ee'},{label:'\u89c6\u9891\u521b\u4f5c',text:'\u7ec4\u5efa\u89c6\u9891\u521b\u4f5c\u56e2\u961f\u505a\u77e5\u8bc6\u7c7b\u77ed\u89c6\u9891'},{label:'\u4e13\u680f\u5408\u4f5c',text:'\u5bfb\u627e\u4f5c\u8005\u5408\u4f5c\u64b0\u5199\u4e13\u680f\u6216\u7535\u5b50\u4e66'}],chatIntro:'\u63cf\u8ff0\u4f60\u7684\u5185\u5bb9\u521b\u4f5c\u65b9\u5411\uff0cAI \u5e2e\u4f60\u6574\u7406\u9700\u6c42\u5e76\u5339\u914d\u521b\u4f5c\u8005\u3001\u7f16\u8f91\u3001\u8fd0\u8425\u4f19\u4f34'},education:{key:'education',name:'🎓 \u6559\u80b2\u57f9\u8bad',icon:'🎓',color:'#6bb8c9',sceneTags:['\u8bfe\u7a0b\u5171\u521b','\u6559\u80b2\u5de5\u5177','\u77e5\u8bc6\u793e\u533a'],skills:['\u8bfe\u7a0b\u8bbe\u8ba1','\u6559\u5b66\u8bbe\u8ba1','\u77e5\u8bc6\u4ed8\u8d39','\u57f9\u8bad','\u6559\u80b2\u79d1\u6280','\u6559\u7814','\u8f85\u5bfc'],templates:[{label:'\u8bfe\u7a0b\u5171\u521b',text:'\u5bfb\u627e\u5b66\u79d1\u4e13\u5bb6\u4e00\u8d77\u5f00\u53d1\u5728\u7ebf\u8bfe\u7a0b'},{label:'\u6559\u80b2\u5de5\u5177',text:'\u9700\u8981\u6559\u80b2\u884c\u4e1a\u7ecf\u9a8c\u7684\u4ea7\u54c1\u7ecf\u7406\u5408\u4f5c'},{label:'\u77e5\u8bc6\u793e\u533a',text:'\u60f3\u7ec4\u5efa\u6559\u80b2\u77e5\u8bc6\u5206\u4eab\u793e\u533a\u56e2\u961f'}],chatIntro:'\u63cf\u8ff0\u4f60\u7684\u6559\u80b2\u9879\u76ee\u6216\u6559\u5b66\u9700\u6c42\uff0cAI \u5e2e\u4f60\u6574\u7406\u5e76\u5339\u914d\u6559\u80b2\u884c\u4e1a\u4f19\u4f34'},business:{key:'business',name:'📈 \u5546\u4e1a\u5408\u4f5c',icon:'📈',color:'#b07cc7',sceneTags:['\u6280\u672f\u5408\u4f19','\u8fd0\u8425\u5408\u4f19','\u878d\u8d44\u5408\u4f5c'],skills:['\u5e02\u573a\u8425\u9500','BD','\u878d\u8d44','\u6570\u636e\u5206\u6790','\u8fd0\u8425','\u4ea7\u54c1\u7ba1\u7406','PRD\u64b0\u5199','\u5546\u4e1a\u6a21\u5f0f','\u4f9b\u5e94\u94fe'],templates:[{label:'\u6280\u672f\u5408\u4f19',text:'\u6709\u4ea7\u54c1 idea\uff0c\u5bfb\u627e\u6280\u672f\u5408\u4f19\u4eba\u4e00\u8d77\u521b\u4e1a\uff0c\u6bcf\u5468\u53ef\u6295\u5165 10-15 \u5c0f\u65f6'},{label:'\u8fd0\u8425\u5408\u4f19',text:'\u9879\u76ee\u5df2\u6709 MVP\uff0c\u9700\u8981\u8fd0\u8425\u5408\u4f19\u4eba\u4e00\u8d77\u505a\u589e\u957f'},{label:'\u5546\u4e1a\u5408\u4f19',text:'\u9879\u76ee\u5df2\u6709\u539f\u578b\uff0c\u5bfb\u627e\u5546\u4e1a\u5408\u4f19\u4eba\u8d1f\u8d23\u5e02\u573a\u548c\u878d\u8d44'}],chatIntro:'\u63cf\u8ff0\u4f60\u7684\u521b\u4e1a\u9879\u76ee\uff0cAI \u5e2e\u4f60\u6574\u7406\u9700\u6c42\u5e76\u5339\u914d\u6280\u672f\u6216\u5546\u4e1a\u4f19\u4f34'},campus:{key:'campus',name:'🏫 \u6821\u56ed\u751f\u6d3b',icon:'🏫',color:'#7cc4a8',sceneTags:['\u8dd1\u817f\u4e92\u52a9','\u62fc\u5355\u62fc\u8f66','\u7ec4\u5c40\u6d3b\u52a8','\u6280\u80fd\u4ea4\u6362','\u8bfe\u7a0b\u9879\u76ee'],skills:['\u4ee3\u62ff\u5feb\u9012','\u62fc\u5916\u5356','\u62fc\u8f66','\u4e8c\u624b\u4ea4\u6613','\u8bfe\u7a0b\u7ec4\u961f','\u6bd4\u8d5b\u7ec4\u961f','\u8bba\u6587\u4e92\u52a9','PPT\u5236\u4f5c','\u8fd0\u52a8\u642d\u5b50','\u684c\u6e38','\u5f92\u6b65','\u6444\u5f71','\u5409\u4ed6','\u7f16\u7a0b','\u8bbe\u8ba1'],templates:[{label:'\u4ee3\u62ff\u5feb\u9012',text:'\u6c42\u4eba\u5e2e\u5fd9\u62ff\u4e2a\u5feb\u9012\uff0c\u83dc\u9e1f\u9a7f\u7ad9\uff0c\u4eca\u592918\u70b9\u524d\uff0c\u6709\u507f3\u5143'},{label:'\u62fc\u5916\u5356',text:'\u6709\u4eba\u4e00\u8d77\u62fc\u5916\u5356\u5417\uff1f\u60f3\u70b9XX\u5bb6\uff0c\u51d1\u6ee1\u51cf'},{label:'\u5468\u672b\u7ec4\u5c40',text:'\u5468\u672b\u60f3\u53bb\u5f92\u6b65/\u6253\u7fbd\u6bdb\u7403/\u73a9\u684c\u6e38\uff0c\u627e\u4eba\u4e00\u8d77'},{label:'\u6280\u80fd\u4ea4\u6362',text:'\u6211\u4f1aPython\uff0c\u60f3\u627e\u4eba\u6559\u6211\u5409\u4ed6/\u5e2e\u6211\u505aPPT'},{label:'\u8bfe\u7a0b\u7ec4\u961f',text:'\u671f\u672b\u5927\u4f5c\u4e1a\u9700\u8981\u7ec4\u961f\uff0c\u7f3a\u4e00\u4e2a\u4f1a\u524d\u7aef\u7684'}],chatIntro:'\u8bf4\u8bf4\u4f60\u9700\u8981\u4ec0\u4e48\u5e2e\u5fd9\uff0c\u6216\u8005\u60f3\u627e\u4ec0\u4e48\u642d\u5b50\uff0cAI \u5e2e\u4f60\u5339\u914d'}};

const SKILLS={generate_prd:{id:'generate_prd',icon:'📋',name:'\u751f\u6210\u9700\u6c42\u6587\u6863',desktop:'\u5c06\u7528\u6237\u7684\u63cf\u8ff0\u6574\u7406\u4e3a\u7ed3\u6784\u5316\u9700\u6c42\u6587\u6863',instruct:'\u8bf7\u628a\u7528\u6237\u521a\u624d\u63cf\u8ff0\u7684\u5185\u5bb9\u6574\u7406\u6210\u7ed3\u6784\u5316\u9700\u6c42\u6587\u6863\u3002\u8f93\u51fa\u683c\u5f0f\uff1a\u6807\u9898\u3001\u9879\u76ee\u80cc\u666f\u3001\u6838\u5fc3\u76ee\u6807\u3001\u6240\u9700\u6280\u80fd\u3001\u9884\u671f\u65f6\u95f4\u7ebf\u3001\u9884\u671f\u6210\u679c\u3002',category:'official',author:'CollabAI',tags:['\u6587\u6863','\u9700\u6c42'],installs:12580,version:'1.3',isInstallable:!0},diagnose:{id:'diagnose',icon:'🎯',name:'\u8bca\u65ad\u9700\u6c42',desktop:'\u4ece\u5e02\u573a/\u6280\u672f/\u8d44\u6e90\u4e09\u7ef4\u5ea6\u5206\u6790\u53ef\u884c\u6027',instruct:'\u8bf7\u4ece\u5e02\u573a\u53ef\u884c\u6027\u3001\u6280\u672f\u96be\u5ea6\u3001\u8d44\u6e90\u9700\u6c42\u4e09\u4e2a\u7ef4\u5ea6\u8bca\u65ad\u7528\u6237\u521a\u624d\u63cf\u8ff0\u7684\u9700\u6c42\uff0c\u6307\u51fa\u6f5c\u5728\u98ce\u9669\u548c\u88ab\u5ffd\u7565\u7684\u5173\u952e\u70b9\uff0c\u7ed9\u51fa\u52a1\u5b9e\u5efa\u8bae\u3002',category:'official',author:'CollabAI',tags:['\u8bca\u65ad','\u5206\u6790'],installs:9820,version:'1.2',isInstallable:!0},optimize:{id:'optimize',icon:'\u2728',name:'\u4f18\u5316\u63cf\u8ff0',desktop:'\u8ba9\u9700\u6c42\u63cf\u8ff0\u66f4\u5438\u5f15\u534f\u4f5c\u8005',instruct:'\u8bf7\u4f18\u5316\u7528\u6237\u521a\u624d\u7684\u9700\u6c42\u63cf\u8ff0\uff0c\u4f7f\u5176\u66f4\u5438\u5f15\u6f5c\u5728\u534f\u4f5c\u8005\u3002\u7a81\u51fa\uff1a\u9879\u76ee\u4eae\u70b9\u3001\u4e3a\u4ec0\u4e48\u503c\u5f97\u53c2\u4e0e\u3001\u5408\u4f5c\u80fd\u83b7\u5f97\u4ec0\u4e48\u3002\u4fdd\u6301\u7b80\u6d01\u6709\u529b\u3002',category:'official',author:'CollabAI',tags:['\u4f18\u5316','\u6587\u6848'],installs:8640,version:'1.1',isInstallable:!0},estimate:{id:'estimate',icon:'⏱️',name:'\u4f30\u7b97\u5468\u671f',desktop:'\u7ed9\u9879\u76ee\u9636\u6bb5\u5212\u5206\u548c\u65f6\u95f4\u4f30\u7b97',instruct:'\u8bf7\u6839\u636e\u7528\u6237\u63cf\u8ff0\u7684\u9879\u76ee\u9700\u6c42\uff0c\u7ed9\u51fa\u5206\u9636\u6bb5\u7684\u5468\u671f\u4f30\u7b97\u3002\u62c6\u6210 MVP/\u6838\u5fc3\u529f\u80fd/\u4e0a\u7ebf/\u8fed\u4ee3\u56db\u4e2a\u9636\u6bb5\uff0c\u6bcf\u4e2a\u9636\u6bb5\u7ed9\u65f6\u95f4\u8303\u56f4\u548c\u5173\u952e\u4ea4\u4ed8\u7269\u3002',category:'official',author:'CollabAI',tags:['\u5468\u671f','\u89c4\u5212'],installs:7200,version:'1.0',isInstallable:!0},invite:{id:'invite',icon:'📨',name:'\u751f\u6210\u9080\u8bf7\u6587\u6848',desktop:'\u4e3a\u5339\u914d\u5230\u7684\u534f\u4f5c\u8005\u751f\u6210\u4e2a\u6027\u5316\u9080\u8bf7',instruct:'\u8bf7\u57fa\u4e8e\u5f53\u524d\u9700\u6c42\u548c\u5339\u914d\u5230\u7684\u534f\u4f5c\u8005\u4fe1\u606f\uff0c\u751f\u6210\u4e00\u6bb5\u81ea\u7136\u3001\u771f\u8bda\u7684\u534f\u4f5c\u9080\u8bf7\u6587\u6848\u3002\u5305\u542b\uff1a\u9879\u76ee\u7b80\u4ecb\u3001\u4e3a\u4ec0\u4e48\u9009\u5bf9\u65b9\u3001\u5408\u4f5c\u6a21\u5f0f\u5efa\u8bae\u3002',category:'official',author:'CollabAI',tags:['\u9080\u8bf7','\u534f\u4f5c'],installs:6100,version:'1.0',isInstallable:!0},summary:{id:'summary',icon:'📊',name:'\u534f\u4f5c\u5468\u62a5',desktop:'\u81ea\u52a8\u603b\u7ed3\u7fa4\u7ec4\u8fd1\u671f\u8ba8\u8bba\u5185\u5bb9',instruct:'\u8bf7\u603b\u7ed3\u5f53\u524d\u7fa4\u7ec4\u6700\u8fd1\u7684\u8ba8\u8bba\u8981\u70b9\u3002\u6309\u4ee5\u4e0b\u7ed3\u6784\uff1a\u672c\u5468\u8fdb\u5c55\u3001\u5173\u952e\u51b3\u7b56\u3001\u5f85\u89e3\u51b3\u95ee\u9898\u3001\u4e0b\u5468\u8ba1\u5212\u3002\u5982\u679c\u8ba8\u8bba\u5185\u5bb9\u4e0d\u8db3\uff0c\u544a\u77e5\u65e0\u6cd5\u603b\u7ed3\u3002',category:'official',author:'CollabAI',tags:['\u5468\u62a5','\u603b\u7ed3'],installs:5400,version:'1.0',isInstallable:!0},generate_ui:{id:'generate_ui',icon:'🖼️',name:'\u751f\u6210 UI \u539f\u578b',desktop:'\u6839\u636e\u63cf\u8ff0\u751f\u6210\u53ef\u4ea4\u4e92\u7684\u4ea7\u54c1\u754c\u9762\u539f\u578b',instruct:'\u8bf7\u6839\u636e\u7528\u6237\u63cf\u8ff0\u7684\u4ea7\u54c1\u9700\u6c42\uff0c\u8f93\u51fa UI \u539f\u578b\u65b9\u6848\uff1a\u9875\u9762\u7ed3\u6784\u3001\u6838\u5fc3\u7ec4\u4ef6\u3001\u4ea4\u4e92\u6d41\u7a0b\u3001\u8bbe\u8ba1\u5efa\u8bae\uff08\u914d\u8272\u4e0e\u5e03\u5c40\uff09\u3002\u7528 Markdown \u5206\u8282\u63cf\u8ff0\uff0c\u4fbf\u4e8e\u8bbe\u8ba1\u5e08\u843d\u5730\u3002',category:'official',author:'CollabAI',tags:['\u539f\u578b','UI','\u8bbe\u8ba1'],installs:4300,version:'1.0',isInstallable:!0},swot:{id:'swot',icon:'🔍',name:'SWOT \u5206\u6790',desktop:'\u7ade\u54c1 SWOT \u5206\u6790\u77e9\u9635',instruct:'\u8bf7\u5bf9\u7528\u6237\u63cf\u8ff0\u7684\u9879\u76ee\u505a SWOT \u5206\u6790\uff0c\u6309\u4f18\u52bf\u3001\u52a3\u52bf\u3001\u673a\u4f1a\u3001\u5a01\u80c1\u56db\u8c61\u9650\u8f93\u51fa\uff0c\u6bcf\u6761 2-4 \u70b9\uff0c\u5e76\u7ed9\u51fa 1-2 \u6761\u6218\u7565\u5efa\u8bae\u3002',category:'community',author:'\u7b56\u7565\u5927\u5e08',tags:['\u5206\u6790','\u7ade\u54c1','\u5546\u4e1a'],installs:3200,version:'1.0',isInstallable:!0},roadmap:{id:'roadmap',icon:'🗺️',name:'\u4ea7\u54c1\u8def\u7ebf\u56fe',desktop:'\u751f\u6210\u5206\u9636\u6bb5\u4ea7\u54c1\u8def\u7ebf\u56fe',instruct:'\u8bf7\u6839\u636e\u7528\u6237\u9700\u6c42\u751f\u6210\u5206\u9636\u6bb5\u4ea7\u54c1\u8def\u7ebf\u56fe\uff1a\u91cc\u7a0b\u7891\u3001\u65f6\u95f4\u8303\u56f4\u3001\u5173\u952e\u4ea4\u4ed8\u7269\u3001\u4f9d\u8d56\u5173\u7cfb\u3002\u7528\u8868\u683c\u6216\u5217\u8868\u5448\u73b0\u3002',category:'community',author:'PM\u52a9\u624b',tags:['\u89c4\u5212','\u4ea7\u54c1','\u8def\u7ebf\u56fe'],installs:1800,version:'1.0',isInstallable:!0}};

const DOMAIN_SKILL_MAP={tech:['generate_prd','diagnose','optimize','estimate','invite','summary','generate_ui'],design:['generate_prd','diagnose','optimize','estimate','invite','generate_ui'],content:['generate_prd','diagnose','optimize','invite','generate_ui'],education:['generate_prd','diagnose','optimize','estimate','invite','generate_ui'],business:['generate_prd','diagnose','optimize','estimate','invite','generate_ui'],campus:['generate_prd','diagnose','optimize','invite']};

const WORKFLOWS=[{id:'wf1',name:'🚀 \u4ece\u60f3\u6cd5\u5230\u56e2\u961f',desc:'\u5b8c\u6574\u6d41\u7a0b\uff1a\u68b3\u7406\u9700\u6c42 → \u5339\u914d\u534f\u4f5c\u8005 → \u7ec4\u961f\u5f00\u59cb\u534f\u4f5c',steps:[{skillId:'generate_prd',icon:'📋',title:'\u751f\u6210\u9700\u6c42\u6587\u6863'},{skillId:'diagnose',icon:'🎯',title:'\u8bca\u65ad\u9700\u6c42\u53ef\u884c\u6027'},{skillId:'optimize',icon:'\u2728',title:'\u4f18\u5316\u9700\u6c42\u63cf\u8ff0'},{skillId:'invite',icon:'📨',title:'\u751f\u6210\u9080\u8bf7\u6587\u6848'},{action:'match_forward',skillId:'__action_match_forward__',icon:'🔍',title:'\u667a\u80fd\u5339\u914d\u534f\u4f5c\u8005'}],tags:['\u5b8c\u6574\u6d41\u7a0b','\u63a8\u8350']},{id:'wf2',name:'🎨 \u539f\u578b\u751f\u6210\u5668',desc:'\u9700\u6c42\u63cf\u8ff0 → UI \u539f\u578b → \u8fed\u4ee3\u4f18\u5316',steps:[{skillId:'generate_prd',icon:'📋',title:'\u6574\u7406\u9700\u6c42'},{skillId:'generate_ui',icon:'🖼️',title:'\u751f\u6210 UI \u539f\u578b'}],tags:['\u8bbe\u8ba1','\u5feb\u901f\u539f\u578b']},{id:'wf3',name:'📊 \u9879\u76ee\u4f53\u68c0',desc:'\u591a\u7ef4\u5ea6\u8bc4\u4f30\u9879\u76ee + \u4f18\u5316 + \u91cd\u65b0\u5339\u914d',steps:[{skillId:'diagnose',icon:'🎯',title:'\u8bca\u65ad\u8bc4\u4f30'},{skillId:'optimize',icon:'\u2728',title:'\u4f18\u5316\u63cf\u8ff0'},{skillId:'swot',icon:'🔍',title:'SWOT \u5206\u6790'}],tags:['\u8bc4\u4f30','\u4f18\u5316']}];

G('/api/config', ()=>({authMode:'dev',devAuthCode:DEV_AUTH_CODE,domains:{tech:{id:'tech',name:'💻 \u6280\u672f\u5f00\u53d1',icon:'💻'},design:{id:'design',name:'🎨 \u521b\u610f\u8bbe\u8ba1',icon:'🎨'},content:{id:'content',name:'\u270d️ \u5185\u5bb9\u521b\u4f5c',icon:'\u270d️'},education:{id:'education',name:'📚 \u77e5\u8bc6\u6559\u80b2',icon:'📚'},business:{id:'business',name:'💼 \u5546\u4e1a\u8fd0\u8425',icon:'💼'},campus:{id:'campus',name:'🏫 \u6821\u56ed\u751f\u6d3b',icon:'🏫'}}}));
G('/api/config/domains', ()=>DOMAINS);
G('/api/config/skills', ()=>({skills:SKILLS,domainSkillMap:DOMAIN_SKILL_MAP}));
G('/api/config/workflows', ()=>WORKFLOWS);

// ─── Auth ───────────────────────────
G('/api/auth/config', ()=>{
  const githubEnabled = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  return {mode:'dev',emailAuthEnabled:true,githubEnabled,githubClientId:process.env.GITHUB_CLIENT_ID||'',devAuthCode:DEV_AUTH_CODE};
});
P('/api/auth/sms/send', ()=>({ok:true}));
P('/api/auth/send-code', ()=>({ok:true}));
P('/api/auth/login', async (p,b)=>{
  const {phone,code}=b;
  if(code!==DEV_AUTH_CODE) return err('\u9a8c\u8bc1\u7801\u9519\u8bef');
  let u=await db.collection('users').where({phone}).limit(1).get();
  if(!u.data.length){ const r=await db.collection('users').add({phone,name:'\u7528\u6237'+phone.slice(-4),skills:[],position:'',createdAt:Date.now()}); u={data:[{_id:r.id,phone,name:'\u7528\u6237'+phone.slice(-4),skills:[],position:''}]}; }
  const token=jwt.sign({userId:u.data[0]._id},JWT_SECRET,{expiresIn:'7d'});
  const user={...u.data[0], id:u.data[0]._id};
  return {token,user};
});
P('/api/auth/register', async (p,b)=>{
  const {email,password,name}=b;
  if(!email||!password||!name) return err('\u9700\u8981 email\u3001password \u548c name');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('\u90ae\u7bb1\u683c\u5f0f\u4e0d\u6b63\u786e');
  if(password.length<6) return err('\u5bc6\u7801\u957f\u5ea6\u81f3\u5c11 6 \u4f4d');
  const existing=await db.collection('users').where({email}).limit(1).get();
  if(existing.data.length) return err('\u8be5\u90ae\u7bb1\u5df2\u6ce8\u518c',409);
  const passwordHash=await bcrypt.hash(password,10);
  const r=await db.collection('users').add({email,passwordHash,name,avatar:name[0]||'\u7528',skills:[],position:'',domain:'tech',collabScore:null,projects:0,resources:[],portfolio:[],createdAt:Date.now(),updatedAt:Date.now()});
  const token=jwt.sign({userId:r.id},JWT_SECRET,{expiresIn:'7d'});
  const user={_id:r.id,id:r.id,email,name,avatar:name[0]||'\u7528',skills:[],position:'',domain:'tech'};
  return {token,user};
});
P('/api/auth/email-login', async (p,b)=>{
  const {email,password}=b;
  if(!email||!password) return err('\u9700\u8981 email \u548c password');
  const u=await db.collection('users').where({email}).limit(1).get();
  if(!u.data.length||!u.data[0].passwordHash) return err('\u90ae\u7bb1\u6216\u5bc6\u7801\u9519\u8bef',401);
  const match=await bcrypt.compare(password,u.data[0].passwordHash);
  if(!match) return err('\u90ae\u7bb1\u6216\u5bc6\u7801\u9519\u8bef',401);
  await db.collection('users').doc(u.data[0]._id).update({lastSeenAt:Date.now()});
  const token=jwt.sign({userId:u.data[0]._id},JWT_SECRET,{expiresIn:'7d'});
  const user={...u.data[0],id:u.data[0]._id};
  return {token,user};
});
// ─── \u5bc6\u7801\u91cd\u7f6e\uff08\u90ae\u7bb1 token \u94fe\u63a5\u65b9\u5f0f\uff09 ──
const crypto = require('crypto');
P('/api/auth/forgot-password', async (p,b,q)=>{
  const {email}=b;
  if(!email) return err('\u8bf7\u8f93\u5165\u90ae\u7bb1');
  const u=await db.collection('users').where({email}).limit(1).get();
  // \u65e0\u8bba\u90ae\u7bb1\u662f\u5426\u5b58\u5728\uff0c\u90fd\u8fd4\u56de\u76f8\u540c\u54cd\u5e94\uff08\u9632\u90ae\u7bb1\u63a2\u6d4b\uff09
  if(!u.data.length) return {ok:true,message:'\u5982\u679c\u8be5\u90ae\u7bb1\u5df2\u6ce8\u518c\uff0c\u91cd\u7f6e\u94fe\u63a5\u5df2\u53d1\u9001'};
  // \u751f\u6210\u5b89\u5168\u968f\u673a token
  const token=crypto.randomBytes(32).toString('hex');
  const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt=Date.now()+30*60*1000; // 30 \u5206\u949f\u8fc7\u671f
  // \u5220\u9664\u8be5\u7528\u6237\u4e4b\u524d\u7684\u672a\u4f7f\u7528 token
  const oldTokens=await db.collection('password_resets').where({userId:u.data[0]._id,used:false}).get();
  for(const ot of oldTokens.data) await db.collection('password_resets').doc(ot._id).remove();
  // \u5b58\u50a8 token hash
  await db.collection('password_resets').add({userId:u.data[0]._id,email,tokenHash,expiresAt,used:false,createdAt:Date.now()});
  // \u53d1\u9001\u90ae\u4ef6
  const RESEND_API_KEY=process.env.RESEND_API_KEY||'';
  const frontendUrl=process.env.FRONTEND_URL||'https://cloudbase-d6g8yog0ub3e56efe-1427257718.tcloudbaseapp.com';
  const resetUrl=frontendUrl+'/?reset_token='+token;
  if(RESEND_API_KEY){
    try{
      const https=require('https');
      await new Promise((resolve,reject)=>{
        const req=https.request('https://api.resend.com/emails',{
          method:'POST',
          headers:{'Authorization':'Bearer '+RESEND_API_KEY,'Content-Type':'application/json'},
        },res=>{
          const chunks=[];
          res.on('data',c=>chunks.push(c));
          res.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch(e){reject(e)}});
        });
        req.on('error',reject);
        req.write(JSON.stringify({
          from:'CollabMatch <onboarding@resend.dev>',
          to:email,
          subject:'\u5bc6\u7801\u91cd\u7f6e - CollabMatch',
          html:'<div style="max-width:480px;margin:0 auto;font-family:sans-serif;"><h2 style="color:#6c5ce7;">\u5bc6\u7801\u91cd\u7f6e</h2><p>\u4f60\u6536\u5230\u8fd9\u5c01\u90ae\u4ef6\u662f\u56e0\u4e3a\u6709\u4eba\u8bf7\u6c42\u91cd\u7f6e\u4f60\u5728 CollabMatch \u7684\u5bc6\u7801\u3002</p><a href="'+resetUrl+'" style="display:inline-block;padding:12px 24px;background:#6c5ce7;color:#fff;border-radius:8px;text-decoration:none;margin:16px 0;">\u91cd\u7f6e\u5bc6\u7801</a><p style="color:#999;font-size:12px;">\u94fe\u63a5 30 \u5206\u949f\u5185\u6709\u6548\u3002\u5982\u679c\u4e0d\u662f\u4f60\u672c\u4eba\u64cd\u4f5c\uff0c\u8bf7\u5ffd\u7565\u6b64\u90ae\u4ef6\u3002</p></div>'
        }));
        req.end();
      });
    }catch(e){console.error('Resend error:',e)}
  }
  return {ok:true,message:'\u5982\u679c\u8be5\u90ae\u7bb1\u5df2\u6ce8\u518c\uff0c\u91cd\u7f6e\u94fe\u63a5\u5df2\u53d1\u9001'};
});
P('/api/auth/reset-password', async (p,b)=>{
  const {token,newPassword}=b;
  if(!token||!newPassword) return err('\u7f3a\u5c11\u53c2\u6570');
  if(newPassword.length<6) return err('\u5bc6\u7801\u957f\u5ea6\u81f3\u5c11 6 \u4f4d');
  const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
  const r=await db.collection('password_resets').where({tokenHash,used:false}).limit(1).get();
  if(!r.data.length) return err('\u91cd\u7f6e\u94fe\u63a5\u65e0\u6548\u6216\u5df2\u8fc7\u671f');
  const reset=r.data[0];
  if(Date.now()>reset.expiresAt) return err('\u91cd\u7f6e\u94fe\u63a5\u5df2\u8fc7\u671f');
  // \u66f4\u65b0\u5bc6\u7801
  const passwordHash=await bcrypt.hash(newPassword,10);
  await db.collection('users').doc(reset.userId).update({passwordHash,updatedAt:Date.now()});
  // \u6807\u8bb0 token \u5df2\u4f7f\u7528
  await db.collection('password_resets').doc(reset._id).update({used:true});
  return {ok:true};
});
G('/api/auth/me', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); const user=addId(d.data[0]||{}); return {user}; });

// ─── GitHub OAuth: \u524d\u7aef code \u6362 token ──
P('/api/auth/github/token', async(p,b,q)=>{
  const code = b.code;
  if(!code) return err('\u7f3a\u5c11\u6388\u6743\u7801',400);
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if(!clientId||!clientSecret) return err('\u672a\u914d\u7f6e GitHub OAuth',400);
  // \u6362\u53d6 access_token
  let tokenData;
  try {
    const https = require('https');
    tokenData = await new Promise((resolve, reject) => {
      const req = https.request('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Accept':'application/json'},
      }, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch(e) { reject(e); } });
      });
      req.on('error', reject);
      req.write(JSON.stringify({client_id:clientId,client_secret:clientSecret,code}));
      req.end();
    });
  } catch(e) { return err('GitHub token exchange failed',500); }
  const accessToken = tokenData.access_token;
  if(!accessToken) return err('GitHub \u6388\u6743\u5931\u8d25',401);
  // \u83b7\u53d6\u7528\u6237\u4fe1\u606f
  let ghUser;
  try {
    const https = require('https');
    ghUser = await new Promise((resolve, reject) => {
      const req = https.request('https://api.github.com/user', {
        headers: {'Authorization':`Bearer ${accessToken}`,'Accept':'application/json','User-Agent':'CollabMatch'},
      }, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch(e) { reject(e); } });
      });
      req.on('error', reject);
      req.end();
    });
  } catch(e) { return err('\u83b7\u53d6 GitHub \u7528\u6237\u4fe1\u606f\u5931\u8d25',401); }
  if(!ghUser.id) return err('\u83b7\u53d6 GitHub \u7528\u6237\u4fe1\u606f\u5931\u8d25',401);
  // \u83b7\u53d6\u90ae\u7bb1
  let email = ghUser.email || '';
  if(!email) {
    try {
      const https = require('https');
      const emails = await new Promise((resolve, reject) => {
        const req = https.request('https://api.github.com/user/emails', {
          headers: {'Authorization':`Bearer ${accessToken}`,'Accept':'application/json','User-Agent':'CollabMatch'},
        }, res => {
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch(e) { reject(e); } });
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
  // \u67e5\u627e\u6216\u521b\u5efa\u7528\u6237
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
  const user = addId(u.data[0]);
  return {token, user};
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
P('/api/requirements', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={...b,author:u.userId,status:'draft','visibility':'public',skills:b.skills||[],matchProgress:0,background:b.background||'',goal:b.goal||'',desc:b.desc||'',timeline:b.timeline||'3-6 \u4e2a\u6708',outcome:b.outcome||'',createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('requirements').add(data); return {requirement:addId({_id:r.id,...data})}; });
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
P('/api/groups', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={name:b.name||'\u534f\u4f5c\u7fa4\u7ec4',creatorId:u.userId,reqId:b.reqId||'',members:[{id:u.userId,name:'',avatar:''}],messages:[],createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('groups').add(data); const group=addId({_id:r.id,...data}); return {group}; });
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
  if(!convId||!msg) return err('\u7f3a\u5c11 conversationId \u6216 message');
  const c=await db.collection('conversations').doc(convId).get();
  if(!c.data.length) return err('\u5bf9\u8bdd\u4e0d\u5b58\u5728',404);
  const msgs=c.data[0].messages||[];
  const userMsg={role:'user',content:msg,time:new Date().toISOString()};
  msgs.push(userMsg);
  // ── LLM \u63a5\u5165\uff08\u7528\u6237\u81ea\u5b9a\u4e49 > \u8c46\u5305 > Hermes > \u79bb\u7ebf\uff09 ──
  let reply = '';
  const systemPrompt='\u4f60\u662f\u9700\u6c42\u5339\u914d\u52a9\u624b\u3002\n\u804c\u8d23\uff1a\u7406\u89e3\u7528\u6237\u9700\u6c42\uff0c\u6574\u7406\u6210\u7ed3\u6784\u5316\u6587\u6863\uff0c\u8bc4\u4f30\u53ef\u884c\u6027\uff0c\u5e2e\u627e\u534f\u4f5c\u8005\u3002\n\n## \u9700\u6c42\u5bf9\u9f50\u89c4\u5219\n\u5f53\u7528\u6237\u63cf\u8ff0\u4e86\u4e00\u4e2a\u9879\u76ee\u60f3\u6cd5\u6216\u9700\u6c42\u65f6\uff0c\u5148\u5224\u65ad\u4fe1\u606f\u662f\u5426\u5145\u5206\u3002\u5173\u952e\u7ef4\u5ea6\uff1a\n1. \u505a\u4ec0\u4e48 — \u9879\u76ee\u6838\u5fc3\u76ee\u6807\n2. \u7f3a\u4ec0\u4e48 — \u9700\u8981\u4ec0\u4e48\u6837\u7684\u534f\u4f5c\u8005\n3. \u600e\u4e48\u505a — \u534f\u4f5c\u65b9\u5f0f\uff08\u8fdc\u7a0b/\u540c\u57ce/\u7ebf\u4e0b\uff09\u3001\u65f6\u95f4\u6295\u5165\n\n\u5982\u679c\u4fe1\u606f\u4e0d\u591f\uff0c\u5148\u8ffd\u95ee\u518d\u6574\u7406\u3002\u8ffd\u95ee\u65f6\uff1a\n- \u4e00\u6b21\u6700\u591a\u95ee 2-3 \u4e2a\u5173\u952e\u95ee\u9898\uff0c\u522b\u50cf\u5ba1\u8baf\n- \u7528\u9009\u62e9\u9898\u800c\u975e\u5f00\u653e\u5f0f\u95ee\u9898\uff0c\u6bd4\u5982"\u4f60\u662f\u60f3\u505a\u8fdc\u7a0b\u534f\u4f5c\u8fd8\u662f\u540c\u57ce\uff1f"\n- \u53ef\u4ee5\u7ed9\u5efa\u8bae\uff0c\u6bd4\u5982"\u542c\u8d77\u6765\u50cf\u662f\u4e2a Side Project\uff0c\u4f60\u6bcf\u5468\u5927\u6982\u80fd\u6295\u5165\u591a\u5c11\u65f6\u95f4\uff1f"\n- \u5982\u679c\u7528\u6237\u5df2\u7ecf\u8bf4\u6e05\u695a\u4e86\u5927\u90e8\u5206\uff0c\u5c31\u522b\u8ffd\u95ee\u4e86\uff0c\u76f4\u63a5\u6574\u7406\n\n\u53ea\u6709\u4fe1\u606f\u8db3\u591f\u65f6\uff0c\u624d\u751f\u6210\u7ed3\u6784\u5316\u6587\u6863\uff0c\u672b\u5c3e\u52a0\u4e00\u884c\uff1a<!--REQ:{"title":"...","skills":[],"background":"...","goal":"...","timeline":"3-6 \u4e2a\u6708","outcome":"..."}-->\n\n\u8bf4\u8bdd\u98ce\u683c\uff1a\u5e72\u8106\u5229\u843d\uff0c\u77ed\u53e5\u4e3a\u4e3b\uff0c\u4e0d\u5570\u55e6\u3002\u50cf\u804a\u5929\u4e0d\u50cf\u5199\u62a5\u544a\uff0c\u522b\u7528"\u9996\u5148...\u5176\u6b21..."\u3002\u53ef\u4ee5\u6709\u60c5\u7eea\u3001\u6709\u5224\u65ad\u3002\u53ef\u9760\u4f46\u4e0d\u6b7b\u677f\uff0c\u5076\u5c14\u5f00\u73a9\u7b11\u3002\u7ed9\u5efa\u8bae\u4f46\u4e0dpush\uff0c\u6709\u81ea\u5df1\u7684\u4e3b\u89c1\uff0c\u6562\u53cd\u5bf9\u4e0d\u5408\u7406\u7684\u60f3\u6cd5\u3002\u5148\u5904\u7406\u6838\u5fc3\u95ee\u9898\uff0c\u7ec6\u8282\u770b\u60c5\u51b5\u8865\u3002\u4e0d\u786e\u5b9a\u5c31\u76f4\u8bf4\uff0c\u4e0d\u7f16\u3002\u4e2d\u6587\u56de\u590d\uff0c\u4e0d\u8d85\u8fc7300\u5b57\u3002';
  const chatMsgs=[{role:'system',content:systemPrompt},...msgs.filter(m=>m.role==='user'||m.role==='ai').slice(-6).map(m=>({role:m.role==='ai'?'assistant':'user',content:m.content}))];

  // \u4f18\u5148\u4f7f\u7528\u7528\u6237\u81ea\u5b9a\u4e49\u6a21\u578b
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
        reply = '[\u4f60\u7684\u6a21\u578b\u8fd4\u56de\u9519\u8bef\uff08' + userRes.status + '\uff09\uff0c\u5df2\u56de\u9000\u5230\u5e73\u53f0\u6a21\u578b]';
      } else {
        const d = await userRes.json();
        reply = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '[\u6a21\u578b\u6ca1\u6709\u8fd4\u56de\u6709\u6548\u56de\u590d]';
      }
    } catch(e) {
      console.error('[UserLLM]', e.message);
      reply = '[\u4f60\u7684\u6a21\u578b\u8fde\u63a5\u5931\u8d25\uff1a' + e.message.slice(0, 60) + '\uff0c\u5df2\u56de\u9000\u5230\u5e73\u53f0\u6a21\u578b]';
    }
    // \u5982\u679c\u7528\u6237\u6a21\u578b\u6210\u529f\uff0c\u76f4\u63a5\u8df3\u5230\u4fdd\u5b58
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
    // \u4f7f\u7528\u8c46\u5305 API
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
        reply = '[AI \u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff08\u9519\u8bef\u7801 ' + doubaoRes.status + '\uff09\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002]';
      } else {
        const d = await doubaoRes.json();
        reply = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '[AI \u6ca1\u6709\u8fd4\u56de\u6709\u6548\u56de\u590d\uff0c\u80fd\u6362\u4e2a\u65b9\u5f0f\u63cf\u8ff0\u4f60\u7684\u95ee\u9898\uff1f]';
      }
    } catch(e) {
      console.error('[Doubao]', e.message);
      reply = '[AI \u670d\u52a1\u51fa\u9519\uff1a' + e.message.slice(0, 80) + ']';
    }
  } else if (!reply) {
    // Hermes Agent \u56de\u9000
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
          reply = '[AI \u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff08\u9519\u8bef\u7801 '+hermesRes.status+'\uff09\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002\u4f60\u4e5f\u53ef\u4ee5\u76f4\u63a5\u53bb\u9700\u6c42\u5e7f\u573a\u6d4f\u89c8\u5df2\u53d1\u5e03\u7684\u9700\u6c42\u3002]';
        } else {
          const d = await hermesRes.json();
          reply = (d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||'[AI \u6ca1\u6709\u8fd4\u56de\u6709\u6548\u56de\u590d\uff0c\u80fd\u6362\u4e2a\u65b9\u5f0f\u63cf\u8ff0\u4f60\u7684\u95ee\u9898\u5417\uff1f]';
        }
      } catch(e) {
        console.error('[Hermes]', e.message);
        if (e.name==='AbortError' || String(e).includes('timeout')) reply = '[AI \u54cd\u5e94\u8d85\u65f6\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\uff0c\u6216\u5c1d\u8bd5\u66f4\u7b80\u6d01\u5730\u63cf\u8ff0\u4f60\u7684\u95ee\u9898\u3002]';
        else if (String(e).includes('ENOTFOUND')||String(e).includes('ECONNREFUSED')) reply = '[\u65e0\u6cd5\u8fde\u63a5 AI \u670d\u52a1\uff0c\u8bf7\u786e\u8ba4 Hermes Agent \u662f\u5426\u6b63\u5e38\u8fd0\u884c\uff0c\u5e76\u68c0\u67e5\u4e91\u51fd\u6570\u73af\u5883\u53d8\u91cf HERMES_AGENT_URL \u662f\u5426\u914d\u7f6e\u6b63\u786e\u3002]';
        else reply = '[AI \u670d\u52a1\u51fa\u9519\uff1a'+e.message.slice(0,80)+']';
      }
    } else {
      reply = '\u6b22\u8fce\u4f7f\u7528\u9700\u6c42\u5339\u914d\uff01\n\n\uff08\u5f53\u524d\u4e3a\u79bb\u7ebf\u6a21\u5f0f\uff0c\u7ba1\u7406\u5458\u8bf7\u5728\u4e91\u51fd\u6570\u73af\u5883\u53d8\u91cf\u4e2d\u914d\u7f6e DOUBAO_API_KEY \u548c DOUBAO_MODEL \u4ee5\u542f\u7528 AI \u5bf9\u8bdd\u529f\u80fd\u3002\uff09\n\n\u4f60\u53ef\u4ee5\u7ee7\u7eed\u548c\u6211\u5bf9\u8bdd\uff08\u79bb\u7ebf\u6a21\u5f0f\u4ec5\u8fd4\u56de\u63d0\u793a\uff09\uff0c\u6216\u8005\u76f4\u63a5\u53bb\u9700\u6c42\u5e7f\u573a\u6d4f\u89c8\u5df2\u53d1\u5e03\u7684\u9700\u6c42\u3002';
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
  if(!skill) return err('\u6280\u80fd\u4e0d\u5b58\u5728',404);
  const reply='\u5df2\u6267\u884c\u300c'+skill.name+'\u300d\uff1a\n\n\u6839\u636e\u4f60\u7684\u9700\u6c42\uff0c\u6211\u8fdb\u884c\u4e86\u5206\u6790\u5e76\u751f\u6210\u4ee5\u4e0b\u7ed3\u679c\u3002\u4f60\u53ef\u4ee5\u67e5\u770b\u5e76\u8fdb\u4e00\u6b65\u5b8c\u5584\u3002';
  return {message:{role:'ai',content:reply,time:new Date().toISOString()}};
});

// ─── Conversations ──────────────────
G('/api/conversations', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('conversations').where({userId:u.userId}).orderBy('updatedAt','desc').get(); const items=addIds(r.data); return {items,total:items.length}; });
P('/api/conversations', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={userId:u.userId,title:b.title||'\u65b0\u5bf9\u8bdd',domain:b.domain||'tech',messages:[{role:'ai',content:'\u55e8\uff01\u6b22\u8fce\u6765\u5230\u9700\u6c42\u5339\u914d 👋\n\n\u544a\u8bc9\u6211\u4f60\u60f3\u505a\u4ec0\u4e48\u9879\u76ee\uff0c\u6211\u6765\u5e2e\u4f60\u6574\u7406\u9700\u6c42\u3001\u5339\u914d\u534f\u4f5c\u8005\u3002\n\n\u76f4\u63a5\u8bf4\u5c31\u884c\uff0c\u4e0d\u7528\u60f3\u592a\u591a\u3002',time:new Date().toISOString()}],requirementId:b.requirementId||'',createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('conversations').add(data); const conv=addId({_id:r.id,...data}); return {conversation:conv}; });
G('/api/conversations/:id', async(p)=>{ const r=await db.collection('conversations').doc(p.id).get(); const conv=addId(r.data[0]); return conv?{conversation:conv}:err('Not found',404); });
P('/api/conversations/:id', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const c=await db.collection('conversations').doc(p.id).get(); if(!c.data.length) return err('Not found',404); const msgs=c.data[0].messages||[]; msgs.push({role:'user',content:b.text||b.content||'',createdAt:Date.now()}); msgs.push({role:'ai',content:b.text?'\u6536\u5230\u3002\u5173\u4e8e\u300c'+(b.text||'').slice(0,30)+'\u300d\uff0c\u6211\u6765\u5e2e\u4f60\u5206\u6790\u3002':'\u6536\u5230\u4f60\u7684\u6d88\u606f\u3002',createdAt:Date.now()}); await db.collection('conversations').doc(p.id).update({messages:msgs,updatedAt:Date.now()}); return {ok:true}; });
D('/api/conversations/:id', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('conversations').doc(p.id).remove(); return {ok:true}; });
P('/api/conversations/:id/forward', async(p,b,q)=>{ return {ok:true,message:'Forwarded'}; });

// ─── Files ──────────────────────────
P('/api/conversations/:id/attachments', async(p,b,q)=>{ const u=auth(q.headers.authorization); return {ok:true,fileUrl:b.fileData||''}; });

// ─── Skills ─────────────────────────
G('/api/skills/market', async()=>{ const items=Object.values(SKILLS).filter(s=>s.isInstallable); return {items,total:items.length}; });
G('/api/skills/:skillId', async(p)=>{ const s=SKILLS[p.skillId]; return s?{skill:s}:err('\u6280\u80fd\u4e0d\u5b58\u5728',404); });
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
P('/api/workflows/run', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const wfId=b.workflowId||''; const ctx=b.context||''; const steps=[]; const wf=WORKFLOWS.find(w=>w.id===wfId); if(!wf) return err('\u5de5\u4f5c\u6d41\u4e0d\u5b58\u5728',404); for(const s of wf.steps){ if(s.skillId){ const skill=SKILLS[s.skillId]; if(skill) steps.push({title:s.title,result:'\u5df2\u6267\u884c\u300c'+skill.name+'\u300d—— \u57fa\u4e8e\u4e0a\u4e0b\u6587\uff1a'+ctx.slice(0,50)}); } } return {messages:steps}; });
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
  {name:'create_requirement',description:'\u5728\u9700\u6c42\u5339\u914d\u5e73\u53f0\u521b\u5efa\u534f\u4f5c\u9700\u6c42',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},title:{type:'string',description:'\u9879\u76ee\u540d\u79f0'},background:{type:'string',description:'\u9879\u76ee\u80cc\u666f'},goal:{type:'string',description:'\u9879\u76ee\u76ee\u6807'},skills:{type:'array',items:{type:'string'},description:'\u6240\u9700\u6280\u80fd'},domain:{type:'string',description:'\u9886\u57df: tech/design/content/education/business'},desc:{type:'string',description:'\u8be6\u7ec6\u63cf\u8ff0'},timeline:{type:'string',description:'\u65f6\u95f4\u7ebf'},outcome:{type:'string',description:'\u9884\u671f\u6210\u679c'}},required:['token','title']}},
  {name:'publish_requirement',description:'\u5c06\u8349\u7a3f\u9700\u6c42\u53d1\u5e03\u5230\u5e7f\u573a',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},requirement_id:{type:'string',description:'\u9700\u6c42 ID'},visibility:{type:'string',description:'\u53ef\u89c1\u6027: public/match_only'}},required:['token','requirement_id']}},
  {name:'search_requirements',description:'\u641c\u7d22\u5e7f\u573a\u4e0a\u7684\u534f\u4f5c\u9700\u6c42',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},domain:{type:'string',description:'\u9886\u57df\u7b5b\u9009'},skills:{type:'array',items:{type:'string'},description:'\u6280\u80fd\u7b5b\u9009'},keyword:{type:'string',description:'\u5173\u952e\u8bcd'},limit:{type:'number',description:'\u8fd4\u56de\u6570\u91cf\u4e0a\u9650'}},required:['token']}},
  {name:'find_matches',description:'\u4e3a\u9700\u6c42\u67e5\u627e\u5339\u914d\u7684\u534f\u4f5c\u8005',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},requirement_id:{type:'string',description:'\u9700\u6c42 ID'},limit:{type:'number',description:'\u8fd4\u56de\u6570\u91cf\u4e0a\u9650'}},required:['token','requirement_id']}},
  {name:'get_requirement',description:'\u67e5\u8be2\u9700\u6c42\u8be6\u60c5',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},requirement_id:{type:'string',description:'\u9700\u6c42 ID'}},required:['token','requirement_id']}}
];

function mcpAuth(token){ try{ const p=jwt.verify(token,JWT_SECRET); return p&&p.userId?p:null; }catch{ return null; } }

async function mcpCreateRequirement(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  const data={title:args.title||'Untitled',author:u.userId,status:'draft',visibility:'public',domain:args.domain||'tech',skills:args.skills||[],background:args.background||'',goal:args.goal||'',desc:args.desc||'',timeline:args.timeline||'3-6 \u4e2a\u6708',outcome:args.outcome||'',matchProgress:0,createdAt:Date.now(),updatedAt:Date.now()};
  const r=await db.collection('requirements').add(data);
  return {id:r.id,title:data.title,status:data.status,message:'\u9700\u6c42\u5df2\u521b\u5efa\uff08\u8349\u7a3f\uff09\u3002\u8c03\u7528 publish_requirement \u53d1\u5e03\u5230\u5e7f\u573a\u3002'};
}
async function mcpPublishRequirement(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  const d=await db.collection('requirements').doc(args.requirement_id).get();
  if(!d.data.length) return {error:{code:-32004,message:'Requirement not found'}};
  await db.collection('requirements').doc(args.requirement_id).update({status:'open',visibility:args.visibility||'public',updatedAt:Date.now()});
  return {id:args.requirement_id,status:'open',message:'\u9700\u6c42\u5df2\u53d1\u5e03\u5230\u5e7f\u573a\u3002'};
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
  // HTTP \u8bbf\u95ee\u670d\u52a1\u53ef\u80fd\u4f1a\u622a\u6389 /api \u524d\u7f00\uff0c\u5c1d\u8bd5\u8865\u56de
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

  if(!handler) return {statusCode:404,headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({error:'Not found',path})};

  try {
    const req={headers:event.headers||{},query:event.queryStringParameters||{}};
    const result = await handler(params,body,req);
    // \u5904\u7406\u91cd\u5b9a\u5411
    if(result._redirect) {
      return {statusCode:302,headers:{'Location':result._redirect,'Access-Control-Allow-Origin':'*'},body:''};
    }
    const status=result._status||200; delete result._status;
    return {statusCode:status,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'},body:JSON.stringify(result)};
  } catch(e) {
    return {statusCode:500,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'},body:JSON.stringify({error:e.message,stack:e.stack?.split('\n').slice(0,3)})};
  }
};
