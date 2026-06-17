const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JWT_SECRET = process.env.JWT_SECRET || 'c7f3a8e2b1d4f6a9c3e5b7d9f1a2c4e6a8b0d2f4a6c8e0b3d5f7a9c1e3b5d7f9';
const DEV_AUTH_CODE = process.env.DEV_AUTH_CODE || 'xsx7ii';

function auth(h) { const t = (h||'').replace('Bearer ',''); if(!t) return null; try { return jwt.verify(t,JWT_SECRET); } catch(e) { return null; } }
function err(msg, code) { return { _status: code||400, error: msg }; }
function stripSecrets(obj) { if(!obj||typeof obj!=='object') return obj||{}; const{passwordHash,apiToken,...rest}=obj; return rest; }
function addId(d) { if(!d||typeof d!='object') return d; if(d._id&&!d.id) d.id=String(d._id); return d; }
function addIds(arr) { if(!Array.isArray(arr)) return arr; return arr.map(addId); }
// 安全写入集合 — 如果集合不存在则自动创建
async function safeAdd(collection, data) {
  try { return await db.collection(collection).add(data); }
  catch(e) {
    if(e.message && e.message.includes('not exist')) {
      try { await db.createCollection(collection); return await db.collection(collection).add(data); } catch(e2) { console.error('createCollection failed:', collection, e2.message); return null; }
    }
    throw e;
  }
}
async function safeQuery(collection, query) {
  try { return await query.get(); }
  catch(e) {
    if(e.message && e.message.includes('not exist')) {
      try { await db.createCollection(collection); } catch(e2) {}
      return { data: [] };
    }
    throw e;
  }
}
// 安全写入集合（按 userId 为 _id 做 upsert）
async function safeSet(collection, docId, data) {
  try { return await db.collection(collection).doc(docId).set(data); }
  catch(e) {
    if(e.message && e.message.includes('not exist')) {
      try { await db.createCollection(collection); return await db.collection(collection).doc(docId).set(data); } catch(e2) { console.error('safeSet failed:', collection, e2.message); return null; }
    }
    throw e;
  }
}
// 计算两点间 Haversine 距离（单位：米）
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// L-05: MongoDB memory server \u4e0d\u652f\u6301\u6301\u4e45\u5316\u7d22\u5f15\u3002\u751f\u4ea7\u73af\u5883\u5efa\u8bae\u5728\u4ee5\u4e0b\u96c6\u5408\u521b\u5efa\u7d22\u5f15\uff1a
//   - users: { phone: 1 } unique, { skills: 1 }, { lastSeenAt: -1 }
//   - requirements: { status: 1, visibility: 1, createdAt: -1 }, { author: 1 }, { skills: 1 }
//   - applications: { requirementId: 1, applicant: 1 }, { applicant: 1 }
//   - conversations: { userId: 1, updatedAt: -1 }
//   - groups: { creatorId: 1 }, { 'members.id': 1 }
//   \u793a\u4f8b: db.collection('users').createIndex({ phone: 1 }, { unique: true })

const R = {}; // routes
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

G('/api/config', ()=>({authMode:'dev',domains:{tech:{id:'tech',name:'💻 \u6280\u672f\u5f00\u53d1',icon:'💻'},design:{id:'design',name:'🎨 \u521b\u610f\u8bbe\u8ba1',icon:'🎨'},content:{id:'content',name:'\u270d️ \u5185\u5bb9\u521b\u4f5c',icon:'\u270d️'},education:{id:'education',name:'📚 \u77e5\u8bc6\u6559\u80b2',icon:'📚'},business:{id:'business',name:'💼 \u5546\u4e1a\u8fd0\u8425',icon:'💼'},campus:{id:'campus',name:'🏫 \u6821\u56ed\u751f\u6d3b',icon:'🏫'}}}));
G('/api/config/domains', ()=>DOMAINS);
G('/api/config/skills', ()=>({skills:SKILLS,domainSkillMap:DOMAIN_SKILL_MAP}));
G('/api/config/workflows', ()=>WORKFLOWS);

// ─── Auth ───────────────────────────
G('/api/auth/config', ()=>{
  const githubEnabled = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  return {mode:'dev',emailAuthEnabled:true,githubEnabled,githubClientId:process.env.GITHUB_CLIENT_ID||''};
});
P('/api/auth/sms/send', ()=>({ok:true}));
P('/api/auth/send-code', ()=>({ok:true}));
P('/api/auth/login', async (p,b)=>{
  const {phone,code}=b;
  if(code!==DEV_AUTH_CODE) return err('\u9a8c\u8bc1\u7801\u9519\u8bef');
  let u=await db.collection('users').where({phone}).limit(1).get();
  if(!u.data.length){ const r=await db.collection('users').add({phone,name:'用户'+phone.slice(-4),skills:[],position:'',createdAt:Date.now()}); u={data:[{_id:r.id,phone,name:'用户'+phone.slice(-4),skills:[],position:''}]}; }
  const token=jwt.sign({userId:String(u.data[0]._id)},JWT_SECRET,{expiresIn:'7d'});
  const user={...stripSecrets(u.data[0]),id:String(u.data[0]._id)};
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
  const r=await db.collection('users').add({email,passwordHash,name,avatar:name[0]||'用',experienceLevel:'novice',preferences:[],hikeFrequency:'monthly1',emergencyContacts:[],creditScore:100,hikeCount:0,totalDistance:0,city:'',skills:[],position:'',domain:'tech',collabScore:null,projects:0,resources:[],portfolio:[],createdAt:Date.now(),updatedAt:Date.now()});
  const token=jwt.sign({userId:r.id},JWT_SECRET,{expiresIn:'7d'});
  const user={_id:r.id,id:r.id,email,name,avatar:name[0]||'用',experienceLevel:'novice',preferences:[],hikeFrequency:'monthly1',creditScore:100,hikeCount:0,totalDistance:0,city:'',skills:[],position:'',domain:'tech'};
  return {token,user};
});
P('/api/auth/email-login', async (p,b)=>{
  const {email,password}=b;
  if(!email||!password) return err('需要 email 和 password');
  let u=await db.collection('users').where({email}).limit(1).get();
  // 访客账号自动注册
  if(!u.data.length && email==='guest@trailmate.app') {
    const passwordHash=await bcrypt.hash('guest123',10);
    await db.collection('users').add({email,passwordHash,name:'访客',avatar:'访',experienceLevel:'novice',preferences:[],hikeFrequency:'monthly1',emergencyContacts:[],creditScore:100,hikeCount:0,totalDistance:0,city:'',skills:[],position:'',createdAt:Date.now(),updatedAt:Date.now()});
    u=await db.collection('users').where({email}).limit(1).get();
  }
  if(!u.data.length||!u.data[0].passwordHash) return err('邮箱或密码错误',401);
  const match=await bcrypt.compare(password,u.data[0].passwordHash);
  if(!match) return err('邮箱或密码错误',401);
  await db.collection('users').doc(u.data[0]._id).update({lastSeenAt:Date.now()});
  const token=jwt.sign({userId:String(u.data[0]._id)},JWT_SECRET,{expiresIn:'7d'});
  const user={...stripSecrets(u.data[0]),id:String(u.data[0]._id)};
  return {token,user};
});
// ─── \u5bc6\u7801\u91cd\u7f6e\uff08\u90ae\u7bb1 token \u94fe\u63a5\u65b9\u5f0f\uff09 ──
const crypto = require('crypto');
const FORGOT_RATE = new Map();
P('/api/auth/forgot-password', async (p,b,q)=>{
  const {email}=b;
  if(!email) return err('\u8bf7\u8f93\u5165\u90ae\u7bb1');
  // \u9891\u7387\u9650\u5236\uff1a\u6bcf\u4e2a\u90ae\u7bb1\u6bcf\u5c0f\u65f6\u6700\u591a 3 \u6b21
  const rateKey = email.toLowerCase();
  const now = Date.now();
  const rate = FORGOT_RATE.get(rateKey);
  if (rate && rate.count >= 3 && now - rate.windowStart < 3600000) return {ok:true,message:'\u5982\u679c\u8be5\u90ae\u7bb1\u5df2\u6ce8\u518c\uff0c\u91cd\u7f6e\u94fe\u63a5\u5df2\u53d1\u9001'};
  if (!rate || now - rate.windowStart >= 3600000) FORGOT_RATE.set(rateKey, {count:1,windowStart:now});
  else rate.count++;
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
G('/api/auth/me', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); const user=addId(stripSecrets(d.data[0]||{})); return {user}; });

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
  const token = jwt.sign({userId:String(u.data[0]._id)},JWT_SECRET,{expiresIn:'7d'});
  const user = addId(stripSecrets(u.data[0]));
  return {token, user};
});

// ─── Users ──────────────────────────
G('/api/users', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('users').limit(50).get(); const items=addIds(r.data).map(stripSecrets); return {items,total:items.length}; });
G('/api/users/:id', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(p.id).get(); return addId(stripSecrets(d.data[0]||{}))||{}; });
U('/api/users/me', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const safe=stripSecrets(b); const allowed={}; ['name','avatar','avatarUrl','city','skills','position','domain','preferences','experienceLevel','hikeFrequency','bio'].forEach(k=>{ if(safe[k]!==undefined) allowed[k]=safe[k]; }); await db.collection('users').doc(u.userId).update({...allowed,updatedAt:Date.now()}); return {ok:true}; });
G('/api/users/me/portfolio', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); return (addId(d.data[0])||{}).portfolio||[]; });
P('/api/users/me/portfolio', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const ud=await db.collection('users').doc(u.userId).get(); const items=(addId(ud.data[0])||{}).portfolio||[]; items.push({...b,id:Date.now().toString(),createdAt:Date.now()}); await db.collection('users').doc(u.userId).update({portfolio:items,updatedAt:Date.now()}); return {ok:true}; });
U('/api/users/me/portfolio/:itemId', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const ud=await db.collection('users').doc(u.userId).get(); const items=(addId(ud.data[0])||{}).portfolio||[]; const idx=items.findIndex(i=>i.id===p.itemId); if(idx>=0){ items[idx]={...items[idx],...b}; await db.collection('users').doc(u.userId).update({portfolio:items,updatedAt:Date.now()}); } return {ok:true}; });
D('/api/users/me/portfolio/:itemId', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const ud=await db.collection('users').doc(u.userId).get(); const items=((addId(ud.data[0])||{}).portfolio||[]).filter(i=>i.id!==p.itemId); await db.collection('users').doc(u.userId).update({portfolio:items,updatedAt:Date.now()}); return {ok:true}; });
G('/api/users/me/applications', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('applications').where({applicant:u.userId}).get(); const items=addIds(r.data); return {items,total:items.length}; });
P('/api/users/me/presence', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('users').doc(u.userId).update({lastSeenAt:Date.now()}); return {ok:true}; });
U('/api/users/me/emergency-contacts', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('users').doc(u.userId).update({emergencyContacts:b.contacts||[],updatedAt:Date.now()}); return {ok:true}; });
G('/api/users/me/stats', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const d=await db.collection('users').doc(u.userId).get(); const ud=addId(d.data[0])||{}; return {hikeCount:ud.hikeCount||0,totalDistance:ud.totalDistance||0,creditScore:ud.creditScore||100}; });

