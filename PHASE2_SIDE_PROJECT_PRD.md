# Phase 2 PRD：Side Project 联创组队

> **版本**：v0.1 · **周期**：8 周 · **定位**：与 UUMit 错位 —— 找联创伙伴一起做项目，不是调 Agent/API  
> **主场景**：Side Project 联创 · **子场景**：开源协作

---

## 1. 目标与指标

| 目标 | 说明 |
|------|------|
| **产品目标** | 让有 idea 的人发布 Side Project，匹配可投入的 Builder，走完申请→建群 |
| **不做** | Agent 上架、API 市场、UT 结算、知识付费 |

| 指标 | 内测目标（8 周内） |
|------|-------------------|
| 联创需求发布数 | ≥ 15 条（`sceneTag=side-project` 或子场景 `opensource`） |
| **建群率** | 发布 → 至少 1 人申请且建群 ≥ **20%** |
| Builder 7 日回访 | ≥ **30%** |

---

## 2. 用户与场景

| Persona | 行为 |
|---------|------|
| **发起人（Founder）** | 发 Side Project，找技术/设计/运营联创 |
| **协作者（Builder）** | 用技能反向匹配，申请周末可投入的项目 |
| **开源维护者** | 发 `opensource` 需求，招贡献者 |

**对外 Slogan**：说一个项目，找到对的人一起做。

---

## 3. 数据模型扩展（Requirement）

在现有字段基础上 **新增**（MongoDB，向后兼容，均有 default）：

| 字段 | 类型 | 枚举/格式 | 默认 | 说明 |
|------|------|-----------|------|------|
| `sceneTag` | string | `side-project` \| `opensource` | `side-project` | 场景标签，广场 Tab 筛选 |
| `projectStage` | string | `idea` \| `prototype` \| `mvp` \| `growth` | `idea` | 项目阶段 |
| `weeklyHours` | string | `≤5h` \| `5-10h` \| `10-20h` \| `20h+` | `5-10h` | 期望协作者周投入 |
| `collabMode` | string | `联创` \| `有偿` \| `股权/分成面议` \| `开源贡献` | `联创` | 合作方式 |
| `lookingFor` | string[] | 见下表 | `[]` | 招募角色 |
| `remoteOk` | boolean | — | `true` | 是否接受远程 |

**lookingFor 可选值**：`前端` `后端` `全栈` `UI` `UX` `产品` `运营` `增长` `移动端`

### 3.1 Mongoose 改动

**文件**：`server/src/models/Requirement.ts`

```ts
sceneTag: { type: String, enum: ['side-project', 'opensource'], default: 'side-project' },
projectStage: { type: String, enum: ['idea', 'prototype', 'mvp', 'growth'], default: 'idea' },
weeklyHours: { type: String, enum: ['≤5h', '5-10h', '10-20h', '20h+'], default: '5-10h' },
collabMode: { type: String, enum: ['联创', '有偿', '股权/分成面议', '开源贡献'], default: '联创' },
lookingFor: { type: [String], default: [] },
remoteOk: { type: Boolean, default: true },
```

### 3.2 User 扩展（Phase 2b，可选）

**文件**：`server/src/models/User.ts`

| 字段 | 类型 | 说明 |
|------|------|------|
| `weeklyHours` | string | 本人可投入时间（同 Requirement 枚举） |
| `collabIntent` | string | `联创` \| `有偿副业` \| `开源贡献` |
| `interestedStages` | string[] | 感兴趣的项目阶段 |

---

## 4. API 改动

### 4.1 创建/更新需求

**文件**：`server/src/routes/requirements.ts`

- `CREATABLE_FIELDS` / `UPDATABLE_FIELDS` 增加：
  `sceneTag`, `projectStage`, `weeklyHours`, `collabMode`, `lookingFor`, `remoteOk`
- `POST /api/requirements`：body 可传上述字段；`opensource` 场景建议 `collabMode=开源贡献`
- `PUT /api/requirements/:id`：同上
- **校验**：`sceneTag=opensource` 时建议 `collabMode` 为 `开源贡献` 或 `联创`（warning 不 block）

### 4.2 列表筛选

**`GET /api/requirements`**

| Query | 说明 |
|-------|------|
| `sceneTag` | `side-project` \| `opensource` |
| `domain` | 保留 |
| `weeklyHours` | 可选，精确匹配 |
| `lookingFor` | 可选，数组包含 |

示例：`GET /api/requirements?sceneTag=side-project&visibility=public`

### 4.3 序列化

**文件**：`server/src/utils/serialize.ts` → `toRequirementJson`

返回 JSON 增加 Phase 2 全部新字段，供前端卡片展示。

### 4.4 匹配加权

**文件**：`server/src/services/match.ts`

**Forward（需求 → 用户）**：

```
matchPct =
  skillOverlap        × 0.40  （原逻辑缩放）
+ lookingForHit       × 0.25  （用户 skills/position 命中 lookingFor）
+ weeklyHoursProximity× 0.20  （档位差 0=满分，差 1 档=70%，差 2+=40%）
+ domainMatch         × 0.10
+ collabScore         × 0.05
```

