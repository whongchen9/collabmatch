# TrailMate - 技术规格文档

## 1. 项目概述

将 CollabMatch 协作匹配平台改造为 TrailMate 徒步匹配平台。核心架构不变，替换领域模型和业务逻辑。

---

## 2. 代码改造清单

### 2.1 后端模型改造

#### User → Hiker（同集合，字段增删）

**文件**: `server/src/models/User.ts`

删除字段：
- `position`, `skills`, `domain`, `collabScore`, `projects`, `resources`, `portfolio`, `weeklyHours`, `collabIntent`, `interestedStages`, `apiToken`, `apiTokenLastGenerated`, `skillIds`

新增字段：
```typescript
city:              { type: String, default: '' },
experienceLevel:   { type: String, enum: ['novice', 'experienced', 'veteran'], default: 'novice' },
preferences:       { type: [String], default: [] },  // scenery/challenge/social/photography
hikeFrequency:     { type: String, enum: ['monthly1', 'monthly2-3', 'weekly1', 'weekly+'], default: 'monthly1' },
emergencyContacts: { type: [{ name: String, phone: String }], default: [] },
creditScore:       { type: Number, default: 100 },
hikeCount:         { type: Number, default: 0 },
totalDistance:      { type: Number, default: 0 },
```

#### Requirement → HikeEvent（新集合 `hikeevents`）

**文件**: `server/src/models/HikeEvent.ts`（新建）

```typescript
interface IHikeEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  author: Types.ObjectId;          // → User
  status: 'draft' | 'open' | 'full' | 'ongoing' | 'ended';
  visibility: 'public' | 'match_only' | 'invite_only';
  difficulty: 'casual' | 'advanced' | 'challenge';
  eventType: 'dayhike' | 'overnight' | 'longtrail';
  startDate: Date;
  meetupPoint: string;
  endPoint: string;
  distance: number;                // km
  elevation: number;               // m
  estimatedHours: number;
  maxMembers: number;
  feeType: 'aa' | 'free' | 'selfpay';
  feeAmount: number;
  gearRequired: string;
  description: string;
  coverImage: string;
  gpxFileId: Types.ObjectId;       // → FileAsset
  tags: string[];
  invitees: Types.ObjectId[];
  matchProgress: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Application → JoinRequest（新集合 `joinrequests`）

**文件**: `server/src/models/JoinRequest.ts`（新建）

```typescript
interface IJoinRequest extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;         // → HikeEvent
  userId: Types.ObjectId;          // → User
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}
// 唯一索引: { eventId, userId }
```

#### Group 改造（同集合，字段增删）

**文件**: `server/src/models/Group.ts`

- `reqId` → `eventId`（关联 HikeEvent）
- 新增 `meetupLocation: String`
- 新增 `status: 'forming' | 'ready' | 'ongoing' | 'completed'`

#### 新增 CheckIn 模型

**文件**: `server/src/models/CheckIn.ts`（新建）

```typescript
interface ICheckIn extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;         // → HikeEvent
  userId: Types.ObjectId;          // → User
  type: 'start' | 'finish' | 'sos';
  location: { lat: number; lng: number };
  address: string;
  time: Date;
}
// 索引: { eventId, userId, type }
```

#### 删除模型
- `UserSkill.ts` — 不再需要自定义技能
- `SmsCode.ts` — MVP 不做短信验证码
- `ExternalAccount.ts` — 不做即DAO集成

### 2.2 后端路由改造

#### 删除路由
- `server/src/routes/ai.ts` — P1 再实现 AI 路线助手
- `server/src/routes/publicApi.ts` — MVP 不做公开 API
- `server/src/routes/conversations.ts` — P1 再实现行程规划对话
- 即DAO集成路由全部删除

#### 改造路由

**`server/src/routes/requirements.ts` → `server/src/routes/hikeEvents.ts`**

| 旧端点 | 新端点 | 变更 |
|--------|--------|------|
| GET /requirements | GET /hike-events | 筛选参数改为 difficulty/eventType/dateRange/city |
| GET /requirements/mine | GET /hike-events/mine | 保留 |
| POST /requirements | POST /hike-events | 请求体改为活动字段 |
| GET /requirements/:id | GET /hike-events/:id | 保留 |
| PUT /requirements/:id | PUT /hike-events/:id | 保留 |
| DELETE /requirements/:id | DELETE /hike-events/:id | 级联删除 JoinRequest + Group |
| PUT /requirements/:id/publish | PUT /hike-events/:id/publish | 保留 |
| PUT /requirements/:id/apply | PUT /hike-events/:id/join | 字段名变更 |
| GET /requirements/:id/applications | GET /hike-events/:id/requests | 保留 |
| PUT /requirements/:id/applications/:appId | PUT /hike-events/:id/requests/:reqId | 保留 |

**新增端点**

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | /hike-events/:id/checkin | 签到（start/finish/sos） |
| GET | /hike-events/:id/checkins | 获取签到记录 |
| POST | /hike-events/:id/sos | 一键SOS |

**`server/src/routes/groups.ts` 改造**
- `reqId` → `eventId`
- 创建群组时关联 HikeEvent

**`server/src/routes/match.ts` 改造**
- 正向匹配：HikeEvent → 推荐用户（体能+偏好+时间+距离）
- 反向匹配：用户 → 推荐 HikeEvent（体能+偏好+时间+距离+热度）

**`server/src/routes/users.ts` 改造**
- 删除：skills 相关端点、portfolio 端点、api-token 端点、ai-enhance 端点
- 新增：
  - PUT /users/me/emergency-contacts — 更新紧急联系人
  - GET /users/me/credit — 获取信用分
  - GET /users/me/stats — 获取徒步统计

**`server/src/routes/auth.ts`**
- 保留现有认证逻辑（邮箱+密码、GitHub OAuth、访客模式）

#### 删除文件
- `server/src/services/skillRunner.ts`
- `server/src/services/aiMock.ts`
- `server/src/services/xiaoChenDaoClient.ts`
- `server/src/services/xcdSync.ts`
- `server/src/services/reqFromLlm.ts`
- `server/src/services/profileEnhance.ts`
- `server/src/mcp/` 目录
- `server/src/config/domains.ts` → 替换为 `server/src/config/hikeConfig.ts`

### 2.3 配置改造

**删除**: `server/src/config/domains.ts`

**新建**: `server/src/config/hikeConfig.ts`

```typescript
export const DIFFICULTY_LEVELS = {
  casual:   { label: '休闲', icon: '🌿', color: '#4ade80' },
  advanced: { label: '进阶', icon: '⛰️', color: '#f59e0b' },
  challenge:{ label: '挑战', icon: '🏔️', color: '#ef4444' },
} as const;

