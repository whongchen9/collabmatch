# CollabMatch 前端修改完整清单（交 WorkBuddy）

**范围**：`index.html`、`api-bridge.js`  
**不改**：`server/` 后端（接口已就绪）  
**运行**：`cd server && npm run dev` → 浏览器打开 **http://localhost:3001/**（禁止 file:// 双击 html）

---

## 一、WorkBuddy 可跳过（本轮已落地）

以下已实现，**无需重复做**，除非自测仍失败：

- 登录：发验证码、开发/生产提示、loading、401 跳登录、侧栏「退出登录」
- 缺失函数：`togglePublishDropdown`、`doPublish`、`showMyApplications`、`editPortfolioItemById`
- 弹窗：`modal-portfolio` / `modal-applications` / `modal-apply`
- 作品集：增删改（`createPortfolioItem` / `updatePortfolioItem` / `deletePortfolioItem`）
- 申请：`applyReq` 弹窗附言、`pendingApplicationCount` 匹配页角标
- 大文件：`uploadFileForChat`、COS multipart
- `api-bridge.js`：`setUnauthorizedHandler`、401 处理

---

## 二、全部待修改项（一次性做完）

### A. 需求详情与角色按钮 — `openReqDetail()`

| 问题 | 改法 |
|------|------|
| 「🔍 智能匹配」对**所有用户**展示 | 仅 **发布者**（`req.author.id === currentUser.id`）显示；用于 `goToMatch(reqId)` |
| 访客在详情里**无法申请** | 非发布者 + `status==='open'` + 可申请可见性（至少 `public`）→ 显示「申请参与」调 `applyReq(reqId)` |
| `invite_only` / 非公开需求 | 访客不显示申请；可提示「该需求不对外开放申请」 |
| 发布者不应看到「申请参与」 | 发布者只保留：发布（草稿）/ 升级可见性 / 智能匹配 / 删除 / 关闭 |

建议抽 helper：`isReqAuthor(req)`、`canApplyToReq(req)`，全局统一作者判断（勿有的用 `currentUser._id` 有的不用）。

---

### B. 跳转路径错误

| 位置 | 现状 | 改法 |
|------|------|------|
| `renderMatchCardForReq()` | 卡片 `onclick="goToMatch(r.id)"` | 改为 `openReqDetail(r.id)`；「申请参与」保留 `applyReq` |
| `renderProfileRecs()` | `rec-item onclick="goToMatch(r.id)"` | 改为 `openReqDetail(r.id)` 或 `applyReq(r.id)` |
| `goToMatch()` | 被反向匹配误用 | **仅**发布者从详情/侧栏「我的需求」进入；反向匹配禁止调用 |

说明：`goToMatch` = 正向匹配（为**我的**需求找协作者 + 邀请），与「找需求来申请」是两条业务线。

---

### C. 需求广场 — `renderSquareCard()` / `sortSquare()`

| 问题 | 改法 |
|------|------|
| 自己的公开需求仍显示「申请参与」 | `r.author.id !== currentUser?.id` 才显示按钮 |
| 已申请过的需求仍显示「申请参与」 | 可选：进页时 `fetchMyApplications()` 缓存，对已申请 id 显示「已申请」并禁用 |
| 点击卡片进详情后访客无申请入口 | 与 **A** 联动，详情内补按钮 |

---

### D. 申请与审批 — `loadReqApplications()` / `reviewApp()`

| 问题 | 改法 |
|------|------|
| 列表含已通过/已拒绝，仍显示同意/拒绝 | 仅 `status==='pending'` 可操作；其余只读展示「已通过/已拒绝」 |
| 无 pending 时静默不展示 | 发布者打开详情时显示「暂无待处理申请」 |
| 审批后匹配页红点不更新 | `reviewApp` 成功后：`refreshRequirements()` + `renderMatchSection()` |
| 同意后无引导 | Toast 或按钮提示「可在智能匹配中邀请 TA 入群」；可选跳转 `goToMatch(reqId)` |

---

### E. 邀请建群 — `sendInvite()` / `confirmInvite()`

| 问题 | 改法 |
|------|------|
| 先 `closeModal` 再读 textarea | **先**读 `#invite-message-input`，再关弹窗 |
| 成功后用户找不到群 | `switchSection('groups', …)` + `openGroup(group.id)` |
| 仅 toast | 保留成功 toast |

---

### F. 智能匹配左栏 — `renderMatchSection()` / `selectMatchReq()`

| 问题 | 改法 |
|------|------|
| 列表含 **draft** 草稿 | 默认只列 `status==='open'`；草稿单独区域或标签，且不对草稿展示「邀请协作」 |
| 每次 render 都调 `selectMatchReq` | 仅 `currentMatchReqId` 变化或首次进入时请求，避免重复打 `/match/forward` |
| 空状态「去生成需求」 | 改为 `newConversation()` + `switchSection('home')` + 聚焦输入框（与 **K** 一致） |

---

### G. 发布 / 可见性 — `publishReq()` / `doPublish()` / `confirmPublishVisibility()`

| 问题 | 改法 |
|------|------|
| 聊天气泡 `doPublish` 已发布可改 visibility | 详情 `publishReq` 对已发布直接 toast「已发布」拒绝修改 | **统一**：已发布一律 `updateRequirement(id, { visibility })`；未发布走 `publishRequirement` |
| 聊天气泡与详情弹窗行为不一致 | 共用一套 `setRequirementVisibility(reqId, visibility)` 封装 |
| `upgradeVisibility()` 后详情未刷新 | 成功后若详情弹窗仍打开，刷新 `openReqDetail(reqId)` 或更新 DOM |

---

