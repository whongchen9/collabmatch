# PRD 勘误与补充

> 审查人：许清楚（产品经理）
> 审查日期：2026-06-08
> 审查范围：`docs/game-prd.md` v0.1 vs 实际交付代码 `scripts/game/*.js`（6 模块，共 1389+ 行）
> 标记说明：`[FIX]` 错误修正 | `[ADD]` 新增/遗漏补充 | `[CLOSE]` 闭合待确认项 | `[DEFER]` 推迟到后续版本

---

## 一、一致性检查

### [FIX] §2 US2 / §3 F4 / §4.2 — 交互键确认为 E 键

**PRD v0.1 描述：** 全文使用"按 E 键"作为交互键。

**实际代码验证：**

```js
// engine.js L42-52 — keyMap
var keyMap = {
  // ...
  'KeyE': 'interact'
};

// engine.js L230 — HUD 文本
var text = '按 E ' + (target.type === 'npc' ? '对话' : '查看');
```

**结论：实际交付使用 E 键，与 PRD 一致。** 交互键不是空格键（Space）。此前关于"空格键"的讨论属于后续迭代计划（v0.2 提出 F15：双键兼容方案），当前 P0 未实施。

> **判定：✅ PRD 描述正确，无需修正。**

---

### [FIX] §3 F4 — 实际仅 1 个 NPC（小二哥），侠客 NPC 未实现

**PRD v0.1 描述：** §4.2 定义了 2 种 NPC：小二哥（P0/F4）+ 侠客 NPC（P1/F7）。

**实际代码：** `SCENE_DATA.npcs` 仅含 `waiter_xiaoer` 一个 NPC，无侠客（hero）类型的动态生成逻辑。

```js
// scene.js L104-114
npcs: [
  { id: 'waiter_xiaoer', type: 'waiter', x: 8, y: 8, action: 'openDialog', label: '小二哥' }
]
```

**结论：✅ PRD 已将侠客正确标记为 P1/F7，与交付一致。** 但需注意：PRD §2 US4（侠客匹配用户故事）和 §4.2 中侠客 NPC 定义行应标注为 P1 待实现，避免读者误以为已交付。

> **建议：** 在 US4 和侠客 NPC 表格行旁标注 `[P1 未实现]`。

---

### [FIX] §3 F9 — 铜镜标记有误（PRD 标 P1，实则 P0 已交付）

**PRD v0.1 描述：** F9（铜镜/个人名片入口）标记为 **P1**。

**实际代码：** 铜镜（`bronze_mirror`）在 `SCENE_DATA.interactables` 中已完整定义并可用，`action: 'openProfile'`，`triggerObjectInteraction()` 中已对接：

```js
// scene.js L94-100
{ id: 'bronze_mirror', type: 'mirror', x: 14, y: 11, action: 'openProfile', label: '铜镜' }

// engine.js L161-162
case 'openProfile':
  GameBus.emit('game:openProfile');
```

**结论：铜镜是 P0 已交付功能，PRD 中应更正为 P0。**

---

### [FIX] §3 F10 — 音效标记有误（PRD 标 P1，实则 P0 已交付）

**PRD v0.1 描述：** F10（音效）标记为 **P1**。

**实际代码：** `audio.js`（106 行）已完整实现 4 种音效：

| 函数 | 音效 | 波形 | 调用时机 |
|------|------|------|----------|
| `sfxFootstep()` | 脚步声 | 三角波 80→40Hz | player walking，每 200ms 节流 |
| `sfxInteract()` | 交互提示音 | 正弦 880→440Hz | 靠近交互点时（当前注释，标注"可能太频繁"） |
| `sfxOpenPanel()` | 面板打开音 | 白噪声衰减 | `triggerNPCInteraction()` / `triggerObjectInteraction()` |
| `sfxMatchSuccess()` | 匹配成功和弦 | 三角波 C5-E5-G5 | 已实现但无触发点（F8 未实现） |

**结论：音效是 P0 已交付功能，PRD 中应更正为 P0。** 其中 `sfxMatchSuccess()` 虽已实现，但因 F8 匹配动画未做，实际无调用入口。

---

### [FIX] §4.1 场景布局 — 书架未实际放置

**PRD v0.1 ASCII 图：** 东北角标注 `[书架]`。

