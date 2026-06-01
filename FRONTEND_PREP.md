# CollabMatch 前端对接准备清单

> 后端已先行补齐的接口见文末「后端已完成」；**本文档列的是需要前端改 `api-bridge.js` + `index.html` 后才能形成完整闭环的功能**。

约定：`API_BASE` 默认 `http://localhost:3001/api`，请求头 `Authorization: Bearer <token>`。

---

## 一、必须接（P0）— 阻塞业务闭环

### 1. 需求申请 — 发布者处理

| 项 | 说明 |
|----|------|
| **场景** | 用户在广场「申请参与」后，发布者应看到列表并同意/拒绝 |
| **接口** | `GET /api/requirements/:reqId/applications` → `{ applications: Application[] }` |
| **审批** | `PUT /api/requirements/:reqId/applications/:appId` body: `{ "status": "accepted" \| "rejected" }` |
| **Application 字段** | `id`, `status`, `message`, `applicant`（用户对象）, `requirementId`, `createdAt` |

**前端待做：**

- [ ] `api-bridge.js`：`fetchReqApplications(reqId)`、`reviewApplication(reqId, appId, status)`
- [ ] 在「我的需求」详情或匹配页增加「待处理申请 (N)」面板
- [ ] 同意后可提示「已授权查看 / 可邀请入群」（后端接受后会写入 `invitees`）

**申请时附言（可选）：**

- [ ] `applyRequirement(id, { message })` → `PUT /api/requirements/:id/apply` body: `{ message }`（后端已支持）

---

### 2. 邀请协作 — 附言传给后端

| 项 | 说明 |
|----|------|
| **场景** | 匹配页邀请弹窗里的 textarea |
| **接口** | `POST /api/groups` body 增加 **`inviteMessage`**（可选字符串） |

**前端待做：**

- [ ] `confirmInvite` 读取 textarea 内容，调用 `createGroup(reqId, uid, inviteMessage)`
- [ ] 后端会把附言作为群首条消息，并将被邀请人加入 `requirement.invitees`、申请状态标为 `accepted`

---

### 3. 作品集 Portfolio

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users/me/portfolio` | 我的全部作品（含 `match_only`） |
| POST | `/api/users/me/portfolio` | 新增作品 |
| PUT | `/api/users/me/portfolio/:itemId` | 编辑 |
| DELETE | `/api/users/me/portfolio/:itemId` | 删除 |

**POST body 示例：**

```json
{
  "title": "智能数据分析平台",
  "role": "全栈开发",
  "desc": "描述…",
  "collaborators": ["张三"],
  "visibility": "public",
  "color": "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  "imageUrl": ""
}
```

**前端待做：**

- [ ] `api-bridge` 封装上述 4 个方法
- [ ] `loadAppData` / `fetchMe` 后：`currentUser.portfolio` 来自 `GET /auth/me`（已含私有作品）或单独拉 portfolio
- [ ] 替换 `renderPortfolioGrid` 里「添加作品 / 作品详情」的 toast，改为表单 Modal + CRUD
- [ ] 保存个人资料时不必再把 portfolio 塞进 `saveUserProfile`（无此字段）

**他人主页：**

- [ ] `GET /api/users/:id` 返回 `user.portfolio`（仅 `visibility: public`）与 `portfolioCount`

---

### 4. AI 完善名片

| 项 | 说明 |
|----|------|
| **接口** | `POST /api/users/me/ai-enhance-profile` → `{ user }`（已更新 `bio`、`skills`） |
| **前端待做** | 删除 `aiEnhanceProfile` 里 `setTimeout` mock，改为调用上述接口后 `renderProfile()` |

---

### 5. 群文件消息（真实上传）

| 项 | 说明 |
|----|------|
| **现状** | `sendFileMessage()` 仍为随机假文件 |
| **接口** | `POST /api/groups/:id/messages` body: `{ type: "file", fileName, fileSize, content }`（`content` 可放说明或下载 URL） |

**前端待做：**

- [ ] 文件选择器 → 上传策略二选一：**(A)** 先接对象存储拿 URL 再 POST；**(B)** MVP 仅传元数据 + 本地 base64（需与后端约定大小限制）
- [ ] 群聊「📎 文件」按钮与 `sendFileMessage` 对接 API
- [ ] 文件气泡点击：有 `content` URL 则下载，勿仅用 toast

> **说明：** 后端暂无独立 `/upload` 接口；若需 COS/OSS，需另开任务，前端先定上传方案。

---

## 二、建议接（P1）— 体验完整

### 6. 对话管理

| 接口 | 说明 |
|------|------|
| `DELETE /api/conversations/:id` | 删除对话（后端已有） |

**前端待做：**

- [ ] `api-bridge.deleteConversation(id)`
- [ ] 对话列表项增加删除（确认框）→ 删后刷新列表

---

### 7. 自定义技能 / 工作流删除

| 接口 | 说明 |
|------|------|
| `DELETE /api/user-skills/:skillId` | 删除自定义技能 |
| `DELETE /api/user-workflows/:workflowId` | 删除自定义工作流 |

**前端待做：**

- [ ] 技能页 / 工作流页对已创建的 `uskill_*` / `uwf_*` 显示删除按钮（`api-bridge` 方法已存在，需挂 UI）

---

### 8. UI 原型消息 `protoCard`

| 项 | 说明 |
|----|------|
| **后端** | 执行 `generate_ui` 技能后，消息带 `protoCard`（HTML 字符串） |
| **前端** | `renderChatMessage` 已有 `msg.protoCard ? renderProtoCard(...)`，**需确认** `patchConversation` 后消息对象保留 `protoCard` |

**前端待做：**

- [ ] 跑一遍 `generate_ui`，确认 iframe 能展示；若无，检查是否用服务端返回的 `message` 覆盖本地时丢了字段

---

### 9. 技能详情页

| 接口 | 说明 |
|------|------|
| `GET /api/skills/:skillId` | → `{ skill }`（含动态 `installs`） |

**前端待做：**

- [ ] 市场卡片长按/详情按钮 → Modal 展示描述、作者、安装量
- [ ] `fetchSkillDetail(skillId)`

---

### 10. 需求编辑与删除

| 接口 | 说明 |
|------|------|
| `PUT /api/requirements/:id` | 已有，可改 title/background/goal/skills 等 |
| `DELETE /api/requirements/:id` | **新增**，仅作者可删 |

**前端待做：**

- [ ] 需求详情 Modal 增加「编辑」「删除」
- [ ] `api-bridge.deleteRequirement(id)`

---

### 11. 我的申请列表

| 接口 | 说明 |
|------|------|
| `GET /api/users/me/applications` | 我提交过的申请及状态 |

**前端待做：**

- [ ] 个人中心或广场增加「我的申请」入口（可选 P1）

---

### 12. 申请参与 — 附言

见 P0 §1：`applyRequirement(reqId, { message })`。

---

## 三、可暂缓（P2）— 纯 UI 占位

以下**无对应后端规划**或仅 toast，可等产品排期：

| 功能 | 当前表现 |
|------|----------|
| 对话区 📎 / @ | `showToast('即将上线')` |
| 消息转发 | toast |
| 群「视频会议」「📁 文件」顶栏 | toast |
| 成员在线绿点 | `Math.random()` |
| 侧边栏「+ 创建」群 | 提示去匹配 |
| 工作流自动调匹配 API | 仍为串行 AI 技能，非真匹配 |

---

## 四、`api-bridge.js` 建议新增方法一览

```javascript
// 申请
fetchReqApplications(reqId)
reviewApplication(reqId, appId, status)
applyRequirement(id, { message })  // 扩展 body

