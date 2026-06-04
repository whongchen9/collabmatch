## CollabMatch 项目全面审查报告

审查时间：2026-06-04 | 审查范围：前端交互体验、前端代码质量、后端代码质量

---

### 零、BLOCKER — 阻塞所有功能的配置问题

**BLK-01 COLLABMATCH_API 硬编码导致本地开发不可用**
`index.html` 第 1979 行写死了 `window.COLLABMATCH_API = 'https://cloudbase-...app.tcloudbase.com/collabmatch/api'`。这是为 CloudBase 部署修复 API 路由问题而添加的（详见 HANDOVER.md 第 3 节），但导致本地开发时所有 API 请求被发到远程服务器。本地登录验证码是 `123456`，远程是 `xsx7ii`，因此本地登录必然失败，所有页面数据加载全部失败（个人页黑屏、广场空白、匹配无数据）。

**修复方法**：改为条件设置，仅在 CloudBase 环境下生效：
```html
<script>
  // 仅 CloudBase 静态托管需要覆盖 API 地址，本地开发使用相对路径
  if (location.hostname.includes('tcloudbaseapp.com')) {
    window.COLLABMATCH_API = 'https://cloudbase-d6g8yog0ub3e56efe-1427257718.ap-shanghai.app.tcloudbase.com/collabmatch/api';
  }
</script>
```

> 注意：本次审查中 UX-01（广场空白）、UX-02（个人页黑屏）、UX-15（匹配无数据）等问题均由此配置引起。修复 BLK-01 后这些问题将自动消失。

---

### 一、CRITICAL — 必须立即修复

**SEC-01 XSS：renderBadges / renderSkillMarket / renderSkillCards 未转义**
技能名称、作者、描述、标签等用户可控字符串直接拼入 innerHTML，攻击者可注入 `<script>` 或 `<img onerror>`。修复方法：所有插值处统一包裹 `escapeHtml()`。

**SEC-02 escapeHtml 不转义单引号**
当前只转义了 `& < > "`，遗漏了 `'`。这是多处 onclick 注入的根源（如 `renderGroupMessage` 文件下载、`renderQuickActions` 快捷操作 chips）。修复后多处 XSS 一并消除。

**SEC-03 MCP 搜索接口正则注入 / ReDoS**
`mcp/index.ts` 将用户传入的 `keyword` 直接拼接为 MongoDB `$regex` 查询。攻击者可传入 `(.*)*$` 等恶意正则使数据库 CPU 打满。应对 keyword 做正则转义或使用 `$text` 全文索引。

**SEC-04 安全 HTTP 头完全缺失**
`app.ts` 未使用 `helmet` 或任何安全头中间件，缺少 CSP、X-Frame-Options、X-Content-Type-Options、HSTS 等。容易受到 clickjacking、MIME 嗅探等攻击。

**SEC-05 matchProgress 可被客户端篡改**
`CREATABLE_FIELDS`（requirements.ts）包含 `'matchProgress'`，客户端创建/更新需求时可设置任意值。该字段应仅由服务端逻辑控制（发布时设 45，接受申请时设 80）。
> 注：上一个会话中已从 PUT 字段列表移除 matchProgress，但 POST 的 CREATABLE_FIELDS 中仍包含。

**SEC-06 Webhook 签名校验可被绕过**
`integrationsXcd.ts` 在 `XCD_WEBHOOK_SECRET` 未配置且非 production 环境时，任何人可无签名调用 webhook 接口修改需求的外部同步状态。

**SEC-07 XSS：会话列表 innerHTML 未转义**
`renderConvList` 中 `lastMsg`（最后一条消息内容）直接拼入 innerHTML，攻击者可构造恶意消息在其他用户浏览器执行 JS。

**SEC-08 手机号在所有公开用户接口中暴露**
`toUserJson` 始终包含 `phone` 字段，广场、需求详情等任何展示用户的页面都会泄露手机号。应区分 public/private 序列化。
> 注：上一个会话中已着手修复（添加了 `includePhone` 参数），但最近的 commit 可能覆盖或回退了这些改动，需确认当前代码状态。

---

### 二、HIGH — 本迭代应修复

