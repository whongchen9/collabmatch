## CollabMatch 项目全面审查报告

审查时间：2026-06-04 | 更新时间：2026-06-05 | 审查范围：前端交互体验、前端代码质量、后端代码质量

---

### 修复进度总览

| 分类 | 总数 | ✅ 已修复 | ⚠️ 部分修复 | ❌ 未修复 |
|------|------|-----------|-------------|----------|
| BLOCKER | 1 | 1 | 0 | 0 |
| CRITICAL (SEC-01~08) | 8 | 7 | 1 | 0 |
| HIGH | 18 | 12 | 1 | 5 |
| MEDIUM | 19 | 0 | 0 | 19 |
| LOW | 11 | 0 | 0 | 11 |
| **合计** | **57** | **20** | **2** | **35** |

已修复的 commit：

- `4c60229` — BLK-01 COLLABMATCH_API 条件化
- `10b4457` — SEC-01 renderBadges XSS + SEC-02 escapeHtml + SEC-07 会话列表 XSS
- `64b2437` — SEC-03 正则注入 + SEC-04 helmet + SEC-05 matchProgress + SEC-06 webhook + SEC-08 手机号
- `f6d18ab` — SEC-09~12 + SEC-15 + FUNC-04
- `07f1206` — SEC-13 + FUNC-01~03 + ARCH-01 + UX-04

---

### 零、BLOCKER — 阻塞所有功能的配置问题

**BLK-01 COLLABMATCH_API 硬编码导致本地开发不可用** ✅ 已修复 (`4c60229`)
`index.html` 第 1979 行写死了 `window.COLLABMATCH_API`。已改为条件设置，仅在 CloudBase 环境下生效。本地开发恢复正常。Playwright 验证通过：登录成功、所有页面数据加载正常。

> UX-01（广场空白）、UX-02（个人页黑屏）、UX-15（匹配无数据）均由此引起，已同步恢复。

---

### 一、CRITICAL — 必须立即修复

**SEC-01 XSS：renderBadges / renderSkillMarket / renderSkillCards 未转义** ⚠️ 部分修复 (`10b4457`)
`renderBadges` 已包裹 `escapeHtml()`。但 `renderSkillCards` 中 `v.name`、`v.author`、`v.desktop`、`v.tags` 仍直接拼入 innerHTML，需要补上 `escapeHtml()` 包裹。

**SEC-02 escapeHtml 不转义单引号** ✅ 已修复 (`10b4457`)
已添加 `.replace(/'/g,'&#39;')`，单引号注入路径已消除。

**SEC-03 MCP 搜索接口正则注入 / ReDoS** ✅ 已修复 (`64b2437`)
`mcp/index.ts` 已对 keyword 做正则转义：`String(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`。

**SEC-04 安全 HTTP 头完全缺失** ✅ 已修复 (`64b2437`, `07f1206`)
已添加 `helmet()` 中间件。`07f1206` 进一步配置 CSP 放行 `unsafe-inline`（因为前端大量使用内联 script 和 onclick），同时保持其他安全头（X-Frame-Options、X-Content-Type-Options 等）生效。

**SEC-05 matchProgress 可被客户端篡改** ✅ 已修复 (`64b2437`)
已从 `CREATABLE_FIELDS` 中移除 matchProgress。

**SEC-06 Webhook 签名校验可被绕过** ✅ 已修复 (`64b2437`)
`integrationsXcd.ts` 已修复 webhook 签名校验逻辑。

**SEC-07 XSS：会话列表 innerHTML 未转义** ✅ 已修复 (`10b4457`)
`renderConvList` 中 `lastMsg.content` 已包裹 `escapeHtml()`。群组消息列表的 `lastMsg` 也已转义。

**SEC-08 手机号在所有公开用户接口中暴露** ✅ 已修复 (`64b2437`)
`toUserJson()` 不再输出 `phone` 字段。仅在 `includePrivatePortfolio: true`（登录时、/auth/me）时通过独立逻辑返回手机号。公开接口（广场、需求详情等）不会泄露。

---

### 二、HIGH — 本迭代应修复

**SEC-09 登录接口缺乏 IP 级全局限流** ✅ 已修复 (`f6d18ab`)
已添加 IP 级限流（5 秒窗口），SMS 发送和登录共享 IP 限额，有效防止批量验证码爆破。

**SEC-10 开发验证码通过 API 响应泄露** ✅ 已修复 (`f6d18ab`)
`GET /api/auth/config` 不再返回 `devAuthCode`，`POST /api/auth/sms/send` 不再返回 hint。

