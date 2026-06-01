# CollabMatch Backend Spec

> 给 Cursor 写后端用的完整参考文档。前端原型位于 `index.html`，可直接打开参考 UI 和数据流。

---

## 技术选型建议

| 层 | 推荐 | 备选 |
|---|------|------|
| 运行时 | Node.js + Express + TypeScript | Go/FastAPI |
| 数据库 | MongoDB（灵活 schema，匹配前端 JS 对象结构） | PostgreSQL + JSONB |
| 认证 | JWT（手机号/微信登录） | Supabase Auth |
| AI | 豆包 LLM API（火山引擎方舟），支持 SSE 流式 | OpenAI 兼容格式 |
| 部署 | 腾讯云云函数 / Vercel | VPS |

---

## 数据模型

### User

```js
{
  _id: ObjectId,
  phone: String,              // 手机号（登录用）
  name: String,               // "李云帆"
  avatar: String,             // 头像文字 "李"
  avatarColor: String,        // 渐变色
  position: String,           // "全栈工程师 & 技术创始人"
  bio: String,                // 自我介绍
  skills: [String],           // ["React", "Node.js", "Python", "AI/ML"]
  domain: String,             // 默认领域: "tech" | "design" | "content" | "education" | "business"
  collabScore: Number,        // 协作评分 1-5
  projects: Number,           // 参与项目数
  resources: [{
    icon: String,             // "🖥️"
    name: String,             // "高性能服务器"
    desc: String              // "4核8G 云服务器"
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Requirement

```js
{
  _id: ObjectId,
  title: String,              // "AI 驱动的智能项目管理平台"
  author: ref(User),
  status: String,             // "draft" | "open" | "matched"
  visibility: String,         // "public" | "match_only" | "invite_only"
  domain: String,             // "tech" | "design" | "content" | "education" | "business"
  skills: [String],           // ["React", "Node.js", "AI/ML"]
  keywords: [String],         // ["React", "AI", "项目管理"]
  background: String,         // 项目背景
  goal: String,               // 项目目标
  timeline: String,           // "3-6 个月"
  outcome: String,            // 预期成果
  desc: String,               // 详细描述
  matchProgress: Number,      // 0-100，匹配进度
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation

```js
{
  _id: ObjectId,
  userId: ref(User),
  title: String,              // "新需求对话" → AI 生成需求后自动命名
  domain: String,             // 当前领域
  messages: [{
    role: String,             // "ai" | "user"
    content: String,          // 消息内容（含 markdown）
    time: Date,
    reqCard: (optional) ref(Requirement)  // AI 生成的需求卡片附属于此消息
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Group

```js
{
  _id: ObjectId,
  name: String,               // "AI 项目管理团队"
  emoji: String,              // "🚀"
  avatarColor: String,
  desc: String,
  reqId: ref(Requirement),    // 关联的需求
  members: [ref(User)],       // 成员列表
  messages: [{
    user: ref(User),
    type: String,             // "text" | "file"
    content: String,          // 文本内容
    fileName: String,         // 文件名（type=file 时）
    fileSize: String,
    time: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Skill（系统预设，纯配置，不存数据库）

```js
{
  id: String,                 // "generate_prd"
  icon: String,               // "📋"
  name: String,               // "生成需求文档"
  desktop: String,            // 一句话描述
  instruct: String            // 发给 LLM 的系统指令
}
```

### Domain（系统预设，纯配置）

```js
{
  key: String,                // "tech"
  name: String,               // "💻 技术开发"
  icon: String,               // "💻"
  color: String,              // "#8b5cf6"
  skills: [String],           // 该领域典型技能列表
  templates: [                // 快速提示词
    [label: String, text: String]
  ],
  chatIntro: String           // 该领域 AI 开场白
}
```

---

## API 端点

### 认证

```
POST   /api/auth/login          body: { phone, code }     → { token, user }
GET    /api/auth/me              header: Authorization     → { user }
```

### 用户

```
GET    /api/users                query: ?skills=...&domain=...  → [User]
GET    /api/users/:id            → { user }
PUT    /api/users/me             body: partial<User>       → { user }
PUT    /api/users/me/skills      body: { skills: [] }      → { user }
PUT    /api/users/me/resources   body: { resources: [] }   → { user }
```

### 需求

```
GET    /api/requirements              query: ?domain=&visibility=public  → [Requirement]
GET    /api/requirements/mine        → [Requirement]  （当前用户的需求）
POST   /api/requirements             body: Requirement → { requirement }
GET    /api/requirements/:id         → { requirement }
PUT    /api/requirements/:id         body: partial<Requirement> → { requirement }
PUT    /api/requirements/:id/publish  body: { visibility }  → { requirement }
PUT    /api/requirements/:id/apply   → { success }  （申请参与）
```

### 智能匹配

```
GET    /api/match/forward?requirementId=   → [{ user, matchPct }]  （需求找用户）
GET    /api/match/reverse?limit=3          → [{ requirement, matchPct }]  （用户技能找需求）

// 匹配算法伪代码：
// forward: req.skills ∩ user.skills + user.collabScore
// reverse: user.skills ∩ req.keywords + domain bonus + req.matchProgress
```

### 对话

```
GET    /api/conversations                  → [Conversation]  （列表）
POST   /api/conversations                  body: { domain } → { conversation }
GET    /api/conversations/:id              → { conversation }
DELETE /api/conversations/:id              → { success }
```

### AI

```
POST   /api/ai/chat                         body: { conversationId, message }
  → SSE 流式返回: data: { chunk, conversationId }
  调用豆包 LLM API，System Prompt 包含当前对话上下文 + 用户个人信息
  如果 LLM 返回 reqCard，存入 REQUIREMENTS 并关联到消息

POST   /api/ai/skill                        body: { conversationId, skillId, context }
  → { message }
  按 skillId 拼装 instruct + context 发给 LLM
```

### 群组

```
GET    /api/groups                          → [Group]  （我的群组）
GET    /api/groups/:id                      → { group }
POST   /api/groups                          body: { reqId, invitedUserId } → { group }
POST   /api/groups/:id/messages             body: { content }  → { message }
```

### 系统配置（供前端初始化读取，纯静态 JSON）

```
GET    /api/config/domains                  → { domains }
GET    /api/config/skills                   → { skills, domainSkillMap }
```

---

## AI Integration 说明

### 豆包 LLM 调用

```
POST https://ark.cn-beijing.volces.com/api/v3/chat/completions
Header: Authorization: Bearer <YOUR_API_KEY>

Body:
{
  "model": "doubao-pro-32k",
  "messages": [
    { "role": "system", "content": "你是 CollabAI，帮助用户找到协作者..." },
    ...conversation.messages
  ],
  "stream": true
}
```

#### System Prompt 模板

```
你是 CollabAI，一个专注于协作匹配的 AI 助手。你的职责：

1. 理解用户的项目需求或协作意向
2. 整理为结构化需求文档（标题、背景、目标、所需技能、时间线、预期成果）
3. 评估需求可行性，给出务实建议
4. 生成吸引协作者的优化描述

当前用户信息：
- 姓名：{user.name}
- 技能：{user.skills.join(', ')}
- 当前领域：{domain.name}

如果用户描述了一个具体需求，你应该：
1. 生成结构化需求文档
2. 自动在返回消息中附带 reqCard（标题+技能+背景+目标）

回复风格：友好、专业、极简，不用"你好！很高兴为你服务"之类客套话。
```

### 技能执行

```
POST /api/ai/skill body: { skillId, context }

后端流程：
1. 查 SKILLS[skillId].instruct
2. 拼消息: instruct + "\n\n用户需求内容：\n" + context
3. 发给 LLM
4. 返回 AI 回复
5. 如果是 generate_prd，同时创建 Requirement 记录
```

---

## 部署建议

```
  开发阶段：
  - 后端: localhost:3001 (Express)，`cd server && npm run dev`
  - 前端: 直接打开 `index.html`（已内置 `api-bridge.js`，默认连接 `http://localhost:3001/api`）
  - 跨域: cors()（file:// 协议下 fetch 本地 API 已可用）

生产阶段：
  方案A（推荐）：
    - 后端: 腾讯云云函数 SCF (Express 适配)
    - 数据库: 腾讯云 MongoDB 或云数据库
    - 前端: 静态托管 / CDN
  
  方案B：
    - 全栈: Vercel (API Routes + Static)
    - 数据库: MongoDB Atlas
```

---

## 前端改造点（需要你调整）

以下位置在前端 `index.html` 中需要改为真实 API 调用：

| 位置 | 当前 | 改为 |
|------|------|------|
| `USERS` 数组 | JS 硬编码 | `fetch('/api/users')` |
| `REQUIREMENTS` 数组 | JS 硬编码 | `fetch('/api/requirements')` |
| `conversations` 数组 | JS 硬编码 | `fetch('/api/conversations')` |
| `GROUPS` 数组 | JS 硬编码 | `fetch('/api/groups')` |
| `generateAiResponse()` | 前端正则模拟 | `fetch('/api/ai/chat', ...stream)` |
| `generateSkillResponse()` | 前端 switch 模拟 | `fetch('/api/ai/skill', ...)` |
| `selectMatchReq()` 匹配算法 | 前端计算 | `fetch('/api/match/forward?reqId=')` |
| `reverseMatch()` | 前端计算 | `fetch('/api/match/reverse')` |
| `saveProfile()` | 前端更新变量 | `fetch('/api/users/me', {method:'PUT'})` |
| `publishReq()` | 前端改状态 | `fetch('/api/requirements/:id/publish')` |

---

## 文件清单

```
collabmatch/
├── index.html          # 前端原型（已存在）
├── BACKEND_SPEC.md     # 本文件
└── (待生成)
    ├── server/         # Express 后端
    │   ├── src/
    │   │   ├── routes/
    │   │   ├── models/
    │   │   ├── services/  # AI 服务、匹配算法
    │   │   └── index.ts
    │   └── package.json
    └── README.md
```

---

## 📁 新增：作品集 (Portfolio)

### 数据模型

```js
// PortfolioItem — 嵌入在 User 文档中
{
  _id: ObjectId,
  title: String,              // "智能数据分析平台"
  role: String,               // "全栈开发" | "UI 设计" | "产品经理"
  desc: String,               // 作品描述
  collaborators: [String],    // 协作者姓名（或 ref User）
  visibility: String,         // "public" | "match_only"
  color: String,              // 卡片渐变色
  imageUrl: String,           // 可选：截图/封面
  createdAt: Date
}
```

### API 端点

```
GET    /api/users/me/portfolio              → [PortfolioItem]         # 我的作品集
POST   /api/users/me/portfolio              body: PortfolioItem       # 添加作品
PUT    /api/users/me/portfolio/:id          body: PortfolioItem       # 编辑作品
DELETE /api/users/me/portfolio/:id          → { success }             # 删除作品

# 用户详情中附带公开作品（用于匹配卡片、需求详情展示）
GET    /api/users/:id                        → { user, portfolio: [...]  }  # 仅返回 visibility=public 的作品
```

### 前端需要改造的地方

| 当前 | 改为 |
|------|------|
| `currentUser.portfolio` JS 硬编码 | `fetch('/api/users/me/portfolio')` |
| `u.portfolioCount` mock 数据 | 后端用户接口返回 `portfolioCount` 字段 |
| "添加作品"按钮 toast 提示 | 弹出表单 → `POST /api/users/me/portfolio` |
| `renderPortfolioGrid()` 纯展示 | 加载 API 数据后渲染，支持编辑/删除 |

---

## ⚡ 新增：技能市场 + 工作流（Phase 1-2）

### 前端已有（纯 mock，需后端对接）

前端右侧面板新增三个 Tab：**对话 | 技能 | 流程**

#### 技能数据结构扩展

SKILLS 对象新增字段（后端对应 `skills` 集合）：

```js
{
  id: 'swot',                    // key
  icon: '🔍',
  name: 'SWOT 分析',
  desktop: '竞品SWOT分析矩阵',
  instruct: '请对用户描述...',    // LLM 系统指令
  category: 'official'|'community',  // 新增
  author: '策略大师',              // 新增
  tags: ['分析','竞品','商业'],    // 新增
  installs: 3200,                  // 新增
  version: '1.0',                  // 新增
  isInstallable: true              // 新增
}
```

#### 工作流数据结构

```js
Workflow {
  id, name, desc, icon,
  steps: [
    { skill: 'generate_prd', icon: '📋', title: '生成需求文档' },
    { skill: 'diagnose',     icon: '🎯', title: '诊断需求可行性' },
  ],
  tags: ['完整流程', '推荐']
}
```

### 前端调用的后端接口

```
# 技能市场
GET    /api/skills               → 所有技能列表（含安装状态）
POST   /api/users/me/skills      body: { skillIds: [...] }  → 更新已安装技能
GET    /api/users/me/skills      → 当前用户已安装的技能 ID 列表

# 工作流
GET    /api/workflows            → 所有工作流模板
POST   /api/workflows/run        body: { conversationId, workflowId, context }
  → 后端串行执行每个 step 的 skill，返回全部消息

# 工作流执行（后端逻辑）
# 1. 接收 workflowId + conversationId
# 2. 遍历 workflow.steps，每个 step 调 runSkill
# 3. 每条 skill 的 AI 回复存入 conversation
# 4. 全部完成后返回
```

### 后端工作量估算

| 接口 | 工作量 |
|------|--------|
| `GET /api/skills` | 0.5h（静态种子数据） |
| `POST/GET /api/users/me/skills` | 1h（用户关联存储） |
| `GET /api/workflows` | 0.2h（静态种子数据） |
| `POST /api/workflows/run` | 1h（串行调 skill） |