// ─── Requirements ───────────────────
G('/api/requirements', async(p,b,q)=>{
  let col=db.collection('requirements').where({status:'open',visibility:'public'});
  if(q.search) col=col.where({title: db.RegExp({regexp:q.search||'',options:'i'})});
  const r=await col.orderBy('createdAt','desc').limit(Number(q.limit)||20).get();
  const items=addIds(r.data); return {items,total:items.length};
});
G('/api/requirements/mine', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('requirements').where({author:u.userId}).orderBy('createdAt','desc').get(); const items=addIds(r.data); return {items,total:items.length}; });
P('/api/requirements', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={...b,author:u.userId,status:'draft','visibility':'public',skills:b.skills||[],matchProgress:0,background:b.background||'',goal:b.goal||'',desc:b.desc||'',timeline:b.timeline||'3-6 \u4e2a\u6708',outcome:b.outcome||'',createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('requirements').add(data); return {requirement:addId({_id:r.id,...data})}; });
G('/api/requirements/:id', async(p)=>{ const r=await db.collection('requirements').doc(p.id).get(); const req=addId(r.data[0]); return req?{requirement:req}:err('Not found',404); });
U('/api/requirements/:id', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const existing=await db.collection('requirements').doc(p.id).get(); if(!existing.data.length||String(existing.data[0].author)!==u.userId) return err('无权操作',403); await db.collection('requirements').doc(p.id).update({...b,updatedAt:Date.now()}); return {ok:true}; });
U('/api/requirements/:id/publish', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const existing=await db.collection('requirements').doc(p.id).get(); if(!existing.data.length||String(existing.data[0].author)!==u.userId) return err('无权操作',403); await db.collection('requirements').doc(p.id).update({status:'open','visibility':b.visibility||'public',updatedAt:Date.now()}); return {ok:true}; });
U('/api/requirements/:id/apply', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); await db.collection('applications').add({requirementId:p.id,applicant:u.userId,message:b.message||'',status:'pending',createdAt:Date.now()}); return {ok:true}; });
G('/api/requirements/:id/applications', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('applications').where({requirementId:p.id}).get(); const items=addIds(r.data); return {items,total:items.length}; });
U('/api/requirements/:id/applications/:appId', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const reqDoc=await db.collection('requirements').doc(p.id).get(); if(!reqDoc.data.length||String(reqDoc.data[0].author)!==u.userId) return err('无权操作',403); await db.collection('applications').doc(p.appId).update({status:b.status,updatedAt:Date.now()}); return {ok:true}; });
D('/api/requirements/:id', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const existing=await db.collection('requirements').doc(p.id).get(); if(!existing.data.length||String(existing.data[0].author)!==u.userId) return err('无权操作',403); await db.collection('requirements').doc(p.id).remove(); return {ok:true}; });

// ─── Match ──────────────────────────
G('/api/match/forward', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('requirements').doc(p.requirementId||q.requirementId).get(); if(!r.data.length) return {items:[],total:0}; const skills=r.data[0].skills||[]; const users=await db.collection('users').limit(50).get(); const scored=users.data.filter(x=>String(x._id)!==u.userId).map(x=>{ const o=(x.skills||[]).filter(s=>skills.includes(s)); return {userId:x._id,name:x.name,avatar:x.avatar,avatarColor:x.avatarColor,avatarUrl:x.avatarUrl,position:x.position,skills:x.skills,matchPct:skills.length?Math.round(o.length/skills.length*100):0,matchedSkills:o}; }); scored.sort((a,b)=>b.matchPct-a.matchPct); const items=scored.slice(0,10); return {items,total:scored.length}; });
G('/api/match/reverse', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const user=await db.collection('users').doc(u.userId).get(); const uSkills=(user.data[0]||{}).skills||[]; const reqs=await db.collection('requirements').where({status:'open'}).limit(50).get(); const scored=reqs.data.filter(r=>String(r.author)!==u.userId).map(r=>{ const o=(r.skills||[]).filter(s=>uSkills.includes(s)); return {id:r._id,title:r.title,skills:r.skills,matchPct:r.skills?.length?Math.round(o.length/r.skills.length*100):0}; }); scored.sort((a,b)=>b.matchPct-a.matchPct); const items=scored.slice(0,10); return {items,total:scored.length}; });

// ─── Groups ─────────────────────────
async function findGroup(id) {
  // 方法1: doc(id)
  try { const r=await db.collection('groups').doc(id).get(); if(r.data&&r.data.length) return {doc:r.data[0],docId:String(r.data[0]._id)}; } catch(e) { console.log('findGroup doc() err:', e.message); }
  // 方法2: where({_id:id})
  try { const r=await db.collection('groups').where({_id:id}).limit(1).get(); if(r.data&&r.data.length) return {doc:r.data[0],docId:String(r.data[0]._id)}; } catch(e) { console.log('findGroup where _id err:', e.message); }
  // 方法3: 全量查询内存匹配
  try { const r=await db.collection('groups').limit(100).get(); const found=r.data.find(g=>String(g._id)===id||String(g._id)===String(id)); if(found) return {doc:found,docId:String(found._id)}; } catch(e) { console.log('findGroup full scan err:', e.message); }
  console.log('findGroup: all methods failed for id=', id);
  return null;
}
G('/api/groups', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const uid=String(u.userId); const all=await db.collection('groups').get(); const items=addIds(all.data).filter(g=>{const m=g.members||[];return m.some(mm=>String(mm.id||mm)===uid)||String(g.creatorId||g.createdBy)===uid;}).map(g=>({...g,messages:g.messages||[],members:g.members||[]})); return {items,total:items.length}; });
P('/api/groups', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={name:b.name||'\u534f\u4f5c\u7fa4\u7ec4',creatorId:u.userId,reqId:b.reqId||'',members:[{id:u.userId,name:'',avatar:''}],messages:[],createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('groups').add(data); const group=addId({_id:r.id,...data}); return {group}; });
P('/api/groups/create', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const data={name:b.name,creatorId:u.userId,members:[{id:u.userId,name:'',avatar:''}],messages:[],createdAt:Date.now(),updatedAt:Date.now()}; const r=await db.collection('groups').add(data); const group=addId({_id:r.id,...data}); return {group}; });
G('/api/groups/:id', async(p)=>{ const found=await findGroup(p.id); if(!found) return err('Not found',404); const raw=addId(found.doc); return {group:{...raw,messages:raw.messages||[],members:raw.members||[]}}; });
P('/api/groups/:id/messages', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const found=await findGroup(p.id); if(!found) return err('Not found',404); const ud=await db.collection('users').doc(u.userId).get(); const userName=(ud.data[0]||{}).name||''; const msgs=found.doc.messages||[]; msgs.push({userId:u.userId,userName,content:b.text||b.content||'',createdAt:Date.now()}); await db.collection('groups').doc(found.docId).update({messages:msgs,updatedAt:Date.now()}); return {ok:true}; });
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

  // \u4f18\u5148\u4f7f\u7528\u7528\u6237\u81ea\u5b9a\u4e49\u6a21\u578b// 优先使用用户自定义模型（SSRF 防护：只允许 HTTPS 公网地址）
  if (userLlm && userLlm.apiKey && userLlm.baseUrl && userLlm.model) {
    const baseUrl = userLlm.baseUrl.replace(/\/+$/,'');
    if (!/^https:\/\/[a-z0-9].*\..*/i.test(baseUrl)) {
      reply = '[自定义模型地址不合法，仅支持 HTTPS 公网地址]';
    } else {
    try {
      const userRes = await fetch(baseUrl + '/chat/completions', {
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
    } // end else
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
G('/api/conversations/:id', async(p,b,q)=>{ const u=auth(q.headers.authorization); if(!u) return err('Unauthorized',401); const r=await db.collection('conversations').doc(p.id).get(); const conv=addId(r.data[0]); if(!conv) return err('Not found',404); if(conv.userId!==u.userId) return err('无权操作',403); return {conversation:conv}; });
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
// POST /api/upload — 已移至下方新增路由区域
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
  {name:'get_requirement',description:'\u67e5\u8be2\u9700\u6c42\u8be6\u60c5',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},requirement_id:{type:'string',description:'\u9700\u6c42 ID'}},required:['token','requirement_id']}},
  {name:'get_user_profile',description:'获取用户个人资料',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'}},required:['token']}},
  {name:'list_groups',description:'获取用户的组队列表',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},status:{type:'string',description:'状态筛选: active/ended'}},required:['token']}},
  {name:'get_group_detail',description:'获取队伍详情（成员、打卡点、照片）',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},group_id:{type:'string',description:'队伍 ID'}},required:['token','group_id']}},
  {name:'list_trails',description:'获取活动日志列表（户外徒步、露营等记录）',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},type:{type:'string',description:'活动类型: hike/other'},limit:{type:'number',description:'返回数量上限'}},required:['token']}},
  {name:'check_safety',description:'查看队伍 SOS 求救状态',inputSchema:{type:'object',properties:{token:{type:'string',description:'API token'},group_id:{type:'string',description:'队伍 ID'}},required:['token','group_id']}}
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
async function mcpGetUserProfile(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  const d=await db.collection('users').doc(u.userId).get();
  if(!d.data.length) return {error:{code:-32004,message:'User not found'}};
  const x=d.data[0]; return {name:x.name,position:x.position,skills:x.skills||[],intro:x.intro||''};
}
async function mcpListGroups(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  let col=db.collection('groups').where(db.command.or([{creatorId:String(u.userId)},{'members.id':String(u.userId)},{'members':String(u.userId)}]));
  if(args.status==='active') col=col.where({status:db.command.neq('ended')});
  if(args.status==='ended') col=col.where({status:'ended'});
  const r=await col.orderBy('updatedAt','desc').limit(50).get();
  return {total:r.data.length,groups:r.data.map(g=>({id:g._id,name:g.name,type:g.type,status:g.status||'active',memberCount:(g.members||[]).length,essentials:g.essentials||{},updatedAt:g.updatedAt}))};
}
async function mcpGetGroupDetail(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  const found=await findGroup(args.group_id); if(!found) return {error:{code:-32004,message:'Group not found'}};
  const g=found.doc; return {id:g._id,name:g.name,type:g.type,status:g.status||'active',creatorId:g.creatorId,members:g.members||[],checkpoints:g.checkpoints||[],photos:g.photos||[],essentials:g.essentials||{},createdAt:g.createdAt,updatedAt:g.updatedAt};
}
async function mcpListTrails(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  let col=db.collection('traillogs').where({userId:u.userId});
  if(args.type) col=col.where({type:args.type});
  const r=await col.orderBy('createdAt','desc').limit(args.limit||20).get();
  return {total:r.data.length,trails:r.data.map(t=>({id:t._id,type:t.type,title:t.title,date:t.date,location:t.location,distance:t.distance,duration:t.duration,notes:t.notes,photos:t.photos||[],createdAt:t.createdAt}))};
}
async function mcpCheckSafety(args){
  const u=mcpAuth(args.token); if(!u) return {error:{code:-32001,message:'Unauthorized'}};
  const found=await findGroup(args.group_id); if(!found) return {error:{code:-32004,message:'Group not found'}};
  const g=found.doc; const locs=await db.collection('group_locations').where({groupId:args.group_id}).limit(50).get();
  const now=Date.now();
  const members=(g.members||[]).map(m=>{
    const id=String(m.id||m);
    const loc=(locs.data||[]).find(l=>String(l.userId)===id);
    const isSOS=loc&&loc.sos&&loc.sos>0;
    return {userId:id,name:m.name||'队友',hasLocation:!!loc,sosActive:!!isSOS,lastSeen:loc?loc.updatedAt:null};
  });
  return {groupName:g.name,totalMembers:members.length,sosCount:members.filter(m=>m.sosActive).length,members};
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
        case 'get_user_profile': result=await mcpGetUserProfile(args); break;
        case 'list_groups': result=await mcpListGroups(args); break;
        case 'get_group_detail': result=await mcpGetGroupDetail(args); break;
        case 'list_trails': result=await mcpListTrails(args); break;
        case 'check_safety': result=await mcpCheckSafety(args); break;
        default: return {jsonrpc:'2.0',id,error:{code:-32601,message:'Unknown tool: '+toolName}};
      }
      if(result.error) return {jsonrpc:'2.0',id,error:result.error};
      return {jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}]}};
    }catch(e){ return {jsonrpc:'2.0',id,error:{code:-32603,message:e.message}}; }
  }
  return {jsonrpc:'2.0',id,error:{code:-32601,message:'Unknown method: '+method}};
});
G('/api/mcp/health', ()=>({ok:true,service:'collabmatch-mcp',version:'1.0.0'}));