**实际代码：** tileset 中 `'10': { type: 'bookshelf' }` 已预留，但 **objects 层未放置**：在 objects 数组 y=0..14 的所有行中均未出现 `10`。场景实际含：酒桌×2（tileId 3,4）、告示墙（tileId 7）、铜镜（tileId 8）、灯笼×2（tileId 9，列 14，行 1-2）。

**结论：书架为 tileset 预留但未在场景中放置，维持 P2 规划。** PRD ASCII 图中书架位置应标注 `[P2 预留]`。

---

### [FIX] §4.1 场景布局 — 遗漏灯笼物件

**PRD v0.1 ASCII 图：** 标注了窗（北墙），但**未提及灯笼**。

**实际代码：** objects 层 y=1（col 14）和 y=2（col 14）放置了 `tileId=9`（灯笼），tile 类型 `'lantern'`，`walkable: true`（不阻挡移动）。

```js
// scene.js L50-51
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0],  // y=1 灯笼
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0],  // y=2 灯笼
```

**结论：灯笼为 P0 实际交付但 PRD 遗漏。** 应在场景布局图中补充灯笼标注。

---

### [FIX] §2 US5 / §3 F7-F8 — 匹配成功完整链路未走通

**PRD v0.1 描述的链路：** US4（侠客 NPC 出现） → US5（入座共饮动画 → 跳转群组）

**实际代码验证：**

| 链路节点 | 状态 | 说明 |
|----------|------|------|
| 驿站场景 | ✅ P0 | 20×15 场景完整 |
| 侠客 NPC 生成 | ❌ 未实现 | `SCENE_DATA.npcs` 无 hero 类型；无 API 轮询/事件驱动生成 |
| 匹配卡片弹出 | ❌ 未实现 | 无 `game:openMatch` 等事件 |
| 匹配成功动画 (入座/斟酒/共饮) | ❌ 未实现 | GameState.ANIMATION 枚举已定义但无触发逻辑 |
| 动画后跳转群组 | ❌ 未实现 | 依赖 F8 |

**结论：F7（侠客 NPC）和 F8（匹配成功动画）均标记为 P1，P0 未交付，链路不可走通。** PRD 本身未声称 P0 可实现此链路，但读者可能误以为 US4/US5 在 P0 范围内。应明确标注。

---

### [FIX] §5.3 文件清单 — 遗漏 `audio.js`

**PRD v0.1 文件清单：** 仅列出 5 个文件（engine.js / scene.js / player.js / npc.js / sprites.js）。

**实际交付：** 6 个文件，多了 `audio.js`（106 行）：

| 文件 | 行数 | 说明 |
|------|------|------|
| `scripts/game/sprites.js` | ~395 行 | 精灵 + Tile 程序化绘制 |
| `scripts/game/scene.js` | ~280 行 | 场景数据 + 预渲染 |
| `scripts/game/player.js` | ~140 行 | 玩家移动/碰撞/动画 |
| `scripts/game/npc.js` | ~66 行 | NPC 呼吸动画/交互判定 |
| `scripts/game/audio.js` | ~106 行 | **PRD 遗漏** |
| `scripts/game/engine.js` | ~403 行 | 主循环/GameBus/HUD |
| **合计** | **~1390 行** | |

---

### [FIX] §5.1 技术集成 — 遗漏 GameBus 事件总线

**PRD v0.1 描述：** §5.2 数据流示意为"Canvas 渲染循环 → DOM overlay 弹窗 → 调用现有 JS"，但**未提及通信机制**。

**实际代码：** `engine.js` 实现了完整的 `GameBus`（基于 `window.CustomEvent`），作为 Canvas ↔ DOM overlay 的桥梁：

```js
// engine.js L58-68
var GameBus = {
  emit: function(eventName, detail) { window.dispatchEvent(new CustomEvent(eventName, { detail })); },
  on: function(eventName, callback) { window.addEventListener(eventName, function(e) { callback(e.detail); }); },
  off: function(eventName, callback) { window.removeEventListener(eventName, callback); }
};
```

已实现事件：`game:openDialog` / `game:openSquare` / `game:openProfile`。

---

### [FIX] §4.1 场景布局 — 坐标细节偏差

**PRD v0.1 ASCII 图 vs 实际 scene.js 坐标对照：**