export const EVENT_TYPES = {
  dayhike:   { label: '日归', icon: '☀️' },
  overnight: { label: '多日', icon: '⛺' },
  longtrail: { label: '长线', icon: '🗺️' },
} as const;

export const PREFERENCES = {
  scenery:   { label: '风景', icon: '🏞️' },
  challenge: { label: '挑战', icon: '💪' },
  social:    { label: '社交', icon: '🤝' },
  photography:{ label: '摄影', icon: '📷' },
} as const;

export const FEE_TYPES = {
  aa:       { label: 'AA' },
  free:     { label: '免费' },
  selfpay:  { label: '各自付' },
} as const;

export const EXPERIENCE_LEVELS = {
  novice:     { label: '新手', icon: '🌱' },
  experienced:{ label: '有经验', icon: '🥾' },
  veteran:    { label: '老驴', icon: '🏔️' },
} as const;

export const HIKE_FREQUENCIES = {
  monthly1:   { label: '每月1次' },
  'monthly2-3': { label: '每月2-3次' },
  weekly1:    { label: '每周1次' },
  'weekly+':  { label: '每周多次' },
} as const;

// 体能匹配矩阵：[活动难度][用户经验等级] → 分数(0-100)
export const FITNESS_MATRIX = {
  casual:    { novice: 100, experienced: 80,  veteran: 50 },
  advanced:  { novice: 40,  experienced: 100, veteran: 80 },
  challenge: { novice: 0,   experienced: 60,  veteran: 100 },
} as const;
```

### 2.4 匹配算法改造

**文件**: `server/src/routes/match.ts`

```typescript
// 正向匹配：活动 → 推荐用户
function calculateMatchScore(user: IUser, event: IHikeEvent): number {
  const fitnessScore = FITNESS_MATRIX[event.difficulty][user.experienceLevel];
  const preferenceScore = jaccardSimilarity(user.preferences, event.tags) * 100;
  const timeScore = calculateTimeScore(user.hikeFrequency, event.eventType);
  const distanceScore = calculateDistanceScore(user.city, event.meetupPoint);

  return Math.min(98, Math.round(
    fitnessScore * 0.40 +
    preferenceScore * 0.25 +
    timeScore * 0.20 +
    distanceScore * 0.15
  ));
}