**Reverse（用户 → 需求）** 优先：

- `sceneTag` 为 `side-project` 或 `opensource`
- `weeklyHours` 为 `≤5h` 或 `5-10h`（副业友好）+15 分
- `projectStage` 为 `idea` 或 `prototype` +10 分
- `collabMode` 为 `联创` 或 `开源贡献` +5 分

### 4.5 发需求向导（Phase 2b，新接口可选）

**`POST /api/requirements/from-wizard`**

```json
{
  "sceneTag": "side-project",
  "titleHint": "AI 记账 Side Project",
  "projectStage": "idea",
  "lookingFor": ["全栈", "UI"],
  "weeklyHours": "5-10h",
  "collabMode": "联创",
  "remoteOk": true,
  "rawDescription": "用户自由描述..."
}
```

服务端调 LLM/mock 生成完整 `title/background/goal/desc/skills`，创建 `draft` 需求。

**Phase 2a**：可仅用 CollabAI 对话 + 手动字段，不强制此接口。

---

## 5. 前端改版清单（index.html）

### 5.1 已完成（Phase 2a 文案 + 广场 Tab）

| 区域 | 改动 |
|------|------|
| `<title>` / 侧栏副标题 | Side Project 联创定位 |
| 登录页 | 副标题联创叙事 |
| CollabAI 头部 / placeholder | 联创示例句 |
| 快速模板 chips | Side Project / 开源 / SaaS 联创 |
| 需求广场 | 默认 Tab「联创项目」+「开源协作」+「全部」 |
| 匹配 / 名片 / 技能 Banner | 联创话术 |
| 新对话欢迎语 | Side Project 示例 |

### 5.2 Phase 2b 待开发

| 项 | 文件/位置 | 说明 |
|----|-----------|------|
| 发需求 3 步向导 Modal | `index.html` | idea → 缺什么人 → 每周投入 |
| 需求详情展示新字段 | `openReqDetail()` | 阶段/投入/合作方式/招募角色 |
| 广场卡片标签 | `renderSquareCard()` | 显示 weeklyHours、collabMode |
| 个人名片 | `renderProfile()` | 可投入时间、联创意向 |
| API 传参 | `api-bridge.js` | create/update requirement 带新字段 |
| 筛选走后端 | `renderSquare()` | `CollabApi.loadRequirements({ sceneTag })` |

### 5.3 发需求 3 步向导（交互稿）

```
Step 1 — 项目是什么？
  [ Side Project 联创 ]  [ 开源协作 ]（sceneTag）
  简述：textarea
  阶段：idea / prototype / mvp / growth

Step 2 — 缺什么人？
  多选：前端 后端 全栈 UI 产品 运营 …

Step 3 — 怎么合作？
  合作方式：联创 / 有偿 / 股权面议 / 开源贡献
  每周投入期望：≤5h / 5-10h / 10-20h / 20h+
  [ ] 接受远程

→ 生成草稿 → CollabAI 可继续润色 → 发布到广场
```

---

## 6. 种子数据

**文件**：`server/src/services/seed.ts`

新增 2 条演示：

1. Side Project：`sceneTag: side-project`, `weeklyHours: 5-10h`, `lookingFor: ['全栈','UI']`
2. 开源：`sceneTag: opensource`, `collabMode: 开源贡献`, title 含「开源」

---

## 7. 排期

| 阶段 | 时间 | 交付 |
|------|------|------|
| **2a** | W1–2 | 文案 + 广场场景 Tab + Coze 内测招募 |
| **2b** | W3–4 | 模型字段 + API + 卡片展示 + 向导 Modal |
| **2c** | W5–6 | match.ts 加权 + 反向推荐优化 |
| **2d** | W7–8 | 3 条真实案例 + 指标复盘 |

---

## 8. 验收清单

- [ ] 广场默认「联创项目」Tab，筛选正确
- [ ] 新需求可带 `sceneTag` / `weeklyHours` 等字段存库
- [ ] 详情页展示 Phase 2 字段
- [ ] 匹配结果对「5-10h 副业」需求更友好
- [ ] 登录 → 发联创需求 → 广场可见 → 他人申请 → 审批 → 建群
- [ ] 与 UUMit 叙事区分：无 Agent/API/UT 入口

---

## 9. 文件改动索引

| 文件 | 改动类型 |
|------|----------|
| `server/src/models/Requirement.ts` | 新增字段 |
| `server/src/models/User.ts` | 可选新增 |
| `server/src/routes/requirements.ts` | CRUD + 列表筛选 |
| `server/src/utils/serialize.ts` | JSON 输出 |
| `server/src/services/match.ts` | 加权算法 |
| `server/src/services/seed.ts` | 演示数据 |
| `server/src/config/domains.ts` | 模板文案（联创向） |
| `index.html` | 文案 + Tab + 向导 UI |
| `api-bridge.js` | 列表 query + 创建 body |

---

*文档维护：Phase 2 迭代时同步更新验收项。*