**SEC-11 任意群成员可移除其他成员** ✅ 已修复 (`f6d18ab`)
已限制仅群创建者（第一个成员）可移除其他成员。

**SEC-12 任意群成员可发送 system 类型消息** ✅ 已修复 (`f6d18ab`)
服务端强制覆盖消息 type，仅允许 `'text' | 'file'`，禁止客户端伪造 `system`。

**SEC-13 express.static 暴露项目根目录** ✅ 已修复 (`07f1206`)
已实现静态文件白名单机制（仅允许 `index.html`、`api-bridge.js`、`favicon.ico` 和 `dist/` 目录），其他路径返回 403。

**SEC-14 PUT /users/me 字段赋值过于宽松** ⚠️ 部分修复 (`f6d18ab`)
`domain` 字段已添加 `VALID_DOMAINS` 枚举校验。但 `weeklyHours`、`collabIntent`、`avatarColor` 等字段仍缺乏类型/枚举校验。

**SEC-15 rateLimitMap 内存泄漏** ✅ 已修复 (`f6d18ab`)
已添加 `setInterval` 定期清理过期条目（每 2 分钟），并调用 `.unref()` 避免阻止进程退出。

**FUNC-01 技能/资源编辑不持久化** ✅ 已修复 (`07f1206`)
`saveResource()` 已改为 async，修改后立即调用 API 持久化并显示 toast 反馈。

**FUNC-02 空值守卫缺失 — author / msg.user** ✅ 已修复 (`07f1206`)
已在关键属性访问处添加空值检查。

**FUNC-03 需求创建时缺乏关键字段校验** ✅ 已修复 (`07f1206`)
`requirements.ts` 已添加关键字段校验逻辑。

**FUNC-04 匹配查询加载全量用户/需求（无 limit）** ✅ 已修复 (`f6d18ab`)
`match.ts` 已添加 `.limit(MATCH_LIMIT)` 限制查询结果数量。

**ARCH-01 N+1 查询 — 对话列表** ✅ 已修复 (`07f1206`)
`conversations.ts` 已改为批量预加载所有 reqCard ID（`$in` 查询），避免 N+1 问题。

**UX-01 广场页面数据未加载** ✅ 已修复（随 BLK-01 修复）

**UX-02 个人名片页面完全黑屏** ✅ 已修复（随 BLK-01 修复）

**UX-03 桌面/移动端导航名称严重不一致** ❌ 未修复
桌面端"需求广场" → 移动端"售卖广场"，桌面端"技能市场" → 移动端"技术市场"，命名仍未统一。

**UX-04 品牌名称 + 用户名称混用** ✅ 已修复 (`07f1206`)
侧边栏导航标签已从 "CollabAI" 改为 "首页"，统一了品牌命名。

**UX-05 发布向导无关闭按钮和校验** ❌ 未修复

**UX-06 全局缺少 Loading 状态** ❌ 未修复

---

### 三、MEDIUM — 下迭代安排

**FUNC-05 群组无删除机制** ❌ 未修复
只有退出和移除成员，没有整体删除。所有成员退出后空群组仍存在。

**FUNC-06 用户无法删除账户** ❌ 未修复
不符合 GDPR 等隐私法规要求。

**FUNC-07 对话/需求删除不清理关联引用** ❌ 未修复
删除需求后对话中的 reqCard 变成悬空指针。

**ARCH-02 MongoDB 文档大小风险** ❌ 未修复
对话和群组消息以内嵌数组存储，含 protoCard 的大消息可能接近 16MB 限制。

**ARCH-03 列表接口缺少分页** ❌ 未修复
用户列表、对话列表、群组列表、我的需求均无分页。

**ARCH-04 缺少关键数据库索引** ❌ 未修复
Requirement 的 status+visibility、Group 的 members、Conversation 的 userId+updatedAt 等高频查询无复合索引。

**ARCH-05 N+1 查询 — 文件权限校验** ❌ 未修复
`loadVisionImages` 和 `resolveChatFileAttachments` 对每个文件 ID 单独查询权限。

**UX-07 空状态引导不足** ❌ 未修复
群组、作品集、申请等空页面仅显示"暂无内容"，没有操作引导（CTA）。

**UX-08 聊天缺少对话历史与加载状态** ❌ 未修复
对话列表不显示上次离开时的内容，切换对话时无加载指示。

**UX-09 筛选器反馈不明显** ❌ 未修复
广场筛选切换后无视觉反馈区分当前选中状态。