// ─── TrailMate: Helper Functions ─────────────────
function extractFromInput(rawInput) {
  const essentials = {};
  const prompts = [];
  const text = rawInput;

  // 地点
  const locMatch = text.match(/(梧桐山|白云山|大南山|泰山|华山|黄山|武功山|张家界|峨眉山|长白山|千岛湖|西湖|阳朔|丽江|香格里拉|稻城亚丁|四姑娘山|贡嘎|梅里雪山|雨崩|虎跳峡|莫干山|雁荡山|天目山|武夷山|三清山|庐山|衡山|嵩山|恒山|青城山|都江堰|九寨沟|黄龙|毕棚沟|海螺沟|牛背山|色达|泸沽湖|大理|洱海|苍山|玉龙雪山|哈巴雪山|慕士塔格|博格达|冈仁波齐|墨脱|独龙江|丙察察|318|川藏线|滇藏线|新藏线|青藏线)/);
  if (locMatch) essentials.location = locMatch[1];

  // 日期
  if (/周末/.test(text)) essentials.date = '周末';
  else if (/下周/.test(text)) essentials.date = '下周';
  else if (/明天/.test(text)) essentials.date = '明天';
  else if (/这周/.test(text)) essentials.date = '这周';
  const dateMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]/);
  if (dateMatch) essentials.date = dateMatch[0];

  // 人数
  const sizeMatch = text.match(/(\d+)\s*人/);
  if (sizeMatch) essentials.groupSize = parseInt(sizeMatch[1]);
  else if (/两人|两个人|2人/.test(text)) essentials.groupSize = 2;
  else if (/三人|三个人|3人/.test(text)) essentials.groupSize = 3;

  // 难度
  if (/轻松|休闲|散步|简单/.test(text)) essentials.difficulty = 'casual';
  else if (/挑战|进阶|有难度|高强度/.test(text)) essentials.difficulty = 'challenge';

  // 类型
  if (/日归|当天来回|一天/.test(text)) essentials.eventType = 'dayhike';
  else if (/多日|过夜|露营|两天/.test(text)) essentials.eventType = 'overnight';
  else if (/长线|穿越|徒步旅行/.test(text)) essentials.eventType = 'longtrail';

  // 提示词 — 宽松口语化匹配
  if (/不.{0,4}抽烟|不要.{0,4}抽烟|别.{0,4}抽烟|讨厌.{0,4}抽烟|无烟|禁烟|抽烟.{0,4}不要|抽烟.{0,4}不行|有人抽烟/.test(text)) prompts.push('不抽烟');
  if (/拍照|摄影|拍风景|出片|打卡/.test(text)) prompts.push('喜欢拍照');
  if (/有经验|老驴|老手|资深|熟练/.test(text)) prompts.push('有经验优先');
  if (/新手|小白|第一次|零基础|入门/.test(text)) prompts.push('新手友好');
  if (/轻松|不赶|慢慢走|休闲|散步/.test(text)) prompts.push('轻松节奏');
  if (/挑战|进阶|有难度|高强度|硬核|拉练/.test(text)) prompts.push('挑战型');
  if (/早起|早出发|6点|7点|8点出发/.test(text)) prompts.push('早起出发');
  if (/睡懒觉|晚点|不早起|9点|10点/.test(text)) prompts.push('不早起');
  if (/轻装|不背重/.test(text)) prompts.push('轻装出行');
  if (/重装|负重/.test(text)) prompts.push('重装徒步');
  if (/走大路|成熟路线|安全|正规路线/.test(text)) prompts.push('走大路');
  if (/走野路|野线|探险|探路|野路|非铺装/.test(text)) prompts.push('走野路');
  if (/不.{0,4}喝酒|不要.{0,4}喝酒|禁酒/.test(text)) prompts.push('不喝酒');
  if (/女生优先|全女|只要女生|都是女生|姐妹/.test(text)) prompts.push('女生优先');
  if (/男生优先|全男|只要男生/.test(text)) prompts.push('男生优先');
  if (/AA制|费用平摊|各付各|AA|平摊/.test(text)) prompts.push('AA制');
  if (/有车|自驾|可以接|开车|拼车/.test(text)) prompts.push('有车');
  if (/环保|无痕|不留垃圾|LNT/.test(text)) prompts.push('环保无痕');
  if (/带狗|带猫|带宠物|可以带宠物/.test(text)) prompts.push('可带宠物');
  if (/素食|不吃肉|清真/.test(text)) prompts.push('饮食偏好');
  if (/便宜|省钱|预算|经济|穷游/.test(text)) prompts.push('省钱优先');
  if (/安静|话少|不吵|社恐/.test(text)) prompts.push('安静不吵');
  if (/热闹|聊天|社交|话多|社牛/.test(text)) prompts.push('热闹社交');
  if (/有装备|提供装备|帐篷|背包/.test(text)) prompts.push('有装备');
  if (/有水|溪流|瀑布|溯溪|玩水/.test(text)) prompts.push('有水路线');

  // 查询扩展：添加同义/近义标签，提升匹配覆盖
  const SYNONYM_MAP = {
    '不抽烟': ['禁烟', '无烟', '不吸烟'],
    '喜欢拍照': ['摄影', '出片', '打卡拍照'],
    '新手友好': ['零基础', '小白友好', '第一次'],
    '轻松节奏': ['休闲', '不卷', '慢摇', '慢慢走'],
    '挑战型': ['进阶', '硬核', '拉练', '高强度'],
    '有经验优先': ['老手', '资深', '老驴'],
    '早起出发': ['早鸟', '晨起'],
    '不早起': ['睡懒觉', '晚出发'],
    '走大路': ['成熟路线', '正规路线', '安全'],
    '走野路': ['野线', '探路', '非铺装'],
    '不喝酒': ['禁酒', '不饮酒'],
    '女生优先': ['全女', '姐妹团'],
    'AA制': ['费用平摊', '各付各'],
    '有车': ['自驾', '可拼车'],
    '环保无痕': ['LNT', '不留垃圾'],
    '可带宠物': ['带狗', '带猫'],
    '饮食偏好': ['素食', '清真', '不吃肉'],
    '省钱优先': ['预算', '经济', '穷游'],
    '安静不吵': ['话少', '社恐', '不吵'],
    '热闹社交': ['聊天', '社牛', '话多'],
    '有装备': ['提供装备', '帐篷', '背包'],
    '有水路线': ['溪流', '瀑布', '溯溪', '玩水'],
    '轻装出行': ['轻装', '不背重'],
    '重装徒步': ['重装', '负重'],
    '男生优先': ['全男'],
  };
  const expanded = new Set(prompts);
  for (const p of prompts) {
    const synonyms = SYNONYM_MAP[p];
    if (synonyms) synonyms.forEach(s => expanded.add(s));
  }
  const expandedPrompts = [...expanded];

  const essentialsComplete = !!(essentials.location && essentials.date && essentials.groupSize);
  return { essentials, prompts: expandedPrompts, essentialsComplete };
}