| 物件 | PRD ASCII 图 | 实际坐标 | 判定 |
|------|-------------|----------|------|
| 小二哥 | 驿站中央偏左 | (8, 8) | ⚠️ ASCII 图定性描述，实际精确坐标已确定 |
| 告示墙 | 北墙中央 | (8, 6) | ✅ |
| 铜镜 | 东南角 | (14, 11) | ✅ 位于右下区域 |
| 酒桌1 | 中央区域 | (6-7, 3-4) | ✅ |
| 酒桌2 | 中央区域 | (10-11, 3-4) | ✅ |
| 玩家出生点 | 南面入口 | (9, 13)，门口 (9, 14) | ✅ |
| 书架 | 东北角 | tileset 预留，**未放置** | ❌ |

> **建议：** 将 PRD ASCII 图替换为基于实际坐标的 grid 图（或直接引用 v0.2 的详细坐标图）。

---

## 二、闭合待确认问题

### [CLOSE] Q1：游戏模式是默认入口还是可切换？

**PRD v0.1 建议：** 默认入口，右上角"退出游戏模式"按钮。

**实际交付：** 非默认入口。用户需点击右上角"进入驿站"按钮主动切换。`enterGameMode()` 为按需加载。

**闭合结论：** 采用**非默认入口**方案。原因合理：
- 不破坏现有用户习惯
- 降低首次加载负担（游戏模块按需加载）
- 给用户选择权

---

### [CLOSE] Q2：精灵/像素素材从哪来？

**PRD v0.1 建议：** 程序化绘制。

**实际交付：** `sprites.js` 使用 `OffscreenCanvas` 逐帧程序化生成所有精灵（玩家 4 方向 × 2 状态 × 多帧 + tile × 12 种 + NPC 1 种），零外部素材依赖。

**闭合结论：** ✅ 程序化绘制方案确认，交付质量良好。

---

### [CLOSE] Q3：移动端如何操作？

**PRD v0.1 建议：** P0 先做桌面端。

**实际交付：** 仅支持键盘 WASD/方向键，无虚拟摇杆/触屏。

**闭合结论：** ✅ P0 桌面端优先，移动端（虚拟摇杆 + 点击移动）列为 P1。

---

### [CLOSE] Q4：场景内是否显示其他在线用户？

**PRD v0.1 建议：** P0 不做。

**实际交付：** 仅本地单人，无 WebSocket/多人。

**闭合结论：** ✅ P0 单人模式，多人同屏列为 P2。

---

### [CLOSE] Q5：侠客 NPC 刷新频率？

**PRD v0.1 建议：** 每次进入场景检查，有推荐则生成 1-2 个，停留 30 秒。

**实际交付：** 侠客 NPC 未实现（F7/P1）。

**闭合结论：** ⏳ 刷新策略待 F7 开发时确定。原建议（进入场景检查 → 生成 → 30s 消失）作为设计参考保留。

---

### [CLOSE] Q6：游戏画布全屏还是嵌入？

**PRD v0.1 建议：** 全屏 Canvas 背景 + DOM overlay 弹窗。

**实际交付：** `#game-canvas` 占满视口（`position: fixed; width: 100vw; height: 100vh`），`#app` 隐藏，`#game-overlay` 浮动在上。

**闭合结论：** ✅ 全屏方案确认，与建议一致。

---

### [CLOSE] Q7：是否需要登录后才能进入场景？

**PRD v0.1 建议：** 是。

**实际交付：** `enterGameMode()` 首行检查 `currentUser`，未登录时 toast 提示"请先登录后再进入驿站"并 return。

**闭合结论：** ✅ 需登录确认，与建议一致。

---

### [CLOSE] Q8：像素动画帧用雪碧图还是程序绘制？

**PRD v0.1 建议：** 程序绘制。

**实际交付：** 全部 `OffscreenCanvas` + `fillRect` 逐像素绘制 + `createImageBitmap` / `transferToImageBitmap` 生成帧。

**闭合结论：** ✅ 程序绘制确认，零外部资源，首屏加载零等待。

---

## 三、补充遗漏需求

### [ADD] A1：i18n 多语言适配

**问题：** PRD v0.1 完全未提及多语言/国际化。

**实际交付：** `index.html` 中 i18n 系统支持三种模式，通过 `t(key)` 统一访问：

| 模式 | 触发 | 品牌名 | 游戏入口 |
|------|------|--------|----------|
| zh | 浏览器中文 / localStorage | 需求匹配 | "进入驿站" |
| en | 浏览器非中文 | Need Match | "Enter Inn" |
| 江湖 (彩蛋) | 中英切换 ≥ 6 次 | **江湖故人** | "客官请进" |

