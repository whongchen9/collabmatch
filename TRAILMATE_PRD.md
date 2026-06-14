# TrailMate - 徒步匹配平台 PRD

## 1. 产品定位

**一句话描述**：帮徒步爱好者找到合适的队伍和路线，让每次出行都安全、有趣。

**目标用户**：
- 想徒步但找不到同伴的新手
- 有经验想组织活动但缺人的领队
- 想探索新路线的户外爱好者
- 想记录和分享徒步经历的驴友

**核心价值**：
- 智能匹配：根据体能、经验、偏好推荐合适的队伍/路线
- 安全保障：签到打卡、紧急联系人、位置共享
- 社区氛围：路线图鉴、徒步日志、装备交流

---

## 2. 功能模块

### 2.1 MVP 功能（P0）

#### 2.1.1 用户系统
- 账号注册登录（邮箱+密码、GitHub OAuth、访客模式）
- 个人资料：昵称、头像、自我介绍
- **徒步档案**（替代"技能标签"）：
  - 经验等级：新手 / 有经验 / 老驴
  - 偏好类型：风景 / 挑战 / 社交 / 摄影
  - 出行频率：每月1次 / 每月2-3次 / 每周1次 / 每周多次
  - 常驻城市
- 在线状态心跳

#### 2.1.2 活动发布（替代"需求发布"）
- 活动标题
- 路线描述（起点、终点、途经点）
- 难度等级：休闲 / 进阶 / 挑战
- 活动类型：日归 / 多日 / 长线
- 出发日期和时间
- 集合地点
- 人数上限（2-50人）
- 费用方式：AA / 队长请 / 各自付
- 所需装备提示（文字描述）
- 活动状态：草稿 / 报名中 / 已满员 / 进行中 / 已结束
- 可见性：公开 / 仅匹配 / 定向邀请

#### 2.1.3 报名与审核（替代"申请"）
- 用户报名参加活动，附留言
- 发布者审核：接受 / 拒绝
- 接受后自动加入队伍群聊

#### 2.1.4 智能匹配（核心）
- **正向匹配**：活动 → 推荐合适的参与者
  - 体能匹配（40%）：经验等级与活动难度匹配
  - 偏好匹配（25%）：偏好类型与路线特征匹配
  - 时间匹配（20%）：出行频率与活动节奏匹配
  - 距离匹配（15%）：常驻城市与集合点距离
- **反向匹配**：用户 → 推荐合适的活动
  - 同上权重，额外考虑活动热度

#### 2.1.5 队伍群聊（替代"协作群组"）
- 文字消息、文件/图片分享
- 系统消息（加入、退出、活动状态变更）
- 3秒轮询实时更新

#### 2.1.7 活动收藏与「想去」（新增 P0）
- 浏览活动时可点击"想去"（♥），收藏到个人列表
- 活动热度显示想去人数
- 活动开始前推送提醒

#### 2.1.8 首页活动信息流（P0，替代 AI 路线助手）
- 推荐列表：按匹配度排序的近期活动
- 附近活动：按距离排序
- 热门活动：按热度排序
- 搜索和筛选：按难度、类型、日期、城市

#### 2.1.9 活动后社交（P0）
- 活动结束后群聊自动转为「回顾模式」
- 成员可上传活动照片
- 显示活动统计：总里程、时长、参与人数
- 关注同队成员一键关注

#### 2.1.10 安全功能（P0）
- **手机号验证**：注册时绑定手机号，降低放鸽子和安全风险
- **紧急联系人**：填写1-3位紧急联系人（姓名+电话），未填写不能报名活动
- **签到打卡**：出发签到 + 到达签到
- **一键SOS**：发送位置给紧急联系人（站内通知 + 邮件通知，P1 升级为短信）
- **活动风险提示**：发布活动时自动显示天气/难度等风险提示
- **首次活动限制**：新用户（无完成记录）只能参加 ≤ 5 人的活动

### 2.2 P1 功能

#### 2.2.1 路线图鉴（替代"需求广场"的浏览模式）
- 路线详情页：距离、海拔、时长、难度、风景评分
- 用户上传路线照片和攻略
- 路线评价和评分
- GPX 轨迹文件上传和预览