function extractDifferencePoints(messages) {
  const diffs = [];
  const conflictPatterns = [
    { pattern: /早起|早出发|6点出发|7点出发/, topic: '早起', pref: '偏好: 早起' },
    { pattern: /睡懒觉|晚点出发|不早起|9点以后/, topic: '早起', pref: '排除: 早起' },
    { pattern: /抽烟|吸烟/, topic: '抽烟', pref: '偏好: 抽烟' },
    { pattern: /不抽烟|不喜欢抽烟|无烟|禁烟/, topic: '抽烟', pref: '排除: 抽烟' },
    { pattern: /赶路|赶时间|快速/, topic: '节奏', pref: '偏好: 赶路' },
    { pattern: /慢慢走|不赶|休闲走/, topic: '节奏', pref: '排除: 赶路' },
    { pattern: /走野路|野线|探险/, topic: '路线', pref: '偏好: 野路' },
    { pattern: /走大路|成熟路线|安全路线/, topic: '路线', pref: '排除: 野路' },
    { pattern: /重装|负重/, topic: '装备', pref: '偏好: 重装' },
    { pattern: /轻装|不背重/, topic: '装备', pref: '排除: 重装' },
    { pattern: /喝酒|喝点/, topic: '喝酒', pref: '偏好: 喝酒' },
    { pattern: /不喝酒|禁酒/, topic: '喝酒', pref: '排除: 喝酒' },
  ];
  for (const msg of messages) {
    const content = msg.content || msg.text || '';
    const userName = msg.userName || msg.name || '';
    for (const cp of conflictPatterns) {
      if (cp.pattern.test(content)) {
        diffs.push({ topic: cp.topic, userPreference: cp.pref, userName });
      }
    }
  }
  // 去重
  const seen = new Set();
  return diffs.filter(d => { const k = d.topic + d.userPreference; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ─── 匹配算法（Tag Intersection + 查询扩展） ─────────────────
// TODO - 方案 B: Embedding 语义匹配
//   当前: prompts.includes() 精确字符串匹配 + 查询扩展（方案 A）
//   未来: 将 prompts 组合转为 768 维 embedding 向量，匹配时用 cosine 相似度
//   步骤: ① 调 embedding API 为每个用户生成向量 → ② 存入 users 表
//         ③ 匹配时 cosine(src_embedding, tgt_embedding) → 分数
//   优势: "不想太累" vs "特种兵达咩" 也能匹配
//   成本: ~$0.00002/次 embedding，匹配计算纯数学 0 token
async function matchUsersSimple(userId, essentials, prompts, db) {
  const users = await db.collection('users').limit(50).get();
  // 出行频率相似度映射
  const freqLevels = ['monthly1', 'monthly2-3', 'weekly1', 'weekly+'];
  return users.data.filter(u => String(u._id) !== userId).map(u => {
    let score = 0;
    // 提示词匹配（含 resources 文本查找）
    const uPrefs = u.preferences || [];
    const uResources = (u.resources || []).map((r) => typeof r === 'string' ? r : r.text).join(' ');
    const promptMatch = prompts.filter(p => uPrefs.includes(p) || (u.bio && u.bio.includes(p)) || uResources.includes(p));
    const promptScore = prompts.length ? promptMatch.length / prompts.length : 0.5;
    score += promptScore * 40;
    // 必要因素匹配
    let eScore = 0;
    if (essentials.location && u.city === essentials.location) eScore += 25;
    if (essentials.difficulty) {
      const levelMap = { casual: 'novice', advanced: 'experienced', challenge: 'veteran' };
      if (u.experienceLevel === levelMap[essentials.difficulty]) eScore += 25;
      else eScore += 10;
    } else { eScore += 15; }
    if (!essentials.location && !essentials.date) eScore += 15;
    score += eScore * 0.30;
    // 出行频率匹配
    const uFreq = u.hikeFrequency || '';
    const qFreq = essentials.hikeFrequency || '';
    let freqScore = 0;
    if (uFreq && qFreq) {
      const ui = freqLevels.indexOf(uFreq);
      const qi = freqLevels.indexOf(qFreq);
      if (ui >= 0 && qi >= 0) freqScore = Math.max(0, 100 - Math.abs(ui - qi) * 30);
      else if (uFreq === qFreq) freqScore = 100;
    } else { freqScore = 50; }
    score += freqScore * 0.10;
    // 资源设备匹配（已在 promptMatch 中体现，此处补充重叠分）
    const resMatch = prompts.filter(p => uResources.includes(p)).length;
    const resScore = prompts.length ? Math.round(resMatch / prompts.length * 100) : 50;
    score += resScore * 0.10;
    // 档案匹配
    const profileScore = 20;
    score += profileScore * 0.10;
    const matchPct = Math.min(Math.round(score), 99);
    return {
      user: { id: String(u._id), name: u.name || '', avatar: u.avatar || '', avatarColor: u.avatarColor || '', avatarUrl: u.avatarUrl || '' },
      matchPct,
      breakdown: { essentials: Math.round(eScore), prompts: Math.round(promptScore * 100), profile: profileScore },
      reason: promptMatch.length ? `匹配提示词: ${promptMatch.join(', ')}` : '基本匹配'
    };
  }).sort((a, b) => b.matchPct - a.matchPct).slice(0, 5);
}

// ─── LLM 调用（复用豆包 API） ─────────────────
const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || '';
const DOUBAO_MODEL = process.env.DOUBAO_MODEL || '';
const DOUBAO_BASE_URL = (process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '');

async function callLLM(systemPrompt, userMessage) {
  // 优先豆包，其次 DeepSeek
  const apiKey = DOUBAO_API_KEY || process.env.DEEPSEEK_API_KEY || '';
  const model = DOUBAO_MODEL || 'deepseek-chat';
  const baseUrl = DOUBAO_API_KEY ? DOUBAO_BASE_URL : 'https://api.deepseek.com/v1';
  if (!apiKey) throw new Error('No LLM API key');

  const res = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error('LLM HTTP' + res.status + ': ' + errText.slice(0, 200));
  }
  const d = await res.json();
  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
}

// LLM 提炼提示词的系统提示
const EXTRACT_SYSTEM_PROMPT = `你是 TrailMate 徒步匹配平台的 AI 助手。用户会告诉你他们的徒步计划和队友偏好，你需要从中提炼出匹配条件。

请严格按以下 JSON 格式回复（不要包含其他文字）：
{
  "prompts": ["提示词1", "提示词2", ...],
  "essentials": { "location": "地点或null", "date": "日期或null", "groupSize": 人数或null, "difficulty": "casual/challenge/null", "eventType": "dayhike/overnight/longtrail/null" },
  "reply": "你的自然语言回复，友好简短，1-2句话"
}

提炼规则：
1. prompts 是用于匹配的关键条件标签，每个2-4个字，如："不抽烟"、"喜欢拍照"、"新手友好"、"轻松节奏"、"女生优先"、"AA制"、"早起出发"、"不早起"、"走野路"、"走大路"、"省钱优先"、"热闹社交"、"安静不吵"、"有装备"、"可带宠物"、"环保无痕"、"有车"、"轻装出行"、"重装徒步"、"不喝酒"、"饮食偏好"、"有水路线"
2. 从用户偏好中提炼，即使表达含糊也要理解意图，如"不喜欢有人抽烟"→"不抽烟"，"别太累"→"轻松节奏"，"想拍好看的照片"→"喜欢拍照"
3. 【重要】查询扩展：为每个提炼出的偏好，额外生成2-3个同义/近义标签放入prompts数组。例如"不抽烟"还应包含"禁烟"、"无烟"；"轻松节奏"还应包含"休闲"、"不卷"、"新手友好"；"喜欢拍照"还应包含"摄影"、"出片"。这样即使用户用了不同表述也能匹配上。
4. essentials 是必要因素：地点、日期、人数、难度、类型，缺失填 null
5. reply 是你理解后的自然回复，确认你理解了什么，引导用户补充信息或开始匹配
6. 如果用户说"帮我匹配/找队友"等，reply 中提示点击匹配按钮`;

// ─── TrailMate: AI Extract ─────────────────
// POST /api/intents/extract — AI 提炼提示词（不创建 Intent）
P('/api/intents/extract', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const text = b.text || '';
  if (!text) return { prompts: [], essentials: {}, reply: '' };

  // 优先用 LLM 提炼
  let llmResult = null;
  try {
    const llmRaw = await callLLM(EXTRACT_SYSTEM_PROMPT, text);
    // 提取 JSON（LLM 可能包裹在 ```json ``` 中）
    const jsonMatch = llmRaw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      llmResult = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.log('LLM extract failed, fallback to regex:', e.message);
  }

  if (llmResult && Array.isArray(llmResult.prompts)) {
    const essentials = llmResult.essentials || {};
    // 清理 essentials 中的 null 值
    Object.keys(essentials).forEach(k => { if (essentials[k] === null || essentials[k] === 'null') delete essentials[k]; });
    const essentialsComplete = !!(essentials.location && essentials.date && essentials.groupSize);
    return {
      prompts: llmResult.prompts,
      essentials,
      essentialsComplete,
      reply: llmResult.reply || `我理解了你的需求，提取到 ${llmResult.prompts.length} 个匹配条件。`,
    };
  }

  // Fallback: 正则提取
  const { essentials, prompts, essentialsComplete } = extractFromInput(text);
  let reply = '';
  if (prompts.length === 0) {
    reply = '了解，可以告诉我更多吗？比如想去哪里、什么时候出发、对队友有什么要求？';
  } else if (isMatchCommand(text)) {
    reply = `好的！我已理解你的需求，提取到 ${prompts.length} 个匹配条件，点击匹配按钮开始找队友吧！`;
  } else {
    const newItems = prompts.slice(-3).join('、');
    reply = `我理解了：${newItems}。还有其他要求吗？或者说"帮我匹配"开始找队友。`;
  }
  return { prompts, essentials, essentialsComplete, reply };
});

function isMatchCommand(text) {
  return /帮我匹配|开始匹配|找队友|找人|匹配一下|帮我找|开始找/.test(text);
}

// ─── TrailMate: Intents & Hike Events ─────────────────
// 1. POST /api/intents — 一句话创建匹配意图
P('/api/intents', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const rawInput = b.rawInput || '';
  if (!rawInput) return err('缺少 rawInput');
  const { essentials, prompts, essentialsComplete } = extractFromInput(rawInput);
  // 获取用户信息
  const userDoc = await db.collection('users').doc(u.userId).get();
  const user = userDoc.data[0] || {};
  essentials.hikeFrequency = user.hikeFrequency || '';
  const intentData = {
    rawInput,
    essentials,
    prompts,
    essentialsComplete,
    status: 'matching',
    author: { id: u.userId, name: user.name || '', avatar: user.avatar || '', avatarUrl: user.avatarUrl || '' },
    matchedUsers: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const r = await db.collection('intents').add(intentData);
  // 匹配用户
  const matchedUsers = await matchUsersSimple(u.userId, essentials, prompts, db);
  await db.collection('intents').doc(r.id).update({ matchedUsers, updatedAt: Date.now() });
  // 自动创建队伍（自己一个人）
  const groupData = {
    name: `${user.name || '我'}的徒步队`,
    intentId: r.id,
    members: [{ id: u.userId, name: user.name || '', avatar: user.avatar || '', avatarUrl: user.avatarUrl || '', role: 'leader', joinedAt: Date.now() }],
    maxMembers: essentials.groupSize || 6,
    essentials,
    prompts,
    status: 'recruiting',
    likes: 0,
    hot: false,
    photos: [],
    createdBy: u.userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const gr = await db.collection('groups').add(groupData);
  await db.collection('intents').doc(r.id).update({ groupId: gr.id });
  // 给匹配到的用户发通知
  for (const mu of matchedUsers) {
    await safeAdd('matchnotices', {
      intentId: r.id,
      fromUser: { id: u.userId, name: user.name || '', avatar: user.avatar || '', avatarUrl: user.avatarUrl || '' },
      toUserId: mu.id,
      rawInput,
      essentials,
      prompts,
      matchPct: mu.matchPct,
      reason: mu.reason,
      status: 'pending',
      createdAt: Date.now(),
    });
  }
  return { intent: addId({ _id: r.id, ...intentData, matchedUsers }) };
});

// 2. GET /api/intents/mine — 我的意图列表
G('/api/intents/mine', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const r = await db.collection('intents').where({ 'author.id': u.userId }).orderBy('createdAt', 'desc').get();
  const items = addIds(r.data);
  return { items, total: items.length };
});

// 3. GET /api/intents/notices — 我的匹配通知
G('/api/intents/notices', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const r = await safeQuery('matchnotices', db.collection('matchnotices').where({ toUserId: u.userId }).orderBy('createdAt', 'desc'));
  const items = addIds(r.data);
  return { items, total: items.length };
});