**UX-10 侧栏不可折叠** ❌ 未修复
桌面端侧栏始终展开，占用大量空间。

**UX-11 Profile 看起来像编辑表单** ❌ 未修复
查看模式下也全部显示输入框和下拉框，应区分"查看"与"编辑"。（HANDOVER.md 中提到 `toggleProfileEdit` 已实现查看/编辑切换，但审查时未确认效果。）

**UX-12 聊天消息重复显示** ❌ 未修复
发送消息后界面显示两条相同消息（本地追加 + 服务端返回）。

**UX-13 AI 消息旁错显用户头像** ❌ 未修复
聊天界面 AI/系统回复旁显示了当前用户头像。

**UX-14 工作流功能入口隐蔽** ❌ 未修复
工作流已不在主导航中（确认为有意下架），仅作为聊天页右侧面板"流程"子 tab 存在。

**UX-15 匹配页与聊天页数据不同步** ❌ 未修复
BLK-01 修复后需验证数据是否正确同步。

**UX-16 技能市场默认搜索"AI"导致空白** ❌ 未修复
技能市场页面搜索框预填了"AI"关键词，但无匹配结果。

---

### 四、LOW — 有空再改

**CODE-01** mongoose 冗余导入（Model 文件引入了 mongoose 但未使用）

**CODE-02** lastSeenAt 在公开信息中暴露精确时间戳（隐私隐患）

**CODE-03** MCP 服务独立读取 JWT_SECRET（绕过统一配置）

**CODE-04** MCP HTTP 模式 CORS 全开

**CODE-05** API 响应格式不统一（部分返回数组，部分返回 `{ items, total, page }`）

**CODE-06** 请求体大小限制过大（12mb JSON，应降至 1-2mb）

**UX-17** 图标风格不统一（混用 emoji 和 SVG）

**UX-18** 按钮/卡片样式在不同页面不一致

**UX-19** 缺少键盘导航支持

**UX-20** 无障碍缺失（aria-label、label 关联、焦点管理）

**UX-21** 错别字和标点错误

---

### 五、已完成的改动（来自 HANDOVER.md + 5 个修复 commit）

以下功能在最近的 commit 中已实现：

来自 HANDOVER.md（已推送的基础改动）：
- **多领域扩展**：从 5 个技术领域扩展到 7 个（新增餐饮美食、本地服务）
- **需求广场重构**：新增搜索、全宽布局、领域/场景/时间筛选
- **CloudBase 云函数**：完整的 API 路由实现
- **validate 中间件**：新增 `middleware/validate.ts` 请求校验
- **个人页编辑模式**：`toggleProfileEdit` 实现查看/编辑切换
- **错误处理改进**：`middleware/error.ts` 已更新

来自 5 个修复 commit：
- `4c60229` — BLK-01 COLLABMATCH_API 条件化（恢复本地开发能力）
- `10b4457` — SEC-01 renderBadges XSS + SEC-02 escapeHtml + SEC-07 会话列表 XSS
- `64b2437` — SEC-03 正则注入 + SEC-04 helmet + SEC-05 matchProgress + SEC-06 webhook + SEC-08 手机号
- `f6d18ab` — SEC-09~12 + SEC-15 + FUNC-04（安全加固 + 性能）
- `07f1206` — SEC-13 + FUNC-01~03 + ARCH-01 + UX-04（静态文件保护 + 功能修复 + N+1）

---

### 六、待修复优先级建议

| 优先级 | 编号 | 数量 | 说明 |
|--------|------|------|------|
| P0 收尾 | SEC-01（renderSkillCards 部分） | 1 | XSS 残留，renderSkillCards 中 name/author/tags 未转义 |
| P1 本周 | SEC-14（字段校验部分）、UX-03 | 2 | 安全加固收尾 + 移动端命名统一 |
| P1 本周 | UX-05、UX-06 | 2 | 发布向导关闭按钮 + 全局 Loading 状态 |
| P2 下周 | FUNC-05~07, ARCH-02~05, UX-07~16 | 19 | 扩展性和体验完善 |
| P3 有空 | CODE-01~06, UX-17~21 | 11 | 代码规范和细节打磨 |

### 七、已知遗留问题（审查验证中发现）

- `/api/users/me/presence` 返回 500（Internal Server Error），不影响主功能，建议排查。
- Hash 路由切换（`#/square`、`#/chat`、`#/profile`）后页面内容未更新，始终显示首页视图。可能需要在 `hashchange` 事件中触发视图切换。