#### 2.2.2 徒步日志（替代"作品集"）
- 记录每次徒步：路线、日期、照片、感受
- 足迹地图：走过的路线可视化
- 年度统计：总里程、总时长、完成路线数

#### 2.2.3 信用体系
- 守时评分：准时到达集合点
- 安全记录：无事故记录
- 领队认证：完成一定数量活动后可申请
- 放鸽子扣分：报名后未出席且未提前退出

#### 2.2.4 AI 路线助手（替代"AI 对话"）
- "周末想走一条有水的轻松路线，2小时以内" → 自动推荐
- 根据天气、体能、时间生成路线建议
- 路线风险评估（海拔、距离、天气）

#### 2.2.5 天气预警
- 接入天气 API
- 活动前24小时自动推送天气情况
- 恶劣天气建议取消/改期

### 2.3 P2 功能

- 装备交换/借用
- 拼车功能
- 位置实时共享（需 WebSocket 或地图 SDK）
- 两步路/六只脚路线数据同步
- 商业领队入驻和付费活动

---

## 3. 页面结构

### 3.1 导航（侧边栏）

| 导航项 | 功能 |
|--------|------|
| 首页 | AI 路线助手对话 |
| 智能匹配 | 正向/反向匹配 |
| 活动广场 | 浏览/搜索/筛选活动 |
| 我的队伍 | 队伍列表 + 群聊 |
| 路线图鉴 | 路线库浏览（P1） |
| 个人档案 | 徒步资料、日志、信用分 |
| 设置 | 偏好、隐私、紧急联系人 |

### 3.2 登录页
- 账号登录（邮箱+密码）
- GitHub 快捷登录
- 访客模式预览

---

## 4. 数据模型设计

### 4.1 User（徒步者）— 基于 CollabMatch User 改造

| 字段 | 类型 | 说明 | 变更 |
|------|------|------|------|
| phone | String | 手机号 | 保留 |
| email | String | 邮箱 | 保留 |
| passwordHash | String | 密码哈希 | 保留 |
| name | String | 昵称 | 保留 |
| avatar | String | 头像文字 | 保留 |
| avatarColor | String | 头像颜色 | 保留 |
| avatarUrl | String | 头像图片 | 保留 |
| bio | String | 自我介绍 | 保留 |
| city | String | 常驻城市 | **新增**（替代 position） |
| experienceLevel | String(enum) | 经验等级：novice/experienced/veteran | **新增**（替代 domain） |
| preferences | [String] | 偏好：scenery/challenge/social/photography | **新增**（替代 skills） |
| hikeFrequency | String(enum) | 出行频率：monthly1/monthly2-3/weekly1/weekly+ | **新增**（替代 weeklyHours） |
| emergencyContacts | [{name, phone}] | 紧急联系人 | **新增** |
| creditScore | Number | 信用分（默认100） | **新增**（替代 collabScore） |
| hikeCount | Number | 完成徒步次数 | **新增**（替代 projects） |
| totalDistance | Number | 总徒步里程(km) | **新增** |
| lastSeenAt | Date | 最后在线 | 保留 |
| githubId | String | GitHub ID | 保留 |

**删除字段**：position, skills, domain, collabScore, projects, resources, portfolio, weeklyHours, collabIntent, interestedStages, apiToken, skillIds

### 4.2 HikeEvent（徒步活动）— 基于 Requirement 改造

| 字段 | 类型 | 说明 | 变更 |
|------|------|------|------|
| title | String | 活动标题 | 保留 |
| author | ObjectId→User | 发布者 | 保留 |
| status | String(enum) | 状态：draft/open/full/ongoing/ended | **扩展** |
| visibility | String(enum) | 可见性 | 保留 |
| difficulty | String(enum) | 难度：casual/advanced/challenge | **新增**（替代 domain） |
| eventType | String(enum) | 类型：dayhike/overnight/longtrail | **新增** |
| startDate | Date | 出发日期时间 | **新增** |
| meetupPoint | String | 集合地点 | **新增** |
| endPoint | String | 终点 | **新增** |
| distance | Number | 总距离(km) | **新增** |
| elevation | Number | 累计爬升(m) | **新增** |
| estimatedHours | Number | 预计时长(小时) | **新增** |
| maxMembers | Number | 人数上限 | **新增** |
| currentMembers | Number | 当前人数 | **新增** |
| feeType | String(enum) | 费用：aa/free/selfpay | **新增** |
| feeAmount | Number | 预估费用(元) | **新增** |
| gearRequired | String | 所需装备描述 | **新增**（替代 skills） |
| description | String | 详细描述 | 保留（合并 background+goal+desc） |
| coverImage | String | 封面图URL | **新增** |
| gpxFileId | ObjectId→FileAsset | GPX轨迹文件 | **新增** |
| tags | [String] | 标签 | **新增**（替代 keywords） |
| invitees | [ObjectId→User] | 定向邀请 | 保留 |
| matchProgress | Number | 匹配进度 | 保留 |