// 4. GET /api/intents/notices/unread-count — 未读通知数
G('/api/intents/notices/unread-count', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const r = await safeQuery('matchnotices', db.collection('matchnotices').where({ toUserId: u.userId, status: 'pending' }));
  return { count: r.data.length };
});

// 5. PUT /api/intents/notices/:noticeId — 已移至下方新增路由区域

// 6. POST /api/intents/:id/confirm-team — 确认组队（将成员加入已有Group）
P('/api/intents/:id/confirm-team', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const intentDoc = await db.collection('intents').doc(p.id).get();
  if (!intentDoc.data.length) return err('意图不存在', 404);
  const intent = intentDoc.data[0];
  if (intent.author.id !== u.userId) return err('无权操作', 403);
  const memberIds = b.memberIds || [];
  // 查找已有的 Group
  let groupDoc = null;
  if (intent.groupId) {
    const gd = await db.collection('groups').doc(intent.groupId).get();
    if (gd.data.length) groupDoc = gd.data[0];
  }
  if (!groupDoc) {
    const gs = await db.collection('groups').where({ intentId: p.id }).get();
    if (gs.data.length) groupDoc = gs.data[0];
  }
  // 构建新成员列表
  const newMembers = [];
  for (const mid of memberIds) {
    const ud = await db.collection('users').doc(mid).get();
    if (ud.data.length) newMembers.push({ id: String(ud.data[0]._id), name: ud.data[0].name || '', avatar: ud.data[0].avatar || '', avatarUrl: ud.data[0].avatarUrl || '', role: 'member', joinedAt: Date.now() });
  }
  if (groupDoc) {
    // 加入已有 Group
    const existingIds = (groupDoc.members || []).map(m => m.id);
    const toAdd = newMembers.filter(m => !existingIds.includes(m.id));
    if (toAdd.length > 0) {
      await db.collection('groups').doc(String(groupDoc._id)).update({
        members: [...(groupDoc.members || []), ...toAdd],
        updatedAt: Date.now(),
      });
    }
    // 更新意图状态
    await db.collection('intents').doc(p.id).update({ status: 'confirmed', updatedAt: Date.now() });
    const updatedGroup = await db.collection('groups').doc(String(groupDoc._id)).get();
    return { ok: true, group: addId(updatedGroup.data[0]) };
  } else {
    // 没有 Group 则创建
    const members = [{ id: u.userId, name: intent.author.name, avatar: intent.author.avatar, avatarUrl: intent.author.avatarUrl, role: 'leader', joinedAt: Date.now() }, ...newMembers];
    const groupData = {
      name: (intent.essentials.location || '徒步') + ' 队伍',
      intentId: p.id,
      members,
      maxMembers: intent.essentials.groupSize || 6,
      essentials: intent.essentials,
      prompts: intent.prompts,
      status: 'recruiting',
      likes: 0, hot: false, photos: [],
      createdBy: u.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const gr = await db.collection('groups').add(groupData);
    await db.collection('intents').doc(p.id).update({ status: 'confirmed', groupId: gr.id, updatedAt: Date.now() });
    return { ok: true, group: addId({ _id: gr.id, ...groupData }) };
  }
});

// 7. POST /api/intents/:id/dissolve — 解散队伍 + 差异点提取
P('/api/intents/:id/dissolve', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const intentDoc = await db.collection('intents').doc(p.id).get();
  if (!intentDoc.data.length) return err('意图不存在', 404);
  const intent = intentDoc.data[0];
  if (intent.author.id !== u.userId) return err('无权操作', 403);
  // 从关联 Group 的聊天记录提取差异点
  let diffPoints = [];
  const groups = await db.collection('groups').where({ intentId: p.id }).get();
  for (const g of groups.data) {
    const msgs = g.messages || [];
    diffPoints = diffPoints.concat(extractDifferencePoints(msgs));
  }
  // 去重
  const seen = new Set();
  diffPoints = diffPoints.filter(d => { const k = d.topic + d.userPreference; if (seen.has(k)) return false; seen.add(k); return true; });
  // 更新意图状态
  await db.collection('intents').doc(p.id).update({ status: 'dissolved', updatedAt: Date.now() });
  // 创建新 Intent，合并原始提示词 + 差异点
  const newPrompts = [...(intent.prompts || [])];
  for (const dp of diffPoints) {
    const label = dp.userPreference.replace('偏好: ', '').replace('排除: ', '');
    if (!newPrompts.includes(label)) newPrompts.push(label);
  }
  const newIntentData = {
    rawInput: intent.rawInput + (diffPoints.length ? '（差异点: ' + diffPoints.map(d => d.topic + ':' + d.userPreference).join(', ') + '）' : ''),
    essentials: { ...intent.essentials },
    prompts: newPrompts,
    essentialsComplete: intent.essentialsComplete,
    status: 'matching',
    author: intent.author,
    matchedUsers: [],
    dissolvedFrom: p.id,
    diffPoints,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const nr = await db.collection('intents').add(newIntentData);
  // 重新匹配
  const matchedUsers = await matchUsersSimple(u.userId, newIntentData.essentials, newPrompts, db);
  await db.collection('intents').doc(nr.id).update({ matchedUsers, updatedAt: Date.now() });
  // 给匹配到的用户发通知
  const userDoc = await db.collection('users').doc(u.userId).get();
  const user = userDoc.data[0] || {};
  for (const mu of matchedUsers) {
    await safeAdd('matchnotices', {
      intentId: nr.id,
      fromUserId: u.userId,
      fromUserName: user.name || '',
      toUserId: mu.id,
      status: 'pending',
      essentials: newIntentData.essentials,
      prompts: newPrompts,
      matchPct: mu.matchPct,
      reason: mu.reason,
      createdAt: Date.now(),
    });
  }
  return { ok: true, newIntent: addId({ _id: nr.id, ...newIntentData, matchedUsers }), diffPoints };
});

// ─── TrailMate: 新增路由 ─────────────────

// GET /api/groups/public — 公开队伍列表（广场用）
G('/api/groups/public', async (p, b, q) => {
  const type = q.type || 'latest';
  const page = Math.max(Number(q.page) || 1, 1);
  const limit = Math.min(Number(q.limit) || 6, 50);
  let col = db.collection('groups');
  if (type === 'share') col = col.where({ status: 'completed' });
  const r = await col.get();
  let items = addIds(r.data);
  if (type === 'latest') items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  else if (type === 'hot') items.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  else items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const total = items.length;
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);
  // 关联 intent 信息
  const result = [];
  for (const g of paged) {
    let tags = [];
    let location = '';
    let date = '';
    if (g.intentId) {
      try {
        const idoc = await db.collection('intents').doc(g.intentId).get();
        if (idoc.data.length) {
          const intent = idoc.data[0];
          tags = intent.prompts || [];
          location = (intent.essentials || {}).location || '';
          date = (intent.essentials || {}).date || '';
        }
      } catch (e) {}
    }
    result.push({
      id: g.id,
      name: g.name || '',
      members: g.members || [],
      maxMembers: g.maxMembers || (g.members || []).length + 3,
      likes: g.likes || 0,
      hot: (g.likes || 0) > 20,
      tags,
      photos: g.photos || [],
      location,
      date,
      status: g.status || '',
      createdAt: g.createdAt,
    });
  }
  return { items: result, total, hasMore: start + limit < total };
});

// GET /api/intents/:id — 单条意图查询
G('/api/intents/:id', async (p) => {
  const r = await db.collection('intents').doc(p.id).get();
  if (!r.data.length) return err('意图不存在', 404);
  return { intent: addId(r.data[0]) };
});

// PUT /api/intents/:id — 更新意图（含重新匹配）
U('/api/intents/:id', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const intentDoc = await db.collection('intents').doc(p.id).get();
  if (!intentDoc.data.length) return err('意图不存在', 404);
  const intent = intentDoc.data[0];
  if (intent.author.id !== u.userId) return err('无权操作', 403);
  const update = { updatedAt: Date.now() };
  if (b.prompts) update.prompts = b.prompts;
  if (b.essentials) update.essentials = b.essentials;
  await db.collection('intents').doc(p.id).update(update);
  // 如果更新了 prompts，重新匹配
  if (b.prompts) {
    const newPrompts = b.prompts;
    const essentials = b.essentials || intent.essentials || {};
    const matchedUsers = await matchUsersSimple(u.userId, essentials, newPrompts, db);
    await db.collection('intents').doc(p.id).update({ matchedUsers, updatedAt: Date.now() });
    const updated = await db.collection('intents').doc(p.id).get();
    return { intent: { ...addId(updated.data[0]), matchedUsers } };
  }
  const updated = await db.collection('intents').doc(p.id).get();
  return { intent: addId(updated.data[0]) };
});

// POST /api/intents/:id/iterate — 迭代匹配（追加提示词重新匹配）
P('/api/intents/:id/iterate', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const intentDoc = await db.collection('intents').doc(p.id).get();
  if (!intentDoc.data.length) return err('意图不存在', 404);
  const intent = intentDoc.data[0];
  if (intent.author.id !== u.userId) return err('无权操作', 403);
  const additionalPrompts = b.additionalPrompts || [];
  const newPrompts = [...(intent.prompts || []), ...additionalPrompts];
  // 重新匹配
  const matchedUsers = await matchUsersSimple(u.userId, intent.essentials || {}, newPrompts, db);
  await db.collection('intents').doc(p.id).update({ prompts: newPrompts, matchedUsers, status: 'matching', updatedAt: Date.now() });
  // 给新匹配到的用户发通知
  const userDoc = await db.collection('users').doc(u.userId).get();
  const user = userDoc.data[0] || {};
  for (const mu of matchedUsers) {
    await safeAdd('matchnotices', {
      intentId: p.id,
      fromUser: { id: u.userId, name: user.name || '', avatar: user.avatar || '', avatarUrl: user.avatarUrl || '' },
      toUserId: mu.id,
      rawInput: intent.rawInput,
      essentials: intent.essentials,
      prompts: newPrompts,
      matchPct: mu.matchPct,
      reason: mu.reason,
      status: 'pending',
      createdAt: Date.now(),
    });
  }
  const updated = await db.collection('intents').doc(p.id).get();
  return { intent: addId(updated.data[0]) };
});