// 群组
createGroup(reqId, invitedUserId, inviteMessage)

// 作品集
fetchMyPortfolio()
createPortfolioItem(body)
updatePortfolioItem(itemId, body)
deletePortfolioItem(itemId)

// 名片
aiEnhanceProfile()

// 对话
deleteConversation(id)

// 需求
deleteRequirement(id)

// 技能
fetchSkillDetail(skillId)

// 我的申请（可选）
fetchMyApplications()
```

---

## 五、数据字段变更（前端需兼容）

| 字段 | 位置 | 说明 |
|------|------|------|
| `user.portfolio` | `/auth/me`, `/users/:id` | 作品数组 |
| `user.portfolioCount` | 用户对象 | 公开作品数量，匹配卡片可展示 |
| `message.protoCard` | 对话消息 | HTML 字符串，用于 iframe |
| `applications[].applicant` | 申请列表 | 完整用户摘要 |

---

## 六、后端已完成（无需前端即可用 / 前端接上即生效）

| 能力 | 接口或行为 |
|------|------------|
| 申请落库 + 发布者列表/审批 | `GET/PUT .../applications` |
| 邀请写入 `invitees` + 申请 accepted | `POST /groups` + `inviteMessage` |
| 作品集 CRUD | `/users/me/portfolio` |
| AI 完善名片 | `POST /users/me/ai-enhance-profile` |
| `generate_ui` → `protoCard` | `/api/ai/skill` 消息字段 |
| 技能安装量递增 | `POST /users/me/skills` 新增 id 时 |
| 技能详情 | `GET /skills/:skillId` |
| 市场列表动态 installs | `GET /skills/market` |
| 删除需求 | `DELETE /requirements/:id` |
| 我的申请列表 | `GET /users/me/applications` |
| 用户 `portfolioCount` | `toUserJson` / 匹配接口中的 user |

---

## 七、联调顺序建议

1. `inviteMessage` + 申请审批（改动小、价值高）  
2. Portfolio + AI 完善名片  
3. `protoCard` 验证 + 技能详情  
4. 群文件（依赖上传方案）  
5. 删除对话 / 自定义技能 / 需求编辑删除  

前端 PR 合并后，后端可再补：**文件上传 API**、**工作流内嵌真实匹配步骤** 等（需单独评审）。

---

*文档版本：与当前 `server/` 代码同步，如有接口变更以 `server/README.md` 为准。*