**SEC-09 登录接口缺乏 IP 级全局限流**
现有限流是 per-phone 的，攻击者可在 1 秒内尝试 1000 个不同手机号的验证码（尤其开发模式下验证码固定为 123456）。

**SEC-10 开发验证码通过 API 响应泄露**
`GET /api/auth/config` 返回 `devAuthCode`，`POST /api/auth/sms/send` 返回 hint。生产环境若误配为 dev 模式，验证码会暴露。

**SEC-11 任意群成员可移除其他成员**
`POST /api/groups/:id/remove/:userId` 仅验证操作者是否为群组成员，不验证是否为管理员。任意普通成员可踢人。

**SEC-12 任意群成员可发送 system 类型消息**
客户端可发送 `type: 'system'` 的伪造消息，在前端显示为系统通知，造成社工攻击。服务端应强制覆盖消息 type。

**SEC-13 express.static 暴露项目根目录**
静态文件目录为整个项目根目录，可能暴露 `server/` 源码、`package.json`、`.env` 等。

**SEC-14 PUT /users/me 字段赋值过于宽松**
domain、weeklyHours、collabIntent 等字段缺乏枚举校验，avatarColor 可注入任意字符串。

**SEC-15 rateLimitMap 内存泄漏**
认证限流的内存 Map 只有 set 没有 delete/过期清理，长时间运行后内存持续增长。

**FUNC-01 技能/资源编辑不持久化**
Profile 页面的技能标签、资源列表修改只存储在内存中，不点"保存"则丢失。每个修改操作应立即调用 API 持久化。

**FUNC-02 空值守卫缺失 — author / msg.user**
`r.author.name`、`r.author.avatarColor`、`msg.user.avatar` 等属性访问未检查 author/user 是否为 null，API 返回缺字段数据时 UI 崩溃。

**FUNC-03 需求创建时缺乏关键字段校验**
status、visibility、domain、skills、lookingFor 等字段无类型和枚举校验。

**FUNC-04 匹配查询加载全量用户/需求（无 limit）**
`GET /api/match/forward` 和 `GET /api/match/reverse` 无 `.limit()`，用户量增长后导致内存和性能问题。

**ARCH-01 N+1 查询 — 对话列表**
`GET /api/conversations` 对每个对话单独查询关联的需求和作者，50 个对话产生 100+ 次数据库查询。

**UX-01 广场页面数据未加载** [由 BLK-01 引起]
COLLABMATCH_API 指向远程服务器导致本地广场 API 返回空数据。修复 BLK-01 后自动恢复。

**UX-02 个人名片页面完全黑屏** [由 BLK-01 引起]
currentUser 为 null（登录请求发到了远程服务器并失败），renderProfile() 因 `if (!currentUser) return` 直接退出，profile-content 保持空白。修复 BLK-01 后自动恢复。

**UX-03 桌面/移动端导航名称严重不一致**
同一功能在不同端显示完全不同名称：桌面端"需求广场" → 移动端"售卖广场"，桌面端"技能市场" → 移动端"技术市场"。截图对比可确认。

**UX-04 品牌名称 + 用户名称混用**
页面中同时出现 "CollabMatch"、"CollabAI"、"协作匹配" 等多个名称。同一用户在桌面端显示"陈晓磊"、移动端显示"陈晓薇"、其他页面显示"用户"。

**UX-05 发布向导无关闭按钮和校验**
发布需求向导缺少关闭/取消按钮，且步骤间无字段校验可空步提交。

**UX-06 全局缺少 Loading 状态**
广场筛选、页面切换、数据加载时无 loading 指示，用户以为操作没生效。

---

### 三、MEDIUM — 下迭代安排

**FUNC-05 群组无删除机制**
只有退出和移除成员，没有整体删除。所有成员退出后空群组仍存在。

**FUNC-06 用户无法删除账户**
不符合 GDPR 等隐私法规要求。

**FUNC-07 对话/需求删除不清理关联引用**
删除需求后对话中的 reqCard 变成悬空指针。

**ARCH-02 MongoDB 文档大小风险**
对话和群组消息以内嵌数组存储，含 protoCard 的大消息可能接近 16MB 限制。