// POST /api/groups/:id/leave — 退出队伍
P('/api/groups/:id/leave', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const group = found.doc;
  const members = (group.members || []).filter(m => (m.id || m) !== u.userId);
  const ud = await db.collection('users').doc(u.userId).get();
  const userName = (ud.data[0] || {}).name || '';
  const msgs = group.messages || [];
  msgs.push({ userId: 'system', userName: '系统', content: userName + ' 退出了队伍', createdAt: Date.now() });
  await db.collection('groups').doc(found.docId).update({ members, messages: msgs, updatedAt: Date.now() });
  return { ok: true };
});


// POST /api/groups/apply-merge — 申请合并队伍（发通知，等队长确认）
P('/api/groups/apply-merge', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const { fromId, toId } = b;
  if (!fromId || !toId) return err('缺少队伍ID');
  if (fromId === toId) return err('不能合并同一队伍');
  const fromFound = await findGroup(fromId); if (!fromFound) return err('来源队伍不存在', 404);
  const toFound = await findGroup(toId); if (!toFound) return err('目标队伍不存在', 404);
  const fromGroup = fromFound.doc; const toGroup = toFound.doc;
  const isLeader = (fromGroup.members || []).some(m => String(m.id || m) === String(u.userId) && m.role === 'leader')
    || String(fromGroup.creatorId || fromGroup.createdBy || '') === String(u.userId);
  if (!isLeader) return err('只有队长可以发起合并');
  const fromMembers = fromGroup.members || [];
  const toMembers = toGroup.members || [];
  const totalMembers = fromMembers.length + toMembers.length;
  const fromMax = fromGroup.maxMembers || fromGroup.essentials?.groupSize || 20;
  const toMax = toGroup.maxMembers || toGroup.essentials?.groupSize || 20;
  const maxMembers = Math.max(fromMax, toMax);
  if (totalMembers > maxMembers) return err('合并后人数超过上限，无法申请');
  const ud = await db.collection('users').doc(u.userId).get();
  const fromLeaderName = (ud.data[0] || {}).name || '队友';
  const toLeaderId = String(toGroup.creatorId || toGroup.createdBy || '');
  const toLeaderMember = toMembers.find(m => String(m.id || m) === toLeaderId || m.role === 'leader');
  const targetLeaderId = toLeaderId || String(toLeaderMember?.id || toLeaderMember || '');
  if (!targetLeaderId) return err('目标队伍没有队长', 400);
  await safeAdd('matchnotices', {
    toUserId: targetLeaderId, type: 'merge_request', status: 'pending',
    title: '队伍合并申请',
    content: `${fromLeaderName} 申请将队伍「${fromGroup.name}」（${fromMembers.length}人）合并到你的「${toGroup.name}」`,
    groupId: toId, fromGroupId: fromId, toGroupId: toId,
    fromUserName: fromLeaderName, fromUserId: u.userId, createdAt: Date.now(),
  });
  const msgs = toGroup.messages || [];
  msgs.push({ userId: 'system', userName: '系统',
    content: `${fromLeaderName} 申请将「${fromGroup.name}」合并到本队伍，等待队长确认`, createdAt: Date.now() });
  await db.collection('groups').doc(toFound.docId).update({ messages: msgs, updatedAt: Date.now() });
  return { ok: true, message: '合并申请已发送' };
});

// PUT /api/groups/merge-requests/:noticeId/accept — 队长同意合并
U('/api/groups/merge-requests/:noticeId/accept', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const noticeDoc = await db.collection('matchnotices').doc(p.noticeId).get();
  if (!noticeDoc.data.length) return err('通知不存在', 404);
  const notice = noticeDoc.data[0];
  if (notice.toUserId !== u.userId) return err('无权操作', 403);
  if (notice.type !== 'merge_request') return err('不是合并申请', 400);
  const { fromGroupId, toGroupId } = notice;
  if (!fromGroupId || !toGroupId) return err('通知数据不完整', 400);
  const fromFound = await findGroup(fromGroupId); if (!fromFound) return err('来源队伍不存在', 404);
  const toFound = await findGroup(toGroupId); if (!toFound) return err('目标队伍不存在', 404);
  const fromGroup = fromFound.doc; const toGroup = toFound.doc;
  const fromMembers = fromGroup.members || [];
  const toMembers = toGroup.members || [];
  const existingIds = new Set(toMembers.map(m => String(m.id || m)));
  const newMembers = [...toMembers];
  for (const m of fromMembers) { const mid = String(m.id || m); if (!existingIds.has(mid)) { newMembers.push(m); existingIds.add(mid); } }
  const mergedPrompts = [...new Set([...(toGroup.prompts || []), ...(fromGroup.prompts || [])])];
  const mergedMessages = [...(toGroup.messages || [])];
  mergedMessages.push({ userId: 'system', userName: '系统', content: `队伍「${fromGroup.name}」已合并到本队伍`, createdAt: Date.now() });
  await db.collection('groups').doc(toFound.docId).update({ members: newMembers, prompts: mergedPrompts, messages: mergedMessages, updatedAt: Date.now() });
  await db.collection('groups').doc(fromFound.docId).update({
    matchingEnabled: false,
    messages: [...(fromGroup.messages || []), { userId: 'system', userName: '系统', content: `队伍已合并到「${toGroup.name}」，匹配已停止`, createdAt: Date.now() }],
    updatedAt: Date.now()
  });
  await db.collection('matchnotices').doc(p.noticeId).update({ status: 'accepted', updatedAt: Date.now() });
  return { ok: true, groupId: toGroupId };
});

// PUT /api/groups/merge-requests/:noticeId/reject — 队长拒绝合并
U('/api/groups/merge-requests/:noticeId/reject', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const noticeDoc = await db.collection('matchnotices').doc(p.noticeId).get();
  if (!noticeDoc.data.length) return err('通知不存在', 404);
  if (noticeDoc.data[0].toUserId !== u.userId) return err('无权操作', 403);
  await db.collection('matchnotices').doc(p.noticeId).update({ status: 'rejected', updatedAt: Date.now() });
  return { ok: true };
});

// POST /api/groups/:id/apply-join — 个人申请加入队伍
P('/api/groups/:id/apply-join', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const group = found.doc; const members = group.members || [];
  if (members.some(m => String(m.id || m) === String(u.userId))) return err('你已经是队伍成员');
  const maxMembers = group.maxMembers || group.essentials?.groupSize || 20;
  if (members.length >= maxMembers) return err('队伍已满员');
  const toLeaderId = String(group.creatorId || group.createdBy || '');
  const leaderMember = members.find(m => String(m.id || m) === toLeaderId || m.role === 'leader');
  const targetLeaderId = toLeaderId || String(leaderMember?.id || leaderMember || '');
  if (!targetLeaderId) return err('目标队伍没有队长', 400);
  const ud = await db.collection('users').doc(u.userId).get();
  const applicantName = (ud.data[0] || {}).name || '队友';
  await safeAdd('matchnotices', {
    toUserId: targetLeaderId, type: 'join_request', status: 'pending',
    title: '入队申请',
    content: `${applicantName} 申请加入你的队伍「${group.name}」`,
    groupId: p.id, applicantUserId: u.userId, applicantName, createdAt: Date.now(),
  });
  const msgs = group.messages || [];
  msgs.push({ userId: 'system', userName: '系统', content: `${applicantName} 申请加入队伍，等待队长确认`, createdAt: Date.now() });
  await db.collection('groups').doc(found.docId).update({ messages: msgs, updatedAt: Date.now() });
  return { ok: true, message: '入队申请已发送' };
});

// PUT /api/groups/join-requests/:noticeId/accept — 队长同意入队申请
U('/api/groups/join-requests/:noticeId/accept', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const noticeDoc = await db.collection('matchnotices').doc(p.noticeId).get();
  if (!noticeDoc.data.length) return err('通知不存在', 404);
  const notice = noticeDoc.data[0];
  if (notice.toUserId !== u.userId) return err('无权操作', 403);
  if (notice.type !== 'join_request') return err('不是入队申请', 400);
  const { groupId, applicantUserId, applicantName } = notice;
  if (!groupId || !applicantUserId) return err('通知数据不完整', 400);
  const found = await findGroup(groupId); if (!found) return err('队伍不存在', 404);
  const group = found.doc; const members = group.members || [];
  if (members.some(m => String(m.id || m) === String(applicantUserId))) {
    await db.collection('matchnotices').doc(p.noticeId).update({ status: 'accepted', updatedAt: Date.now() });
    return { ok: true, groupId, message: '该用户已在队伍中' };
  }
  const maxMembers = group.maxMembers || group.essentials?.groupSize || 20;
  if (members.length >= maxMembers) return err('队伍已满员');
  const applicantDoc = await db.collection('users').doc(applicantUserId).get();
  const applicant = applicantDoc.data[0] || {};
  members.push({
    id: applicantUserId, name: applicantName || applicant.name || '',
    avatar: applicant.avatar || '', avatarUrl: applicant.avatarUrl || '',
    role: 'member', joinedAt: Date.now()
  });
  const msgs = group.messages || [];
  msgs.push({ userId: 'system', userName: '系统', content: `${applicantName} 已加入队伍`, createdAt: Date.now() });
  await db.collection('groups').doc(found.docId).update({ members, messages: msgs, updatedAt: Date.now() });
  await db.collection('matchnotices').doc(p.noticeId).update({ status: 'accepted', updatedAt: Date.now() });
  return { ok: true, groupId };
});

// PUT /api/groups/join-requests/:noticeId/reject — 队长拒绝入队申请
U('/api/groups/join-requests/:noticeId/reject', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const noticeDoc = await db.collection('matchnotices').doc(p.noticeId).get();
  if (!noticeDoc.data.length) return err('通知不存在', 404);
  if (noticeDoc.data[0].toUserId !== u.userId) return err('无权操作', 403);
  await db.collection('matchnotices').doc(p.noticeId).update({ status: 'rejected', updatedAt: Date.now() });
  return { ok: true };
});