### H. 对话内需求卡片 — `renderInlineReqCard()`

| 问题 | 改法 |
|------|------|
| 「立即匹配」`goToMatch` 对草稿 | 草稿时改为「发布」或先提示发布再匹配 |
| 发布下拉 `togglePublishDropdown` | 点击页面其它区域应关闭下拉（document click 监听） |

---

### I. 消息转发 — `forwardMsg()` + `api-bridge.js`

| 问题 | 改法 |
|------|------|
| 未选目标对话 | 后端 `forwardMessage(convId, idx, targetConversationId)` 已支持第三参 |
| 现逻辑等同「复制到当前对话末尾」 | **方案 1（推荐）**：弹窗列出 `conversations` 供选择，传入 `targetConversationId` |
| | **方案 2**：去掉「转发」文案，改为「复制到当前对话」，toast 与图标一致 |

---

### J. 侧栏与导航

| 位置 | 问题 | 改法 |
|------|------|------|
| 「+ 发布需求」按钮 | 只 `switchSection('home')` | `newConversation()` + 切 home + `#chat-input.focus()` |
| `createGroupFromSidebar()` | 原生 `prompt('群组名称')` | 新增简单 Modal（名称输入 + 确认），风格与其它弹窗一致 |
| `renderConvList()` 草稿需求 | 点草稿无引导 | 打开详情或 toast「请先发布后再匹配/招募」 |

---

### K. 个人名片 / 作品集 — `showPortfolioForm()` 等

| 问题 | 改法 |
|------|------|
| 编辑作品 `value="${escapeHtml(item.title)}"` 拼 HTML | 表单骨架用空 input，打开后用 JS 赋值（`pf-title.value = item.title`），避免引号破坏 DOM |
| 「我的申请」`showMyApplications()` | 已实现；自测列表是否正常即可 |

---

### L. 登录与全局

| 问题 | 改法 |
|------|------|
| 手机号框无 Enter 登录 | `#login-phone` keydown Enter → `doLogin()`（验证码框已有） |
| Token 过期 | 已实现 `setUnauthorizedHandler`；自测 API 401 是否弹登录 |

---

### M. 群组与文件 — `downloadGroupFile()`

| 问题 | 改法 |
|------|------|
| COS 文件 `fetch` + 302 重定向可能失败 | 若 `fileUrl` 以 `http` 开头或是 COS 公共链，优先 `window.open(url)`；内联文件仍走 blob 下载 |

---

### N. @ 提及 — `atMention()`

| 问题 | 改法 |
|------|------|
| 仅插入 `@协作者 ` 文本 | 短期：按钮 title 改为「插入 @」避免误导；长期：群成员列表下拉（可标 TODO） |

---

### O. 删除与其它刷新 — `deleteMyRequirement()`

| 问题 | 改法 |
|------|------|
| 删除后未刷新匹配页 | 成功后 `renderMatchSection()`、`renderConvList()`、`renderSquare()`（部分已有，补全 match） |

---

### P. `api-bridge.js`

| 项 | 改法 |
|----|------|
| `matchForward()` 使用 `auth: false` | 与后端对齐：若 forward 需登录则改 `auth: true`（401 已有统一处理） |
| `forwardMessage` | 确保第三参 `targetConversationId` 在 **I** 中传入 |
| `applyRequirement` | 可始终传 `{ message }`（空字符串亦可），与后端一致 |

---

### Q. 移动端（CSS，仍在 index.html 内）

| 问题 | 改法 |
|------|------|
| `@media` 下 `chat-side-panel { display: none }` | 手机无法切换「对话 / 工作流」侧栏 | 增加底部或顶栏入口切换 `switchSideTab`，或折叠菜单 |

---

## 三、自测清单（全部通过后交付）

- [ ] 访客：广场 → 详情 → 「申请参与」，**无**「智能匹配」
- [ ] 发布者：自己的详情 → 「智能匹配」，**无**「申请参与」
- [ ] 反向匹配 / 名片推荐：点卡片不进「邀请协作者」页
- [ ] 广场：自己的需求无「申请参与」
- [ ] 审批 pending 后：匹配页红点更新；非 pending 不可重复点同意/拒绝
- [ ] 邀请协作：成功后自动打开对应群组页
- [ ] 已发布需求：聊天气泡与详情改 visibility 行为一致
- [ ] 转发：选对话转发 **或** 文案与行为一致
- [ ] 「+ 发布需求」：新对话 + 聚焦输入
- [ ] 作品集：标题含英文引号 `"` 时编辑表单正常
- [ ] 登录：手机号 Enter 可登录；401 弹回登录页
- [ ] 手机宽度：仍能切换对话/工作流（若做 **Q**）

---

## 四、不在本次前端范围

- 反向匹配是否展示 `match_only` 需求：产品/后端策略，前端按接口展示即可
- 后端 `GET /match/forward` 是否强制鉴权：后端改完后前端 **P** 改一行
- 拆分 `index.html` 为多文件 / 构建工具：架构优化，非本清单

---

## 五、主要涉及函数索引

`openReqDetail` · `goToMatch` · `applyReq` · `confirmApplyReq` · `renderSquareCard` · `renderMatchCardForReq` · `renderProfileRecs` · `renderMatchSection` · `selectMatchReq` · `loadReqApplications` · `reviewApp` · `confirmInvite` · `publishReq` · `doPublish` · `confirmPublishVisibility` · `upgradeVisibility` · `renderInlineReqCard` · `togglePublishDropdown` · `forwardMsg` · `createGroupFromSidebar` · `showPortfolioForm` · `deleteMyRequirement` · `downloadGroupFile` · `atMention` · `newConversation` · `switchSection` · `matchForward`（api-bridge）