**待补充（P1）：**
- "进入驿站"/"退出驿站"按钮文本 → 接入 `t()` 函数
- HUD "按 E 对话/查看" → 接入 `t()` 函数
- 场景名称 "驿站大厅" → 外置到 i18n key
- NPC 对话 "客官有何吩咐？" → 外置到 i18n key

---

### [ADD] A2：键盘操作完整定义

**问题：** PRD v0.1 提及 WASD/方向键 + E 但未系统定义。

**实际交付的完整键盘映射：**

| 按键 | 动作 | 类型 |
|------|------|------|
| W / ArrowUp | 向上移动 | 持续按下 |
| A / ArrowLeft | 向左移动 | 持续按下 |
| S / ArrowDown | 向下移动 | 持续按下 |
| D / ArrowRight | 向右移动 | 持续按下 |
| E | 交互（对话/查看） | 单帧触发（边缘检测） |
| Esc | 关闭弹窗 | UI 层处理 |

**特性：**
- 对角移动归一化（0.707 倍速，避免斜走比直走快 41%）
- 分轴碰撞检测（滑墙效果）
- 窗口失焦自动释放所有按键
- 弹窗/非 EXPLORE 状态下忽略移动输入

---

### [ADD] A3：HUD 交互提示气泡

**问题：** PRD v0.1 未提及 HUD 提示系统。

**实际交付：** `engine.js` 中的 `renderHUD()` 实现了完整的交互提示气泡：

- 检测玩家 2 tile 曼哈顿距离内的 NPC/交互点
- 在玩家头顶上方绘制圆角矩形气泡
- 文本格式："按 E 对话"（NPC）/ "按 E 查看"（物件）
- 屏幕边缘裁剪保护（不超出 Canvas 边界）
- 优先级：NPC > 交互点（`getNearbyInteractTarget` 中 NPC 先检查）
- 交互提示音 `sfxInteract()` 已实现但当前被注释（标注"可能太频繁"）

---

### [ADD] A4：游戏模式切换体验（enterGameMode / exitGameMode）

**问题：** PRD v0.1 仅提"场景/UI 切换"（F6），未描述具体切换流程。

**实际交付的完整切换流程：**

**进入驿站 (`enterGameMode`)：**
1. 检查登录状态 → 未登录则 toast 提示并 return
2. `gameModeActive = true`
3. 隐藏 `#app`（`display: none`）
4. 显示 `#game-canvas`（`class: active`）
5. 切换按钮文本 → "退出驿站"
6. `initAudio()` 初始化 Web Audio 上下文
7. `loadGameScripts()` 按需串行加载 6 个游戏模块
8. `initGame('game-canvas')` 启动游戏循环

**退出驿站 (`exitGameMode`)：**
1. `gameModeActive = false`
2. `stopGameLoop()` → `cancelAnimationFrame` + 清理状态
3. 隐藏 `#game-canvas` + `#game-overlay`
4. 清空 `#game-panel-content`
5. 显示 `#app`
6. 切换按钮文本 → "进入驿站"

**关键设计：** `pause()` 用于临时暂停（弹窗），`stopGameLoop()` 用于完全退出（清 RAF），避免 Bug #5（RAF 内存泄漏）。

---

### [ADD] A5：音效系统完整描述

**问题：** PRD v0.1 的 F10 仅简略提及"走动脚步声、交互提示音、匹配成功音效"。

**实际交付的完整音效系统：**

| 函数 | 效果 | 技术实现 | 触发条件 |
|------|------|----------|----------|
| `sfxFootstep()` | 低频脚步声 | 三角波 Oscillator，80→40Hz，80ms | player walking，200ms 节流 |
| `sfxInteract()` | 清脆短铃 | 正弦波 Oscillator，880→440Hz，200ms | 靠近交互点时（当前注释关闭） |
| `sfxOpenPanel()` | 卷轴展开声 | 白噪声 BufferSource，200ms 衰减 | 按 E 触发交互成功 |
| `sfxMatchSuccess()` | 上升三和弦 | 三角波 Oscillator，C5-E5-G5 依次触发 | 代码已实现，无调用入口（F8 未做） |

**设计要点：**
- `initAudio()` 需在用户交互事件回调中调用（浏览器 `AudioContext` 策略）
- 所有音效 wrapped 在 `try/catch` 中，静默忽略错误
- 零外部音频文件，全部 Web Audio API 合成
- 总代码量 106 行，体积极小