**删除字段**：domain, skills, background, goal, timeline, outcome, fulfillmentType, externalSource/PlanId/RoomId/SyncStatus/SyncError/SyncedAt, sceneTag, projectStage, weeklyHours, collabMode, lookingFor, remoteOk

### 4.3 JoinRequest（报名申请）— 基于 Application 改造

与 Application 基本一致，字段名从 `requirementId` 改为 `eventId`，`applicantId` 改为 `userId`。

### 4.4 Group（队伍）— 基于 Group 改造

| 字段 | 变更 |
|------|------|
| reqId → eventId | 关联活动 |
| 新增 meetupLocation | 集合地点 |
| 新增 status | 队伍状态：forming/ready/ongoing/completed |

### 4.5 新增模型

#### CheckIn（签到记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| eventId | ObjectId→HikeEvent | 关联活动 |
| userId | ObjectId→User | 签到用户 |
| type | String(enum) | 类型：start/finish/sos |
| location | {lat, lng} | GPS 坐标 |
| address | String | 地址文字 |
| time | Date | 签到时间 |

#### TrailLog（徒步日志，P1）
| 字段 | 类型 | 说明 |
|------|------|------|
| userId | ObjectId→User | 所属用户 |
| eventId | ObjectId→HikeEvent | 关联活动（可选） |
| title | String | 日志标题 |
| content | String | 日志内容 |
| photos | [String] | 照片URL列表 |
| distance | Number | 实际距离(km) |
| duration | Number | 实际时长(小时) |
| rating | Number | 评分(1-5) |
| createdAt | Date | 创建时间 |

---

## 5. 匹配算法设计

### 5.1 正向匹配（活动 → 推荐参与者）

```
matchScore =
  fitnessScore * 0.40   // 体能匹配：经验等级 vs 活动难度
+ preferenceScore * 0.25 // 偏好匹配：用户偏好 vs 活动标签
+ timeScore * 0.20       // 时间匹配：出行频率 vs 活动节奏
+ distanceScore * 0.15   // 距离匹配：常驻城市 vs 集合地点
```

**体能匹配规则**：
| 活动难度 | 新手 | 有经验 | 老驴 |
|---------|------|--------|------|
| 休闲 | 100 | 80 | 50 |
| 进阶 | 40 | 100 | 80 |
| 挑战 | 0 | 60 | 100 |

**偏好匹配**：用户偏好标签与活动标签的 Jaccard 相似度 × 100

**时间匹配**：出行频率与活动节奏的匹配度

**距离匹配**：基于城市间直线距离衰减

### 5.2 反向匹配（用户 → 推荐活动）

```
matchScore =
  fitnessScore * 0.35
+ preferenceScore * 0.25
+ timeScore * 0.15
+ distanceScore * 0.10
+ heatScore * 0.15       // 活动热度（报名人数/上限）
```

---

## 6. 安全设计

### 6.1 数据安全
- JWT 认证 + HTTPS
- 密码 bcrypt 哈希
- 输入校验和 XSS 防护
- CORS 白名单

### 6.2 徒步安全
- 紧急联系人必填才能报名活动
- SOS 信号包含 GPS 坐标
- 活动超时未签到自动预警（P1）
- 天气预警推送（P1）

### 6.3 信用安全
- 放鸽子扣 10 分/次
- 信用分低于 60 限制报名
- 领队认证需完成 10+ 次活动且信用分 ≥ 90

---

## 7. 技术架构