// 反向匹配：用户 → 推荐活动
function calculateReverseScore(user: IUser, event: IHikeEvent): number {
  const fitnessScore = FITNESS_MATRIX[event.difficulty][user.experienceLevel];
  const preferenceScore = jaccardSimilarity(user.preferences, event.tags) * 100;
  const timeScore = calculateTimeScore(user.hikeFrequency, event.eventType);
  const distanceScore = calculateDistanceScore(user.city, event.meetupPoint);
  const heatScore = (event.invitees?.length || 0) / Math.max(event.maxMembers, 1) * 100;

  return Math.min(95, Math.round(
    fitnessScore * 0.35 +
    preferenceScore * 0.25 +
    timeScore * 0.15 +
    distanceScore * 0.10 +
    heatScore * 0.15
  ));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}
```

### 2.5 前端改造

#### api-bridge.js 改造

| 旧方法 | 新方法 | 变更 |
|--------|--------|------|
| loadRequirements() | loadHikeEvents() | 端点 /hike-events |
| loadSquareRequirements(filters) | loadSquareEvents(filters) | 筛选参数变更 |
| createRequirement(body) | createHikeEvent(body) | 请求体变更 |
| updateRequirement(id, body) | updateHikeEvent(id, body) | 请求体变更 |
| publishRequirement(id, vis) | publishHikeEvent(id, vis) | 保留 |
| deleteRequirement(id) | deleteHikeEvent(id) | 保留 |
| applyRequirement(id, opts) | joinHikeEvent(id, opts) | 端点变更 |
| fetchReqApplications(reqId) | fetchEventRequests(eventId) | 端点变更 |
| reviewApplication(reqId, appId, status) | reviewJoinRequest(eventId, reqId, status) | 端点变更 |
| fetchMyApplications() | fetchMyJoinRequests() | 端点变更 |
| matchForward(requirementId) | matchForward(eventId) | 端点变更 |
| matchReverse(limit) | matchReverse(limit) | 保留 |
| saveUserSkills(skills) | saveUserPreferences(prefs) | 端点变更 |
| loadConfig(DOMAINS, SKILLS, MAP) | loadHikeConfig() | 端点变更 |

**新增方法**：
- `checkIn(eventId, type, location)` — 签到
- `sendSOS(eventId, location)` — 一键SOS
- `saveEmergencyContacts(contacts)` — 保存紧急联系人
- `fetchMyStats()` — 获取徒步统计

**删除方法**：
- `streamAiChat`, `runSkill` — P1 再实现
- `createConversation`, `deleteConversation`, `uploadChatAttachment`, `forwardMessage` — P1 再实现
- `fetchMyPortfolio`, `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem` — P1 再实现
- `aiEnhanceProfile` — P1 再实现
- `mergeRequirements` → `mergeHikeEvents`

#### index.html 改造

**导航改造**：
- "首页" → AI 路线助手（P1 先显示欢迎页）
- "智能匹配" → 保留，文案改为徒步匹配
- "需求广场" → "活动广场"
- "协作群组" → "我的队伍"
- "知识库" → 删除（P1 替换为路线图鉴）
- "个人名片" → "个人档案"
- "设置" → 保留，增加紧急联系人设置

**活动发布表单**：
- 标题、描述（保留）
- 难度选择（替代领域选择）
- 活动类型（新增）
- 出发日期时间（新增，datetime-local input）
- 集合地点（新增，文本输入，P1 接地图选点）
- 距离/海拔/时长（新增，数字输入）
- 人数上限（新增）
- 费用方式（新增）
- 装备提示（新增）
- 标签（替代关键词）

**活动卡片**：
- 显示难度标签（颜色区分）
- 显示日期、地点、人数
- 显示费用方式

**个人档案**：
- 经验等级选择
- 偏好标签选择
- 出行频率选择
- 常驻城市输入
- 紧急联系人编辑

**匹配结果**：
- 显示匹配度百分比
- 显示匹配原因（体能匹配、偏好匹配等）

### 2.6 环境变量

新增：
```
GAODE_MAP_KEY=xxx          # 高德地图 API Key（P0）
QWEATHER_KEY=xxx           # 和风天气 API Key（P1）
```

保留：
```
MONGODB_URI
JWT_SECRET
DB_DRIVER=mongo
AUTH_MODE=dev
CORS_ORIGINS
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_OAUTH_CALLBACK_URL
```

删除：
```
DOUBAO_API_KEY              # AI 功能 P1 再接入
RESEND_API_KEY              # 邮件功能 P1 再接入
```

---

## 3. 数据迁移

由于是全新部署（MongoDB Atlas 新数据库），不需要数据迁移。`SEED_ON_START=true` 时自动创建种子数据。

### 种子数据设计

**种子用户**：
- 张三（老驴，偏好挑战+摄影，深圳）
- 李四（有经验，偏好风景+社交，广州）
- 王五（新手，偏好风景，东莞）

**种子活动**：
- 深圳梧桐山日归（进阶）
- 广州白云山休闲徒步（休闲）
- 惠州大南山挑战（挑战）

---

## 4. 文件结构变更

### 新增文件
```
server/src/models/HikeEvent.ts
server/src/models/JoinRequest.ts
server/src/models/CheckIn.ts
server/src/routes/hikeEvents.ts
server/src/config/hikeConfig.ts
server/src/utils/hikeMatch.ts
```

### 删除文件
```
server/src/models/UserSkill.ts
server/src/models/SmsCode.ts
server/src/models/ExternalAccount.ts
server/src/routes/ai.ts
server/src/routes/publicApi.ts
server/src/routes/conversations.ts
server/src/services/skillRunner.ts
server/src/services/aiMock.ts
server/src/services/xiaoChenDaoClient.ts
server/src/services/xcdSync.ts
server/src/services/reqFromLlm.ts
server/src/services/profileEnhance.ts
server/src/mcp/ 目录
server/src/config/domains.ts
```

### 修改文件
```
server/src/models/User.ts          — 字段增删
server/src/models/Group.ts         — reqId→eventId, 新增字段
server/src/models/FileAsset.ts     — conversationId 删除, 新增 eventId
server/src/routes/index.ts         — 路由注册变更
server/src/routes/match.ts         — 匹配算法改造
server/src/routes/groups.ts        — reqId→eventId
server/src/routes/users.ts         — 端点增删
server/src/routes/auth.ts          — 保留
server/src/services/seed.ts        — 种子数据改造
server/src/services/fileStorage.ts — 关联字段变更
server/src/utils/serialize.ts      — 序列化逻辑改造
api-bridge.js                      — API 方法改造
index.html                         — UI 全面改造
vercel.json                        — 保留
```

---

## 5. 第三方服务接入

### 5.1 高德地图 JS API（P0）

**用途**：活动集合地点选择、距离计算

**接入方式**：
- 前端加载高德地图 JS SDK
- 活动发布时使用地图选点组件选择集合地点
- 匹配算法中计算城市间距离

**免费额度**：每日 30万次，够用

**申请地址**：https://lbs.amap.com/dev/key/app

### 5.2 和风天气 API（P1）

**用途**：活动天气查询、恶劣天气预警

**接入方式**：
- 后端定时查询活动集合地点天气
- 恶劣天气推送通知

**免费额度**：每日 1000次

**申请地址**：https://dev.qweather.com/

---

## 6. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 高德地图 API 需要备案域名 | 无法在 Vercel 域名使用 | 先用文本输入地点 + 预置城市间距离表，P1 接地图 |
| MongoDB Atlas 免费集群性能 | 高并发时慢 | MVP 阶段用户量小，够用 |
| Vercel Serverless 冷启动 | 首次请求慢（1-3秒） | 可接受，后续优化；**SOS 路由单独部署为轻量函数**减少延迟 |
| 位置共享需 WebSocket | Vercel 不支持 | MVP 用轮询，P2 接入第三方 |
| **SOS 响应延迟** | Serverless 冷启动影响紧急响应 | **P0 方案**：站内通知 + 邮件通知（Resend API已配置）；**P1 方案**：接入腾讯云短信 API |
| **首页 MVP 不明确** | AI 路线助手在 P1，MVP 首页无内容 | MVP 首页实现为**活动信息流**（推荐+附近+热门），AI 助手入口保留但显示"即将上线" |
| **文件存储** | 活动封面图用 base64 占数据库 | P0 直接用**腾讯云 COS**（已配置），支持图片上传和缩放 |