**ARCH-03 列表接口缺少分页**
用户列表、对话列表、群组列表、我的需求均无分页。

**ARCH-04 缺少关键数据库索引**
Requirement 的 status+visibility、Group 的 members、Conversation 的 userId+updatedAt 等高频查询无复合索引。

**ARCH-05 N+1 查询 — 文件权限校验**
`loadVisionImages` 和 `resolveChatFileAttachments` 对每个文件 ID 单独查询权限。

**UX-07 空状态引导不足**
群组、作品集、申请等空页面仅显示"暂无内容"，没有操作引导（CTA）。

**UX-08 聊天缺少对话历史与加载状态**
对话列表不显示上次离开时的内容，切换对话时无加载指示。

**UX-09 筛选器反馈不明显**
广场筛选切换后无视觉反馈区分当前选中状态。

**UX-10 侧栏不可折叠**
桌面端侧栏始终展开，占用大量空间。

**UX-11 Profile 看起来像编辑表单**
查看模式下也全部显示输入框和下拉框，应区分"查看"与"编辑"。

**UX-12 聊天消息重复显示**
发送消息后界面显示两条相同消息（本地追加 + 服务端返回）。

**UX-13 AI 消息旁错显用户头像**
聊天界面 AI/系统回复旁显示了当前用户头像。

**UX-14 工作流功能入口隐蔽**
工作流已不在主导航中（确认为有意下架），仅作为聊天页右侧面板"流程"子 tab 存在。用户需要切换到聊天页、点击"流程" tab 才能访问。对于已使用的用户来说不够直观，建议增加明确的引导或在发布向导中提及。

**UX-15 匹配页与聊天页数据不同步** [部分由 BLK-01 引起]
匹配页显示"暂无需求"而聊天页已生成需求。修复 BLK-01 后需验证数据是否正确同步。

**UX-16 技能市场默认搜索"AI"导致空白**
技能市场页面搜索框预填了"AI"关键词，但无匹配结果，显示"未找到匹配技能"。清空搜索后应该能看到技能列表。

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

### 六、已完成的改动（来自 HANDOVER.md，3 个未推送 commit）

以下功能在最近的 commit 中已实现，审查中对应的问题可降级或标记为已处理：

- **多领域扩展**：从 5 个技术领域扩展到 7 个（新增餐饮美食、本地服务），每个领域有独立的模板和配置
- **需求广场重构**：新增搜索、全宽布局、领域/场景/时间筛选
- **CloudBase 云函数**：完整的 API 路由实现（认证、需求 CRUD、匹配、群组等）
- **validate 中间件**：新增 `middleware/validate.ts` 请求校验（部分缓解 SEC-14、FUNC-03）
- **个人页编辑模式**：`toggleProfileEdit` 实现查看/编辑切换（部分缓解 UX-11）
- **错误处理改进**：`middleware/error.ts` 已更新
- **3 个未推送 commit**：`cac950d`、`70af613`、`f378258`，共 +1900/-319 行

> **注意**：由于 BLK-01 导致本地所有页面不可用，上述 UI 层面的改动（广场重构、个人页编辑模式等）无法在本地视觉验证。修复 BLK-01 后需要重新截图确认效果。

---

### 七、修复优先级建议

| 优先级 | 编号 | 数量 | 说明 |
|--------|------|------|------|
| P0 立即 | BLK-01 | 1 | 配置错误导致本地开发完全不可用，所有页面数据加载失败 |
| P0 立即 | SEC-01 ~ SEC-08 | 8 | 安全漏洞，可被利用造成数据泄露或 XSS 攻击 |
| P1 本周 | SEC-09 ~ SEC-15, FUNC-01 ~ FUNC-04, ARCH-01, UX-03 ~ UX-06 | 18 | 安全加固 + 功能缺陷 + 核心体验 |
| P2 下周 | FUNC-05 ~ FUNC-07, ARCH-02 ~ ARCH-05, UX-07 ~ UX-16 | 19 | 扩展性和体验完善 |
| P3 有空 | CODE-01 ~ CODE-06, UX-17 ~ UX-21 | 11 | 代码规范和细节打磨 |