### 7.1 复用 CollabMatch 架构

| 组件 | 复用情况 |
|------|---------|
| Express + TypeScript 后端 | 100% 复用，替换路由和模型 |
| api-bridge.js 前端桥接 | 80% 复用，替换 API 方法名和参数 |
| MongoDB 数据库 | 100% 复用 |
| JWT 认证 | 100% 复用 |
| Vercel Serverless 部署 | 100% 复用 |
| GitHub OAuth | 100% 复用 |
| 群聊轮询 | 100% 复用 |
| AI 对话（SSE） | 80% 复用，替换 prompt |
| 匹配引擎 | 70% 复用，替换权重和维度 |

### 7.2 新增技术依赖

| 依赖 | 用途 | 阶段 |
|------|------|------|
| 高德地图 JS API | 地图展示、位置选择、距离计算 | P0 |
| 和风天气 API | 天气查询和预警 | P1 |
| gpx-parser-builder | GPX 轨迹解析和预览 | P1 |

### 7.3 部署方案

- 前端：Vercel 静态托管（collabmatch-sigma.vercel.app → 新域名）
- API：Vercel Serverless Functions
- 数据库：MongoDB Atlas（已配置）
- 文件存储：inline base64（MVP）/ 腾讯云 COS（P1）

---

## 8. 开发排期建议

### Phase 1：MVP（P0 功能）
1. 数据模型改造（User → Hiker, Requirement → HikeEvent, Application → JoinRequest）
2. 后端 API 路由改造
3. 前端 UI 改造（活动发布/浏览/报名/匹配/群聊）
4. 安全功能（紧急联系人、签到、SOS）
5. 匹配算法适配
6. **法律文档**：用户协议、免责声明、隐私政策
7. **手机号验证**（注册时绑定，降低信任门槛）
8. **活动收藏/想去** 功能
9. **首页活动信息流**（替代 AI 路线助手）
10. **活动结束后照片分享**（群聊内上传）
11. **SEO 优化**：活动详情页 URL 结构 + meta 描述

### Phase 2：社区（P1 功能）
1. 路线图鉴
2. 徒步日志和足迹地图
3. 信用体系
4. AI 路线助手
5. 天气预警
6. **SOS 短信通知**（接入腾讯云短信）
7. **双方互评**（活动结束后）
8. **安全指数**（路线风险评分展示）
9. **足迹挑战**（月度打卡）

### Phase 3：商业化（P2 功能）
1. 装备交换
2. 拼车
3. 位置实时共享（WebSocket）
4. 第三方路线数据同步
5. 商业领队和付费活动
6. **户外保险接入**（与保险公司合作，一日险几块钱）
7. **装备漂流**（同城装备借用，押金制）

---

## 9. 法律与合规（P0 必须）

### 9.1 用户协议要点
- 平台仅提供信息撮合服务，不参与实际活动组织
- 参与者自行承担徒步活动中的一切风险
- 活动发布者（领队）需承诺具备相应户外能力
- 禁止商业领队在无资质情况下组织收费活动

### 9.2 免责声明
- 每次活动发布时必须勾选："我已阅读并同意免责声明"
- 建议参与者自行购买户外运动保险
- 平台不对第三方服务（如天气数据、地图数据）的准确性承担责任

### 9.3 隐私政策
- 位置数据仅用于签到和 SOS 功能，活动结束后可选择删除
- 紧急联系人信息加密存储，仅 SOS 时使用
- 手机号仅用于验证和紧急通知，不公开显示

---

## 10. 商业模式

### 10.1 免费层
- 基础匹配、活动发布、参加、群聊全部免费
- 个人档案、徒步日志免费

### 10.2 增值服务
- **金牌领队认证**：付费认证，获得更多曝光
- **商业活动**：商业领队发布付费活动，平台抽佣 5-10%
- **保险合作**：推荐户外保险，获佣金
- **装备广告**：户外品牌合作

### 10.3 未来方向
- 向户外俱乐部提供 SaaS 工具（活动管理、会员管理）
- 徒步路线数据 API 服务
- 户外品牌精准广告
1. 装备交换
2. 拼车
3. 位置实时共享
4. 第三方路线数据同步
5. 商业领队和付费活动