---

### [ADD] A6：GameBus 事件通信机制

**问题：** PRD v0.1 §5.2 数据流示意过于抽象，未说明 Canvas ↔ DOM 的具体通信方式。

**实际交付：** `GameBus` 基于 `window.CustomEvent`：

| 事件名 | 方向 | 触发场景 | 携带数据 |
|--------|------|----------|----------|
| `game:openDialog` | Canvas → DOM | 小二哥交互 | `{ npc, type }` |
| `game:openSquare` | Canvas → DOM | 告示墙交互 | 无 |
| `game:openProfile` | Canvas → DOM | 铜镜交互 | 无 |

**设计模式：** `index.html` 中注册 GameBus 监听器 → 设置 `renderTarget='game-overlay'` → 调用现有渲染函数（输出到 `#game-panel-content`）→ 关闭 overlay → `resume()` 恢复游戏。

---

## 四、标注未实现

### [DEFER] D1：F7 匹配侠客 NPC → P1

**PRD v0.1 规划：** P1，定时/事件触发在场景中生成"侠客"角色，走近交互展示匹配详情。

**实际状态：** ❌ 完全未实现。`SCENE_DATA.npcs` 仅含 `waiter_xiaoer`。hero 类型 NPC 的动态生成、API 关联、定时消失等逻辑均无。

**建议：** 保持 P1 优先级，下一迭代核心功能。

---

### [DEFER] D2：F8 匹配成功动画 → P1

**PRD v0.1 规划：** P1，双方角色传送到酒桌 → 入座 → 斟酒 → 共饮 → 自动跳转群组。

**实际状态：** ❌ 完全未实现。`GameState.ANIMATION` 枚举已定义但无触发逻辑。酒桌物件（tileId 3/4）仅作为静态装饰，无动画交互。`sfxMatchSuccess()` 已实现但无调用入口。

**建议：** 保持 P1 优先级。`sfxMatchSuccess()` 和 `GameState.ANIMATION` 已预留，实现成本可控。

---

### [DEFER] D3：F11-F14 → P2 远期规划

| ID | 功能 | 状态 |
|----|------|------|
| F11 | 多场景切换 | ❌ 仅 1 个驿站场景，无场景管理器 |
| F12 | 角色换装 | ❌ `PLAYER_COLORS` 硬编码，无切换机制 |
| F13 | 知识库书架 | ❌ tileset 已预留 `bookshelf` 类型（tileId=10）但未放置到场景 |
| F14 | 多人同屏 | ❌ 无 WebSocket，仅本地单人 |

---

### [DEFER] D4：MENU 游戏内菜单 → P1

**PRD v0.1 状态：** 未明确规划。

**实际代码：** `GameState.MENU` 枚举已定义，但无任何入口或触发逻辑。

**建议：** 列为 P1，可在游戏内提供设置（音效开关、退出驿站等）。

---

### [DEFER] D5：foreground 遮挡层 → P2

**PRD v0.1 状态：** 未提及。

**实际代码：** 渲染管线（`render()`）仅绘制 background → objects → NPC/Player → HUD，无 foreground 层。玩家无法走到"柱子/横梁后面"。

**建议：** 列为 P2，在大场景或多物件场景中需要。

---

## 五、补充成功指标（KPI）

PRD v0.1 **未定义任何量化成功指标**。基于本产品目标（降低使用门槛、提升留存），建议补充以下 KPI：

### 北极星指标

| # | 指标 | 目标值 | 测量方式 |
|---|------|--------|----------|
| K1 | 游戏模式进入率 | 登录用户 ≥ 30% 点击"进入驿站" | `enterGameMode()` 调用计数 ÷ 登录用户数 |

### 留存指标

| # | 指标 | 目标值 | 测量方式 |
|---|------|--------|----------|
| K2 | 游戏模式平均会话时长 | ≥ 3 分钟/次 | `performance.now()` 差值（进入→退出） |
| K3 | 7 日回访率 | 进入过游戏的用户 7 日内再次进入率 ≥ 25% | localStorage 打点 |

### 转化指标