// POST /api/groups/:id/checkin — 基于打卡点的签到（500米范围内）
P('/api/groups/:id/checkin', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const group = found.doc;
  const isMember = (group.members || []).some(m => (m.id || m) === u.userId);
  if (!isMember) return err('非队伍成员', 403);
  const { checkpointIndex, lat, lng } = b;
  if (checkpointIndex === undefined || !lat || !lng) return err('缺少打卡点索引或位置', 400);
  const checkpoints = group.checkpoints || [];
  if (checkpointIndex < 0 || checkpointIndex >= checkpoints.length) return err('打卡点不存在', 404);
  const cp = checkpoints[checkpointIndex];
  // Haversine 距离计算（米）
  const R = 6371000;
  const dLat = (lat - cp.lat) * Math.PI / 180;
  const dLng = (lng - cp.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(cp.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (dist > 500) return err(`距离打卡点${Math.round(dist)}米，需在500米范围内签到`, 400);
  // 检查是否已签到
  if (!cp.checkins) cp.checkins = [];
  if (cp.checkins.some(c => c.userId === u.userId)) return err('该打卡点已签到', 400);
  cp.checkins.push({ userId: u.userId, userName: u.userName || '匿名', avatarColor: u.avatarColor || '#10b981', checkedInAt: Date.now() });
  await db.collection('groups').doc(found.docId).update({ checkpoints, updatedAt: Date.now() });

  // 自动记录活动日志
  try {
    const ess = group.essentials || {};
    const logData = {
      userId: u.userId,
      userName: u.userName || '匿名',
      type: group.type || 'hike',
      title: group.name || '组队活动',
      date: ess.date || new Date().toISOString().slice(0, 10),
      location: ess.location || cp.name || '',
      distance: 0,
      duration: 0,
      notes: `打卡「${cp.name || '第' + (checkpointIndex + 1) + '个打卡点'}」`,
      photos: [],
      groupId: p.id,
      rating: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const existing = await db.collection('traillogs').where({ userId: u.userId, groupId: p.id }).limit(1).get();
    if (existing.data && existing.data.length > 0) {
      const prev = existing.data[0];
      const prevNotes = prev.notes || '';
      await db.collection('traillogs').doc(String(prev._id)).update({
        notes: prevNotes + '\n' + logData.notes,
        photos: [...new Set([...(prev.photos || []), ...(group.photos || [])])].slice(0, 20),
        updatedAt: Date.now(),
      });
    } else {
      await safeAdd('traillogs', logData);
    }
  } catch(e) { console.log('auto-log checkin err:', e.message); }

  return { ok: true, distance: Math.round(dist) };
});

// POST /api/groups/:id/sos — 基于 Group 的 SOS（切换：再次调用取消）
P('/api/groups/:id/sos', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const group = found.doc;
  const location = b.location || '';
  const message = b.message || '';
  // 更新用户位置中的 sos 标记
  const locations = found.locations || [];
  const locIdx = locations.findIndex(l => l.userId === u.userId);
  const turningOff = locIdx >= 0 && locations[locIdx].sos;
  if (locIdx >= 0) {
    locations[locIdx] = { ...locations[locIdx], sos: turningOff ? 0 : Date.now() };
  } else {
    locations.push({ userId: u.userId, userName: u.userName || '匿名', lat: 0, lng: 0, updatedAt: Date.now(), sos: Date.now() });
  }
  await db.collection('groups').doc(found.docId).update({ locations, updatedAt: Date.now() });
  if (!turningOff) {
    const sosData = {
      groupId: p.id,
      intentId: group.intentId || '',
      userId: u.userId,
      location,
      message,
      createdAt: Date.now(),
    };
    await db.collection('sosalerts').add(sosData);
    // ── 通知机制 ──
    const userName = u.userName || '匿名';
    const groupName = group.name || '队伍';
    // 1) 给所有队友发送求救通知
    const members = group.members || [];
    for (const m of members) {
      const mId = (m.id || m);
      if (mId === u.userId) continue; // 不通知自己
      await safeAdd('matchnotices', {
        type: 'sos',
        groupId: p.id,
        groupName,
        fromUserId: u.userId,
        fromUserName: userName,
        toUserId: mId,
        status: 'unread',
        message: `${userName} 在「${groupName}」发起求救！`,
        createdAt: Date.now(),
      });
    }
    // 2) 查找附近的在线用户并发送求救通知
    try {
      const userLocationsResult = await safeQuery('user_locations', db.collection('user_locations').limit(500));
      const userLocations = userLocationsResult.data || [];
      // 获取当前用户的位置
      const myLoc = locations.find(l => l.userId === u.userId);
      if (myLoc && myLoc.lat && myLoc.lng) {
        for (const ul of userLocations) {
          if (ul.userId === u.userId) continue; // 跳过自己
          if (members.some(mm => (mm.id || mm) === ul.userId)) continue; // 已通知的队友跳过
          // 检查是否在 5 分钟内活跃
          if (Date.now() - (ul.updatedAt || 0) > 300000) continue;
          const dist = haversineDistance(myLoc.lat, myLoc.lng, ul.lat, ul.lng);
          if (dist > 1000) continue; // 超过 1km
          // 检查用户是否开启了接收附近求救通知
          let userSettings = {};
          try {
            const usDoc = await db.collection('users').doc(ul.userId).get();
            const us = usDoc.data && usDoc.data[0];
            userSettings = (us && us.settings) || {};
          } catch(e) {}
          if (userSettings.sosNotifyNearby === false) continue; // 用户关闭了通知
          await safeAdd('matchnotices', {
            type: 'sos_nearby',
            fromUserId: u.userId,
            fromUserName: userName,
            toUserId: ul.userId,
            status: 'unread',
            message: `附近用户 ${userName} 发起求救！距离约 ${Math.round(dist)}m`,
            groupId: p.id,
            groupName,
            distance: Math.round(dist),
            createdAt: Date.now(),
          });
        }
      }
    } catch(e) { console.error('附近求救广播失败:', e.message); }
  }
  return { ok: true, sos: !turningOff };
});

// PUT /api/intents/notices/:noticeId — 接受/拒绝通知（修改版：接受时自动加入 Group）
U('/api/intents/notices/:noticeId', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const { status } = b;
  if (!status || !['accepted', 'rejected'].includes(status)) return err('status 必须为 accepted 或 rejected');
  const noticeDoc = await db.collection('matchnotices').doc(p.noticeId).get();
  if (!noticeDoc.data.length) return err('通知不存在', 404);
  if (noticeDoc.data[0].toUserId !== u.userId) return err('无权操作', 403);
  await db.collection('matchnotices').doc(p.noticeId).update({ status, updatedAt: Date.now() });
  let groupId;
  // 当 status=accepted 时，检查是否已有对应 Group
  if (status === 'accepted') {
    const notice = noticeDoc.data[0];
    const fromUserId = (notice.fromUser || {}).id || notice.fromUserId || '';
    // 查找 fromUser 的 intent 状态是 confirmed 且有对应 Group
    if (notice.intentId) {
      const intentDoc = await db.collection('intents').doc(notice.intentId).get();
      if (intentDoc.data.length && intentDoc.data[0].status === 'confirmed') {
        const groups = await db.collection('groups').where({ intentId: notice.intentId }).limit(1).get();
        if (groups.data.length) {
          const group = groups.data[0];
          const members = group.members || [];
          // 将当前用户加入 Group
          if (!members.find(m => (m.id || m) === u.userId)) {
            const ud = await db.collection('users').doc(u.userId).get();
            const userName = (ud.data[0] || {}).name || '';
            const avatar = (ud.data[0] || {}).avatar || '';
            const avatarUrl = (ud.data[0] || {}).avatarUrl || '';
            members.push({ id: u.userId, name: userName, avatar, avatarUrl });
            const msgs = group.messages || [];
            msgs.push({ userId: 'system', userName: '系统', content: userName + ' 加入了队伍', createdAt: Date.now() });
            await db.collection('groups').doc(group._id).update({ members, messages: msgs, updatedAt: Date.now() });
          }
          groupId = group._id;
        }
      }
    }
  }
  return { ok: true, groupId };
});

// GET /api/config/hike — 徒步配置
G('/api/config/hike', () => ({
  difficultyLevels: [
    { key: 'casual', label: '休闲', icon: '🚶' },
    { key: 'moderate', label: '中等', icon: '🥾' },
    { key: 'challenge', label: '挑战', icon: '⛰️' },
  ],
  eventTypes: [
    { key: 'dayhike', label: '日归' },
    { key: 'overnight', label: '过夜' },
    { key: 'longtrail', label: '长线' },
  ],
  preferences: [
    '不抽烟', '喜欢拍照', '有经验优先', '新手友好', '轻松节奏', '挑战型',
    '早起出发', '不早起', '轻装出行', '重装徒步', '走大路', '走野路',
    '不喝酒', '女生优先', 'AA制', '有车', '环保无痕', '可带宠物',
    '饮食偏好', '省钱优先', '安静不吵', '热闹社交', '有装备', '有水路线',
  ],
  costTypes: [
    { key: 'aa', label: 'AA制' },
    { key: 'free', label: '免费' },
    { key: 'shared', label: '均摊' },
  ],
  experienceLevels: [
    { key: 'novice', label: '新手' },
    { key: 'experienced', label: '有经验' },
    { key: 'veteran', label: '资深' },
  ],
  frequencies: [
    { key: 'weekly', label: '每周' },
    { key: 'monthly1', label: '每月1次' },
    { key: 'monthly2', label: '每月2次' },
    { key: 'rarely', label: '偶尔' },
  ],
}));

// POST /api/upload — 文件上传（简化版，base64 图片存云存储）
P('/api/upload', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const { base64, cloudPath } = b;
  if (!base64) return err('缺少 base64 数据');
  const path = cloudPath || ('uploads/' + u.userId + '/' + Date.now() + '.png');
  const fileContent = Buffer.from(base64, 'base64');
  const result = await cloud.uploadFile({ cloudPath: path, fileContent });
  return { url: result.fileID || '' };
});

// PUT /api/users/me/avatar — 更新头像
U('/api/users/me/avatar', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const { avatarUrl } = b;
  if (!avatarUrl) return err('缺少 avatarUrl');
  await db.collection('users').doc(u.userId).update({ avatarUrl, updatedAt: Date.now() });
  return { ok: true };
});

// GET /api/users/me/settings — 获取用户设置
G('/api/users/me/settings', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const d = await db.collection('users').doc(u.userId).get();
  const user = addId(d.data[0]) || {};
  return user.settings || {};
});

// PUT /api/users/me/settings — 更新用户设置
U('/api/users/me/settings', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const d = await db.collection('users').doc(u.userId).get();
  const user = addId(d.data[0]) || {};
  const currentSettings = user.settings || {};
  const update = { ...currentSettings, ...b, updatedAt: Date.now() };
  await db.collection('users').doc(u.userId).update({ settings: update });
  return { ok: true, settings: update };
});

// PUT /api/groups/:id/likes — 点赞队伍
U('/api/groups/:id/likes', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const increment = b.increment || 1;
  const currentLikes = (found.doc.likes || 0) + increment;
  await db.collection('groups').doc(found.docId).update({ likes: currentLikes, updatedAt: Date.now() });
  return { ok: true, likes: currentLikes };
});

