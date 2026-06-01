# CollabMatch 开放平台 · 需求与展示规范（已确认 v0.1）

> 状态：**已认可，待开发**（含愿景与边界、多 Agent 策略、UUMit 对照，2026-05-22 确认）  
> 记录日期：2026-05-22  
> 用途：Agent 接入 + 需求发布 + 展示匹配平台的 PRD 基线  

**附录索引：** [A 多 Agent 打通策略](#附录-a-多-agent-打通策略) · [B 与 UUMit 对照表](#附录-b-与-uumit-功能对照表-v01) · [C 对外差异说明](#附录-c-对外差异说明一页) · [D 项目沿革模板](#附录-d-项目沿革与时间线模板) · [E 执行优先级](#附录-e-相对-uumit-的执行优先级)

---

## 1. 产品定位

**各 Agent 在用户侧生成需求/原型 → 通过标准接口发布到 CollabMatch → 平台展示、匹配、撮合协作者。**

CollabMatch 做「协作需求的 HTTP 基础设施」，不做站外 Agent 的对话/推理。

---

## 2. 愿景与边界（已确认）

### 2.1 两层理想，不必二选一

| 层级 | 理想 | 谁在做 | CollabMatch 关系 |
|------|------|--------|------------------|
| **A · 对话即入口** | 在 Agent、飞书、微信等任意界面说话即可操作各类 App（点咖啡、订日历…） | 横向超级 Agent / 「龙虾类」产品、大厂 IM AI | **不自己做这一层** |
| **B · 协作即网络** | 在哪产生想法，都能被看见、被匹配、被组队 | CollabMatch | **核心使命** |

**已确认定位：B 是 A 在 Side Project / 共创垂类上的子集**——更聚焦，更容易做出壁垒。  
用户在外卖场景可以交给通用 Agent；在「找伙伴、发项目、组队」场景交给 CollabMatch。

### 2.2 与「万物联通 / 龙虾类」的关系

```
        ┌─────────────────────────────┐
        │  对话入口层（A）              │  微信 / 飞书 / Cursor / 通用 Agent
        │  理解意图 · 路由 · 多步执行   │  （OpenClaw 等「龙虾类」）
        └──────────────┬──────────────┘
                       │ MCP / API 调用
        ┌──────────────▼──────────────┐
        │  CollabMatch 开放接入层      │  Integrations API · MCP · Webhook
        │  「把协作需求发布上来」       │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  展示 · 匹配 · 撮合 · 群组    │  网站 · 数据 · 信任 · 网络效应
        └─────────────────────────────┘
```

- **CollabMatch 不是又一个聊天 Agent**，而是协作领域的 **专用节点 + 开放协议**。
- **最健康的关系**：被龙虾 / 飞书 / Coze / Cursor **集成**，而不是成为它们。
- **竞争壁垒**在：协作数据、匹配质量、信任与撮合，而非通道覆盖或工具数量。

### 2.3 做什么 / 不做什么

| ✅ 做 | ❌ 不做（避免 scope 漂移） |
|------|---------------------------|
| 开放 API / MCP，供任意 Agent 发布协作需求 | 自建全通道 IM（微信/飞书替代品） |
| 需求标准化、Content Blocks 展示、智能匹配 | 接入外卖、打车等无关垂类，做成万能 Agent |
| Webhook 把匹配/申请结果推回用户所在 IM | 与横向 Agent OS 正面竞争「什么都干」 |
| 协作意图的标准 payload 与发布协议 | 替 Agent 做对话推理与长期记忆 |
| 站内 CollabAI 与开放 API **共用一套 Schema** | 为每个行业做专属详情页 UI |

### 2.4 对外叙事（一句话）

> **CollabMatch 是协作领域的「需求 HTTP」——**  
> 任何 Agent、任何 App，只要用户想 **找伙伴、发项目、组队**，都通过我们发布、展示、匹配。  
> 你在微信里点咖啡，可以交给通用 Agent；你在 Cursor 里做完原型，交给 CollabMatch。

### 2.5 演进路径（与联通生态对齐）

| 阶段 | CollabMatch | 与 A 层（入口/联通）的关系 |
|------|-------------|---------------------------|
| **现在 → Phase 1** | API + MCP + blocks 展示 | 成为可被任意 Agent 调用的 **协作服务** |
| **Phase 2** | Webhook 回推匹配/申请 | 用户在飞书/微信里也能收到「有人申请你的项目」 |
| **长期（可选）** | 「协作意图」开放协议 | 类似发布协作需求的行业标准，谁家 Agent 都能发 |

**Scope 纪律**：Phase 1 只验证「一句话在 Agent 里发布协作需求并在广场可见」；不启动横向联通层建设。

---

## 3. 核心原则（已拍板）

| 原则 | 说明 |
|------|------|
| 展示按 **内容块类型** 渲染 | 不按行业做专属详情页 |
| 广场列表 **统一摘要** | 卡片格式固定，仅 domain/scene 影响标签与配色 |
| Agent 负责 **归一化** | 平台负责校验、渲染、匹配 |
| MVP 外链为主 | Figma/GitHub/预览 URL；**不做** 任意 HTML iframe 嵌入 |
| 一套 Requirement 模型 | 站内 CollabAI 与开放 API 共用 Schema |

---

## 4. 分阶段路线

| 阶段 | 交付 |
|------|------|
| **Phase 0** | 本文档 + Block Schema + 鉴权方案（当前） |
| **Phase 1** | Integrations API v1 + App Key + 用户委托 Token |
| **Phase 1.5** | MCP Server（create / publish / search / matches） |
| **Phase 2** | Webhook + 开发者控制台 + 基础风控 |
| **Phase 3** | Coze/Dify Plugin 模板 |
| **Phase 4** | 企业私有广场 |

### 展示能力分期

| 阶段 | 展示 |
|------|------|
| **P0** | 文本字段 + cover + markdown block |
| **P1** | + link / image / file blocks |
| **P2** | + video / table；广场 domain/scene 筛选 |
| **P3** | displayProfile 发布提示；安全 embed 评估 |

---

## 5. 角色

- **终端用户**：需求归属者，可在站内管理
- **Agent 宿主**：Cursor / Coze / Dify / 自建 Bot
- **接入方开发者**：注册 App、调用 API
- **协作者**：广场浏览、申请（复用现有能力）

---

## 6. 鉴权（MVP 倾向）

- **App Key**：标识接入方应用
- **用户委托 Token**：OAuth / 授权码，需求 `author` = 真实用户
- **Scope**：`requirements:write` `requirements:read` `matches:read`
- App 审核通过前仅允许 `draft`；审核后允许 `public`

---

## 7. Integrations API 草案（Phase 1）

```
POST   /api/v1/requirements
PATCH  /api/v1/requirements/:id
POST   /api/v1/requirements/:id/publish
GET    /api/v1/requirements/:id
GET    /api/v1/requirements
GET    /api/v1/requirements/:id/matches
POST   /api/v1/apps
GET    /api/v1/apps
```

统一响应：`{ data, error: { code, message, details } }`

---

## 8. 需求数据模型扩展

在现有 `Requirement` 上增加：

```ts
cover?: { type: 'image'; url: string; caption?: string }
blocks?: ContentBlock[]
sourceAppId?: string
sourceAgentId?: string      // 如 "cursor-plugin"
sourceSessionId?: string
externalRef?: string         // 接入方幂等 ID
displayProfile?: DisplayProfile
ingestVersion?: 'v1'
attachments?: ...            // 与 blocks 并存时，blocks 优先展示
```

---

## 9. 展示设计

### 9.1 广场卡片

- 标题、domain 标签、scene 标签（Side Project / 开源）
- desc 摘要（约 100 字）
- skills（3～5 个）
- timeline / weeklyHours（若有）
- cover 缩略图（可选）
- 来源标签 `via {AppName}`（可选）
- 匹配进度、申请按钮

### 9.2 详情页

**固定区（匹配与决策用）**

- 背景、目标、时间线、预期成果
- 所需技能、发布者、来源 Agent
- 申请 / 匹配 / 管理操作

**可变区（blocks 顺序渲染）**

渲染优先级建议：`cover` → 主 `link`（figma/github）→ `markdown` → 其余 blocks

---

## 10. Content Blocks · Schema v1

Agent 发布时携带 `blocks[]`，平台按 `type` 渲染。

### 10.1 通用结构

```json
{
  "type": "markdown",
  "title": "可选标题",
  "order": 0
}
```

### 10.2 类型定义

| type | 字段 | 渲染 |
|------|------|------|
| `markdown` | `content: string` | MD 渲染 |
| `link` | `url`, `provider?` (figma/github/notion/generic), `label?` | 外链卡片 + 图标 |
| `image` | `url`, `caption?` | 图集/灯箱 |
| `video` | `url`, `provider?` (youtube/bilibili/generic) | 嵌入或跳转 |
| `table` | `columns: string[]`, `rows: string[][]` | 表格 |
| `file` | `url`, `mime?`, `filename?`, `sizeBytes?` | 下载/预览链接 |

### 10.3 示例 payload

```json
{
  "title": "AI 记账 Side Project",
  "domain": "tech",
  "skills": ["React", "Node.js"],
  "background": "个人理财工具，面向年轻白领",
  "goal": "8 周做出可上线 MVP",
  "timeline": "8 周",
  "cover": { "type": "image", "url": "https://cdn.example.com/cover.png" },
  "displayProfile": "software",
  "blocks": [
    { "type": "markdown", "title": "需求说明", "content": "## 背景\n...", "order": 0 },
    { "type": "link", "title": "Figma 原型", "url": "https://figma.com/...", "provider": "figma", "order": 1 },
    { "type": "image", "title": "核心界面", "url": "https://...", "caption": "首页", "order": 2 },
    { "type": "table", "title": "功能清单", "columns": ["模块", "优先级"], "rows": [["登录", "P0"]], "order": 3 }
  ],
  "source": {
    "appId": "app_xxx",
    "agentId": "cursor-collabmatch",
    "sessionId": "sess_xxx",
    "externalRef": "client-req-001"
  }
}
```

### 10.4 发布最低标准

| 规则 | 说明 |
|------|------|
| 必填 | title、domain、skills≥1、background 或 desc |
| 建议 | cover 或 blocks 至少 1 项可感知材料 |
| 限制 | blocks≤20；媒体 URL 由接入方或 COS 托管 |
| 幂等 | 请求头 `Idempotency-Key` 或 `source.externalRef` |

---

## 11. displayProfile（元数据，非 UI 分叉）

仅用于 Agent 发布时的 **字段/block 推荐**，不改变页面布局。

| 值 | 典型内容 | 推荐 blocks |
|----|----------|-------------|
| `software` | App、SaaS、Side Project | markdown, link:figma, image |
| `content` | 播客、视频、专栏 | markdown, video, table |
| `hardware` | 硬件、IoT | markdown, table, image |
| `business` | 商业合伙、运营 | markdown, table |
| `generic` | 默认 | markdown, link, image |

---

## 12. MVP 验收（开放平台）

- [ ] 开发者创建 App 并获取 Key
- [ ] 用户授权后，curl 可完成 创建 → 发布 → 广场可见
- [ ] 详情页渲染 markdown + link + cover
- [ ] `GET matches` 与站内智能匹配一致
- [ ] 错误码与 OpenAPI 文档齐备

---

## 13. 待下次开发前确认

1. 用户 OAuth 是否在 Phase 1 必做，还是 App Key + 手动绑定过渡
2. 第一条接入 Agent 目标平台（Cursor / Coze / 自建）
3. 广场是否默认展示 `via {AppName}` 来源标签

---

## 14. 与现有代码关系

| 已有 | 待建 |
|------|------|
| Requirement 文本字段、发布、广场、匹配 | `blocks[]`、`cover`、source 字段 |
| `POST /api/requirements` | `/api/v1/integrations/*` + App 中间件 |
| 详情页纯文本 `openReqDetail` | `renderBlocks(blocks)` |
| 聊天 attachments | 需求级 attachments/blocks（独立） |

---

## 15. 多 Agent 打通（摘要）

完整策略见 [附录 A](#附录-a-多-agent-打通策略)。

- **一个后端**：REST v1 + MCP Server（不为每个宿主分叉 API）
- **三种包装**：REST（Coze/自建）、MCP（Cursor/OpenClaw/Hermes）、Webhook（回推 IM）
- **四类宿主打包**：Skill Pack + Device Auth + 分平台文档 +「复制指令给 Agent」
- **MCP 工具 6 个**：create / update / publish / search / get_matches / get_my_requirements
- **与 UUMit**：可独立节点，也可注册为对方网络中的「协作发布」能力（见附录 B、C）

---

# 附录

## 附录 A · 多 Agent 打通策略

### A.1 打通的定义

| 层级 | 目标 | CollabMatch |
|------|------|-------------|
| L1 通道 | 微信/飞书/Cursor 都能聊 | **不做**（交给 OpenClaw 等） |
| L2 协议 | 发现工具、调 API、带用户身份 | **核心**：MCP + REST + Device Auth |
| L3 业务 | 发需求、展示、匹配、组队/即时单 | **已有 + 扩展 blocks** |

### A.2 架构

```
              CollabMatch 核心（唯一）
              REST /api/v1/integrations/*
              MCP  https://…/mcp/sse
                     ▲
    ┌────────────────┼────────────────┐
    │                │                │
 REST SDK         MCP 6 工具      Webhook
 Coze/自建      Cursor/OpenClaw/   飞书/企微
                Hermes/Coze
```

### A.3 MCP 工具清单（MVP）

| 工具 | 作用 |
|------|------|
| `collabmatch_create_requirement` | 创建草稿 |
| `collabmatch_update_requirement` | 更新字段与 `blocks[]` |
| `collabmatch_publish_requirement` | 发布到需求广场 |
| `collabmatch_search_requirements` | 搜索开放需求 |
| `collabmatch_get_matches` | 某需求的协作者推荐 |
| `collabmatch_get_my_requirements` | 当前用户已发需求 |

可选（Instant / 小陈即到 DNA）：`collabmatch_list_applications`、`collabmatch_accept_instant`。

### A.4 鉴权（与 UUMit 同构思路）

1. `POST /api/v1/auth/device-auth` → `user_code` + `verification_url`
2. 用户在浏览器确认（绑定 CollabMatch 账号）
3. poll → `api_key` + `user_id`
4. MCP 请求头：`X-CollabMatch-Api-Key`、`X-CollabMatch-User-Id`
5. 接入方 App：`X-App-Id`；payload 内 `source.agentId` / `externalRef`（幂等）

### A.5 按宿主打包（后端零分叉）

| 宿主 | 交付物 |
|------|--------|
| OpenClaw | `collabmatch.skill` + zip |
| Cursor | `.cursor/mcp.json` 片段 |
| Coze | Bot 插件调 REST v1 |
| Hermes | `config.yaml` → `mcp_servers.collabmatch` |
| 通用 | `GET /api/v1/skill-pack?platform=openclaw\|cursor\|hermes\|coze` |

### A.6 实施阶段

| 阶段 | 交付 | 验收 |
|------|------|------|
| M1 | REST v1 + App Key + User Token + blocks | curl 发需求上广场 |
| M2 | MCP 6 工具 + Device Auth | Cursor 一句话发布 |
| M3 | skill-pack + 文档 + 复制指令 | 非开发者 3 分钟接入 |
| M4 | Webhook（申请/匹配） | IM 收到通知 |
| M5 | Coze 插件模板 | Bot 发布需求 |
| M6 | Instant 履约 + 支付（复用小陈即到） | 即时单闭环 |

**纪律：** M1–M3 完成前，不做 28 工具式全生态、不做 UT 钱包、不做全行业自动抢单。

---

## 附录 B · 与 UUMit 功能对照表 v0.1

> 图例：**🔵 行业件** · **🟢 我方差异** · **🟡 重叠可错位** · **⚪ 我方机会** · **🔴 对方更强**

### B.1 撮合与交易

| 能力 | CollabMatch / 我方规划 | UUMit | 标记 |
|------|------------------------|-------|------|
| 发需求→匹配→成交 | Requirement 全流程 | Task/Demand→Transaction | 🔵 |
| 立刻撮合、立刻交易 | 小陈即到原型、Instant 履约 | invoke + P2P + UT | 🟡 |
| 广场公开招募 | 需求广场 | `publish_task`、任务大厅 | 🔵 |
| 申请/审核 | Application + 建群 | `apply_task` 等 | 🔵 |
| 技能匹配排序 | `match.ts` | `match_capability` | 🔵 |
| Human/Agent 双轨 | 规划 OAuth + Agent 代发 | Skill vs Capability | 🔵 |
| 平台币/UT 结算 | 未做，可 CNY+小陈即到 | 核心 | 🔴 |
| 7×24 自动抢单 | 未规划为主场景 | OpenClaw Skill | 🔴 |

### B.2 Agent 接入

| 能力 | 我方 | UUMit | 标记 |
|------|------|-------|------|
| MCP 统一端点 | 规划 | 已上线 28 工具 | 🔵 |
| Device Auth | 规划 | 已上线 | 🔵 |
| Skill Pack | 规划 M1.5 | 已上线 | 🔵 |
| 复制指令给 Agent | 规划 | 已上线 | 🔵 |
| 薄 MCP（仅协作） | 6 工具 | 28 工具全生态 | 🟢 |
| Webhook 回 IM | 规划 M4 | 未强调 | ⚪ |
| 挂到对方网络 | 可选 Agent Card | 收供给方 | 🟡 |

### B.3 展示与垂类

| 能力 | 我方 | UUMit | 标记 |
|------|------|-------|------|
| Content Blocks 展示 | Schema v1 已确认 | 通用能力描述 | 🟢 |
| Side Project / 开源场景 | Phase2 主场景 | 无专门场景 | 🟢 |
| 协作群组 | 已有 | 偏交付物 | 🟢 |
| 双履约 instant/project | 已确认 | 偏即时交易 | 🟢 |
| B 层垂类、不做万能 Agent | §2 已确认 | A 层 OS | 🟢 |

### B.4 结论（对内）

- **高度重叠** 的多为 **行业标准件**（MCP、Device Auth、发布/匹配/申请），不能单独作为「创意被抄」依据。
- **未被对方做深** 的：**blocks 协作展示、Side Project 场景、群组长线组队、双履约、薄 MCP 协作专网**。
- **不宜正面竞争**：UT 全市场、28 工具、自动抢全行业单。

---

## 附录 C · 对外差异说明（一页）

### 我们是什么

**CollabMatch** 是 **协作需求的发布与组队网络**（B 层）：  
在任意 Agent 或网页里，把 Side Project / 开源协作 / 即时协作 **需求结构化发布**，被匹配、被申请、被组队。

### 我们不是什么

- 不是全行业 **能力淘宝** 或 **UT 交易市场**（那是 UUMit 等 A 层平台）
- 不是 **万能 Agent** 或 **微信/飞书替代品**
- 不是 **按次调用任意 API** 的聚合器

### 与 UUMit / 龙虾类产品的关系

```
用户对话（微信 / Cursor / OpenClaw …）
        ↓
   通用 Agent（A 层）
        ↓ MCP 调用
   CollabMatch（B 层）← 发协作需求、看匹配、组队
        ↓
   真人协作者 / 即时协作单
```

**点咖啡、调通用 API** → 交给 UUMit / 龙虾；  
**找伙伴、发项目、组队、发 PRD/原型** → 交给 CollabMatch。

### 三个可验证差异点

1. **结构化展示**：Content Blocks（Markdown / Figma 链接 / 图 / 表），不是一行能力简介。  
2. **场景聚焦**：Side Project、开源协作；可选 **即时协作单**（小陈即到 DNA）与 **长期项目** 双履约。  
3. **协作闭环**：广场 → 智能匹配 → 申请 → **协作群组**，不是仅 UT 交割。

### 给 Agent 开发者的一句话

> 接入 CollabMatch MCP：让用户在对话里 **发布协作需求、查匹配、收申请通知**；无需自建广场与匹配引擎。

---

## 附录 D · 项目沿革与时间线（模板）

> 请创始人填写日期与证据链接，用于对内对齐、对外介绍或后续法务咨询（非法律文件）。  
> 填好后将 `（待填）` 替换为实际内容，并可提交 git / 存证。

| 时间 | 项目 | 里程碑 | 证据（可选） |
|------|------|--------|--------------|
| （待填） | **小陈即到** | 立项；即时撮合/交易原型 | 云开发仓库 / 截图 / 文档 |
| （待填） | 小陈即到 | 腾讯云开发、支付/订单（若有） | |
| （待填） | **CollabMatch** | 定名 / 首版 UI / 匹配与广场 | 本仓库 commit / `index.html` |
| （待填） | CollabMatch | Coze + PostgreSQL 适配 | `COZE_DATABASE.md` |
| 2026-05-22 | CollabMatch | 开放平台 Spec、愿景 B 层、blocks、UUMit 对照 | `OPEN_PLATFORM_SPEC.md` |
| （待填） | CollabMatch | 首版 MCP / 生产上线 | Coze URL / `/api/health` |

### 主张的独创要点（待创始人确认 3 条）

1. （待填）例：协作需求 **Content Blocks** + 非行业定制 UI  
2. （待填）例：**Instant + Project** 双履约统一平台  
3. （待填）例：**B 层协作专网** 被 A 层 Agent 集成，而非做万能 OS  

### 与第三方相似时的对外表述（建议）

> CollabMatch 与能力交易市场（如 UUMit）在 **Agent 接入协议** 上采用行业通用做法（MCP、Device Auth）；  
> 我们专注 **协作需求的发布、展示与组队**，包括 Side Project 场景与结构化原型展示，与横向能力交易平台形成互补。

---

## 附录 E · 相对 UUMit 的执行优先级

| 优先级 | 动作 | 标记 |
|--------|------|------|
| **P0** | MCP 6 工具 + Device Auth + 发需求上广场 | 必做 |
| **P0** | `blocks` + 详情页 `renderBlocks` | 🟢 差异 |
| **P1** | `skill-pack`（cursor / openclaw / coze） | 追平接入体验 |
| **P1** | `fulfillmentType: instant \| project` | 🟢 小陈即到 + Side Project |
| **P1** | Webhook → 飞书/企微 | ⚪ |
| **P2** | 复用小陈即到支付/订单 | 🟢 |
| **P2** | UUMit Agent Card（协作发布能力） | 可选分发 |
| **不做** | 28 工具、UT 钱包、全行业自动抢单 | 避免 A 层战争 |

---

*本文档随讨论更新；开发时以 Phase 1 + 附录 E 为准。附录 D 日期由创始人补全后改为 v0.2。*