| # | 指标 | 目标值 | 测量方式 |
|---|------|--------|----------|
| K4 | 交互完成率 | ≥ 60% 进入游戏的用户至少完成 1 次 NPC/物件交互 | GameBus 事件计数 |
| K5 | AI 对话发起率 | ≥ 20% 游戏会话触发至少 1 次 CollabAI 对话 | `game:openDialog` 事件计数 |
| K6 | 需求广场浏览率 | ≥ 15% 游戏会话触发告示墙交互 | `game:openSquare` 事件计数 |
| K7 | 名片查看率 | ≥ 10% 游戏会话触发铜镜交互 | `game:openProfile` 事件计数 |

### 性能指标

| # | 指标 | 目标值 | 测量方式 |
|---|------|--------|----------|
| K8 | 帧率稳定性 | 游戏模式期间 FPS ≥ 55（95 分位） | `currentFPS` 统计上报 |
| K9 | 内存无泄漏 | 退出后 30s 内内存回落至进入前 ± 5MB | `performance.memory` 差值 |
| K10 | 精灵加载耗时 | < 500ms（含 32 帧 ImageBitmap 异步生成） | `performance.now()` 打点 |

### 体验指标

| # | 指标 | 目标值 | 测量方式 |
|---|------|--------|----------|
| K11 | 用户主观满意度 | NPS ≥ +20（游戏模式 vs 传统 UI） | 游戏内 feedback 入口点评 |

---

## 六、附录：勘误汇总表

| 编号 | 类型 | PRD 章节 | 问题摘要 |
|------|------|----------|----------|
| E01 | `[FIX]` | §2 US2/§3 F4/§4.2 | 交互键确认为 E，非 Space |
| E02 | `[FIX]` | §3 F4 | 实际仅 1 个 NPC（小二哥），侠客 P1 未实现 |
| E03 | `[FIX]` | §3 F9 | 铜镜 PRD 标 P1，实际 P0 已交付 |
| E04 | `[FIX]` | §3 F10 | 音效 PRD 标 P1，实际 P0 已交付（4 种音效） |
| E05 | `[FIX]` | §4.1 | 书架 tileset 预留但未放置；灯笼遗漏 |
| E06 | `[FIX]` | §2 US4-US5 | F7+F8 未实现，匹配链路不可走通 |
| E07 | `[FIX]` | §5.3 | 文件清单遗漏 `audio.js` |
| E08 | `[FIX]` | §5.1/§5.2 | 遗漏 GameBus 事件总线机制 |
| C01 | `[CLOSE]` | Q1 | 非默认入口，右上角按钮切换 |
| C02 | `[CLOSE]` | Q2 | 程序化绘制，零外部素材 |
| C03 | `[CLOSE]` | Q3 | P0 桌面端，移动端 P1 |
| C04 | `[CLOSE]` | Q4 | P0 单人，多人 P2 |
| C05 | `[CLOSE]` | Q5 | 侠客未实现，刷新策略待 F7 启动 |
| C06 | `[CLOSE]` | Q6 | 全屏 Canvas + DOM overlay |
| C07 | `[CLOSE]` | Q7 | 需登录，`enterGameMode()` 有检查 |
| C08 | `[CLOSE]` | Q8 | 程序绘制，OffscreenCanvas + ImageBitmap |
| A01 | `[ADD]` | 缺失 | i18n 多语言适配（zh/en/江湖彩蛋） |
| A02 | `[ADD]` | 缺失 | 键盘操作完整定义（6 键 + 滑墙/对角归一化） |
| A03 | `[ADD]` | 缺失 | HUD 交互提示气泡系统 |
| A04 | `[ADD]` | 缺失 | 游戏模式切换流程（enter/exit/resume/stop） |
| A05 | `[ADD]` | 缺失 | 音效系统完整描述（4 种 + Web Audio API） |
| A06 | `[ADD]` | 缺失 | GameBus 事件通信机制 |
| D01 | `[DEFER]` | F7 | 侠客 NPC → P1 |
| D02 | `[DEFER]` | F8 | 匹配成功动画 → P1 |
| D03 | `[DEFER]` | F11-F14 | 多场景/换装/书架/多人 → P2 |
| D04 | `[DEFER]` | 缺失 | MENU 状态 → P1 |
| D05 | `[DEFER]` | 缺失 | foreground 遮挡层 → P2 |
| K01 | `[ADD]` | 缺失 | 成功指标 KPI（11 项） |

---

*勘误文档 v1.0 · 许清楚 · 建议与 `game-prd.md` v0.1 和 `game-prd-v0.2.md` 配合阅读*