// PUT /api/groups/:id — 更新队伍信息（计划、相册等）
U('/api/groups/:id', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const allowed = ['plan', 'photos', 'comments', 'name', 'desc', 'essentials', 'prompts', 'checkpoints', 'matchingEnabled', 'hikeStatus'];
  const updateData = { updatedAt: Date.now() };
  for (const key of allowed) {
    if (b[key] !== undefined) updateData[key] = b[key];
  }
  await db.collection('groups').doc(found.docId).update(updateData);
  return { ok: true };
});

// POST /api/groups/:id/location — 上报位置
P('/api/groups/:id/location', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const isMember = (found.members || []).some(m => (m.id || m) === u.userId);
  if (!isMember) return err('非队伍成员', 403);
  const { lat, lng } = b;
  if (!lat || !lng) return err('缺少坐标', 400);
  const locations = found.locations || [];
  const existingIdx = locations.findIndex(l => l.userId === u.userId);
  const locEntry = { userId: u.userId, userName: u.userName || '匿名', lat, lng, updatedAt: Date.now() };
  if (existingIdx >= 0) {
    locations[existingIdx] = locEntry;
  } else {
    locations.push(locEntry);
  }
  await db.collection('groups').doc(found.docId).update({ locations, updatedAt: Date.now() });
  // 同步到全局位置表，用于 SOS 附近用户查询
  await safeSet('user_locations', u.userId, {
    userId: u.userId,
    userName: u.userName || '匿名',
    lat, lng,
    updatedAt: Date.now(),
  });
  return { ok: true };
});

// GET /api/groups/:id/location — 获取队伍成员位置（需成员身份或 shareToken）
G('/api/groups/:id/location', async (p, b, q) => {
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const token = q.querystring && new URLSearchParams(q.querystring).get('token');
  const u = auth(q.headers.authorization);
  const isMember = u && (found.members || []).some(m => (m.id || m) === u.userId);
  if (!isMember && token !== found.shareToken) return err('无权查看', 403);
  return { locations: found.locations || [], checkpoints: isMember ? (found.checkpoints || []) : [], groupName: found.name, teamInfo: { location: found.essentials?.location, date: found.essentials?.date } };
});

// POST /api/groups/:id/share-token — 生成分享链接 token
P('/api/groups/:id/share-token', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const isMember = (found.members || []).some(m => (m.id || m) === u.userId);
  if (!isMember) return err('非队伍成员', 403);
  if (!found.shareToken) {
    const shareToken = 'loc_' + Math.random().toString(36).slice(2, 10);
    await db.collection('groups').doc(found.docId).update({ shareToken });
    return { shareToken };
  }
  return { shareToken: found.shareToken };
});

// 8. DELETE /api/intents/:id — 取消意图
D('/api/intents/:id', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const intentDoc = await db.collection('intents').doc(p.id).get();
  if (!intentDoc.data.length) return err('意图不存在', 404);
  if (intentDoc.data[0].author.id !== u.userId) return err('无权操作', 403);
  await db.collection('intents').doc(p.id).update({ status: 'cancelled', updatedAt: Date.now() });
  return { ok: true };
});

// 9. GET /api/hike-events — 徒步活动列表
G('/api/hike-events', async (p, b, q) => {
  const r = await db.collection('hikeevents').orderBy('date', 'desc').limit(20).get();
  const items = addIds(r.data);
  return { items, total: items.length };
});

// 10. POST /api/hike-events/:id/checkin — 签到
P('/api/hike-events/:id/checkin', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const eventDoc = await db.collection('hikeevents').doc(p.id).get();
  if (!eventDoc.data.length) return err('活动不存在', 404);
  const checkins = eventDoc.data[0].checkins || [];
  if (checkins.find(c => c.userId === u.userId)) return err('已签到');
  checkins.push({ userId: u.userId, checkedInAt: Date.now() });
  await db.collection('hikeevents').doc(p.id).update({ checkins });
  return { ok: true };
});

// 11. POST /api/hike-events/:id/sos — SOS
P('/api/hike-events/:id/sos', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const eventDoc = await db.collection('hikeevents').doc(p.id).get();
  if (!eventDoc.data.length) return err('活动不存在', 404);
  const { location, message } = b;
  const sosData = {
    eventId: p.id,
    userId: u.userId,
    location: location || '',
    message: message || '',
    createdAt: Date.now(),
  };
  await db.collection('sosalerts').add(sosData);
  return { ok: true, sos: sosData };
});

// ═══ 活动日志 API ═══

// GET /api/traillogs — 获取当前用户的活动日志列表
G('/api/traillogs', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const result = await safeQuery('traillogs', db.collection('traillogs').where({ userId: u.userId }).orderBy('date', 'desc').limit(200));
  return result.data || [];
});

// GET /api/traillogs/:id — 获取单条活动日志
G('/api/traillogs/:id', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const doc = await db.collection('traillogs').doc(p.id).get();
  if (!doc.data.length) return err('日志不存在', 404);
  const log = doc.data[0];
  if (log.userId !== u.userId) return err('无权查看', 403);
  return log;
});

// POST /api/traillogs — 创建活动日志
P('/api/traillogs', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const { type, title, date, location, distance, duration, notes, photos, groupId } = b;
  if (!title || !date) return err('标题和日期为必填项');
  const log = {
    userId: u.userId,
    userName: u.userName || '匿名',
    type: type || 'hike',
    title,
    date,
    location: location || '',
    distance: distance || 0,
    duration: duration || 0,
    notes: notes || '',
    photos: photos || [],
    groupId: groupId || '',
    rating: b.rating || 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const result = await safeAdd('traillogs', log);
  return { ok: true, id: result?.id, ...log };
});

// PUT /api/traillogs/:id — 更新活动日志
U('/api/traillogs/:id', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const doc = await db.collection('traillogs').doc(p.id).get();
  if (!doc.data.length) return err('日志不存在', 404);
  const log = doc.data[0];
  if (log.userId !== u.userId) return err('无权操作', 403);
  const allowed = ['title', 'date', 'location', 'distance', 'duration', 'notes', 'photos', 'rating', 'type'];
  const update = { updatedAt: Date.now() };
  for (const k of allowed) { if (b[k] !== undefined) update[k] = b[k]; }
  await db.collection('traillogs').doc(p.id).update(update);
  return { ok: true };
});

// DELETE /api/traillogs/:id — 删除活动日志
D('/api/traillogs/:id', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const doc = await db.collection('traillogs').doc(p.id).get();
  if (!doc.data.length) return err('日志不存在', 404);
  const log = doc.data[0];
  if (log.userId !== u.userId) return err('无权操作', 403);
  await db.collection('traillogs').doc(p.id).remove();
  return { ok: true };
});

// POST /api/groups/:id/generate-logs — 队伍结束时为每个成员生成活动日志
P('/api/groups/:id/generate-logs', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const group = found.doc;
  // 队长判定：creatorId / createdBy / 成员 role=leader / 第一个成员 任意匹配
  const members = group.members || [];
  const isLeader = String(group.creatorId || group.createdBy || '') === String(u.userId)
    || String(group.leaderId || '') === String(u.userId)
    || members.some(m => String(m.id || m) === String(u.userId) && m.role === 'leader')
    || (members[0] && String(members[0].id || members[0]) === String(u.userId));
  if (!isLeader) return err('仅队长可生成日志', 403);
  const photos = group.photos || [];
  const essentials = group.essentials || {};
  // 从 group_locations 集合取所有成员位置数据
  let calcDistance = 0;
  let calcDuration = 0;
  try {
    const locResult = await db.collection('group_locations').where({ groupId: p.id }).limit(500).get();
    const locations = (locResult.data || []).filter(l => l.lat && l.lng).sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
    if (locations.length >= 2) {
      for (let i = 1; i < locations.length; i++) {
        calcDistance += haversineDistance(locations[i-1].lat, locations[i-1].lng, locations[i].lat, locations[i].lng);
      }
      const times = locations.map(l => l.updatedAt).filter(Boolean).sort((a, b) => a - b);
      if (times.length >= 2) calcDuration = Math.round((times[times.length - 1] - times[0]) / 3600000 * 10) / 10;
    }
  } catch(e) { console.log('generate-logs: fetch locations err', e.message); }
  const results = [];
  for (const m of members) {
    const mId = String(m.id || m);
    const log = {
      userId: mId,
      userName: m.name || '队友',
      type: group.type || 'hike',
      title: group.name || '组队活动',
      date: essentials.date || new Date().toISOString().slice(0, 10),
      location: essentials.location || '',
      distance: Math.round(calcDistance / 100) / 10,
      duration: calcDuration,
      notes: `队伍「${group.name || '组队活动'}」活动记录`,
      photos: photos.slice(0, 20),
      groupId: p.id,
      status: 'active',
      rating: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await safeAdd('traillogs', log);
    results.push(log);
  }
  return { ok: true, count: results.length, results };
});

// POST /api/groups/:id/generate-log/:userId — 个人完成时生成个人日志
P('/api/groups/:id/generate-log/:userId', async (p, b, q) => {
  const u = auth(q.headers.authorization); if (!u) return err('Unauthorized', 401);
  const found = await findGroup(p.id); if (!found) return err('队伍不存在', 404);
  const group = found.doc;
  const photos = group.photos || [];
  const essentials = group.essentials || {};
  const data = b || {};
  const log = {
    userId: p.userId,
    userName: u.userName || '队友',
    type: group.type || 'hike',
    title: group.name || '组队活动',
    date: essentials.date || new Date().toISOString().slice(0, 10),
    location: essentials.location || '',
    distance: data.distance || 0,
    duration: data.duration || 0,
    notes: data.notes || `队伍「${group.name || '组队活动'}」活动记录`,
    photos: photos.slice(0, 20),
    checkpoints: data.checkpointRecords || [],
    groupId: p.id,
    status: 'completed',
    rating: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await safeAdd('traillogs', log);
  return { ok: true, log };
});

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
  // 解析 body — 兼容 base64 编码
  let body = {};
  try {
    if (event.body) {
      var rawBody = event.body;
      if (event.isBase64Encoded && typeof rawBody === 'string') {
        rawBody = Buffer.from(rawBody, 'base64').toString('utf8');
      }
      body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    }
  } catch(e) { console.error('Body parse error:', e.message); }
  const params = {};

  // Fallback: parameterized matching
  if(!handler) {
    const parts = path.split('/').filter(Boolean);
    for(const [k,h] of Object.entries(R)) {
      const ci=k.indexOf(':');
      const km=k.slice(0,ci), kp=k.slice(ci+1);
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

  if(!handler) return {statusCode:404,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'},body:JSON.stringify({error:'Not found',path,method})};

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
    return {statusCode:500,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'},body:JSON.stringify({error:'Internal Server Error'})};
  }
};
