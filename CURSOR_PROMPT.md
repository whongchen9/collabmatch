# CollabMatch 后端开发 — Cursor 提示词

> 复制以下全部内容，粘贴到 Cursor / Composer 中即可。

---

我正在开发一个叫 **CollabMatch** 的 AI 协作匹配平台。前端原型已完成（`index.html`），后端需要你来实现。

## 项目位置

- 前端：`collabmatch/index.html`（你可以打开参考 UI 和数据结构）
- 后端：`collabmatch/server/`（Express + TypeScript + MongoDB）
- 规格文档：`collabmatch/BACKEND_SPEC.md`（完整 API 清单）
- 路线图：`collabmatch/ROADMAP.md`（功能规划）

## 当前后端状态

- 框架：Express + TypeScript + MongoDB（已有基础骨架）
- 默认用内存数据库（`USE_MEMORY_DB=true`），无需安装 MongoDB
- CORS 已开启，端口 3001
- 已有功能：登录、用户 CRUD、对话、需求、匹配、群组
- 启动：`cd server && npm run dev`

## 这次要你做的新增功能

### 1. 技能市场 API

前端右侧面板新增「⚡ 技能」Tab，可以浏览/搜索/安装技能。

**数据模型扩展现有 `Skill`：**

```typescript
interface Skill {
  id: string;               // 'generate_prd'
  icon: string;             // '📋'
  name: string;             // '生成需求文档'
  desktop: string;          // '将用户的描述整理为结构化需求文档'
  instruct: string;         // LLM system prompt
  category: 'official' | 'community';  // 新增
  author: string;           // 新增 'CollabAI'
  tags: string[];           // 新增 ['文档','需求']
  installs: number;         // 新增 12580
  version: string;          // 新增 '1.3'
  isInstallable: boolean;   // 新增
}
```

**需要新增的接口：**

```
GET  /api/skills/market
  返回所有 isInstallable=true 的技能列表
  可选 query: ?q=搜索关键词（匹配 name/tags）

POST /api/users/me/skills
  body: { skillIds: string[] }
  保存当前用户已安装的技能列表到 user.skillIds[]

GET  /api/users/me/skills
  返回当前用户已安装的技能 ID 列表 → { skillIds: [...] }
```

**种子数据**：前端 `index.html` 里 `SKILLS` 对象包含 9 个技能（7 official + 2 community），可直接导出到数据库种子。

### 2. 工作流 API

前端右侧面板新增「🔄 流程」Tab，展示预设工作流模板，可一键执行（串行调用多个 skill）。

**数据模型：**

```typescript
interface Workflow {
  id: string;
  name: string;
  desc: string;
  steps: Array<{
    skillId: string;    // 对应 SKILLS key
    title: string;      // '生成需求文档'
    icon: string;       // '📋'
  }>;
  tags: string[];
}
```

**接口：**

```
GET  /api/workflows
  返回所有预设工作流模板（种子数据）

POST /api/workflows/run
  body: {
    workflowId: string,
    conversationId: string,
    context: string         // 可选，流程输入的上下文
  }
  → 后端逻辑：
    1. 找到 workflow
    2. 按 steps 顺序，每个 step 调用已有的 runSkill(conversationId, skillId, context)
    3. 每条 skill 的 AI 回复存入 conversation
    4. 全部完成后返回 { conversation, messages: [...] }
  → 注意：不需要流式返回，一次性返回所有结果即可
```

**种子数据（3 个预设流程）：**

```
wf1: 🚀 从想法到团队 → PRD → 诊断 → 优化 → 邀请文案
wf2: 🎨 原型生成器   → PRD → 生成 UI 原型
wf3: 📊 项目体检     → 诊断 → 优化 → SWOT 分析
```

（完整定义在前端 `index.html` 的 `WORKFLOWS` 数组里）

---

## 确认事项

1. 已有的 `runSkill` 函数保持不动，工作流调用它
2. 默认使用内存数据库，无需安装外部依赖
3. 演示验证码：`123456`，手机号 `13800000000`
4. 所有新接口走 `/api/` 前缀
5. 接口返回格式保持与现有代码一致

先完成这两个模块，有问题随时问。
