# 架构文档勘误与补充

> 审查人：高见远（架构师）
> 审查日期：2026-05-22
> 审查范围：`docs/game-architecture.md` v1.0 vs 实际交付代码 `scripts/game/*.js`
> 标记说明：`[FIX]` 错误修正 | `[ADD]` 新增内容 | `[UPDATE]` 更新内容

---

## 一、一致性检查

### [FIX] §2.2 engine.js — `destroy()` 不存在，实际为 `stopGameLoop()` / `resumeGameLoop()`

**文档描述：**
```
- destroy()    销毁引擎，清理资源
```

**实际代码：**
实际代码中**没有** `destroy()` 函数。引擎提供了两个对外接口：

```js
// engine.js L388-407
function resumeGameLoop() {  // 恢复游戏循环
  if (paused) { resume(); }
  if (!animationFrameId) {
    lastTimestamp = performance.now();
    gameLoop(performance.now());
  }
}

function stopGameLoop() {    // 停止游戏循环（退出时清理 RAF）
  pause();
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}
```

**修正建议：** 将文档中 `destroy()` 替换为 `stopGameLoop()`，并新增 `resumeGameLoop()` 说明。

---

### [FIX] §2.2 engine.js — `pause/resume()` 是全局函数，非对象方法

**文档描述（§7.5, §11.1）：**
```js
gameLoop.pause();
gameLoop.resume();
```

**实际代码：**
`pause()` 和 `resume()` 是**全局独立函数**，不是 `gameLoop` 对象的方法。`gameLoop` 本身也是一个全局函数。

```js
// engine.js L170-184
function pause() { paused = true; /* 释放按键 */ }
function resume() { paused = false; gameState = GameState.EXPLORE; /* 重置时间戳 */ }
```

**修正建议：** 文档中所有 `gameLoop.pause()` → `pause()`，`gameLoop.resume()` → `resume()`。

---

### [FIX] §4.2 输入系统 — `inputState` 缺少 `interact` 字段

**文档描述：**
```js
const inputState = {
  up: false, down: false, left: false, right: false,
  interact: false,              // ← 文档多出来的字段
  interactJustPressed: false,
};
```

**实际代码（engine.js L27-33）：**
```js
var inputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  interactJustPressed: false    // 只有这一个交互字段
};
```

**修正建议：** 删除文档中的 `interact: false` 字段。实际代码直接用 `interactJustPressed` 做边缘检测，不需要额外的持续按下标记。

---

### [FIX] §4.2 输入系统 — `keyMap` 仍使用 E 键

**文档描述：**
```
'KeyE': 'interact',
```
交互提示文本为 `"按 E 对话"`。

**实际代码（engine.js L42-52）：**
```js
var keyMap = {
  'KeyW': 'up', /*...*/
  'KeyE': 'interact'   // ← 仍然是 E 键
};
```
HUD 文本（engine.js L230）：`'按 E '`

**⚠️ 注意：** 团队报告称交付版本已将交互键改为**空格键**，但实际代码中 `keyMap` 仍然是 `'KeyE'`，HUD 提示也显示 "按 E"。此为**待确认项**——需与工程师核实最终交付版本的按键映射。

**修正建议：** 若确认空格键为最终方案，需同步修改文档 §4.1 键盘映射表、§4.2 keyMap、§4.3 "E 键交互" 标题及 HUD 文本。

---

### [FIX] §4.3 — `processInput()` 签名不匹配

**文档描述：**
```js
function processInput(inputState) { /* ... */ }
```

**实际代码（engine.js L104）：**
```js
function processInput() {   // 无参数，直接读取全局 inputState
  if (gameState !== GameState.EXPLORE) return;
  if (inputState.interactJustPressed) {
    inputState.interactJustPressed = false;
    tryInteract();
  }
}
```

**修正建议：** 文档中 `processInput(inputState)` → `processInput()`。实际代码的输入处理还增加了非 EXPLORE 态的提前返回（文档未提及）。

---

### [FIX] §4.4 Player.update() — 参数签名不一致

**文档描述：**
```js
player.update(dt, collisionMap);  // 第二个参数是 collisionMap
```

**实际代码（player.js L26）：**
```js
Player.prototype.update = function(dt, inputState) {  // 第二个参数是 inputState
  // 从 inputState 读取方向键
  // 碰撞检测通过 this._isCollidingAt() → isWalkable() 完成（全局函数）
};
```

实际设计中，碰撞检测不通过传入 `collisionMap` 参数完成，而是通过 `_isCollidingAt()` 内部调用全局 `isWalkable()` 函数（scene.js 提供）。`update()` 的第二个参数是 `inputState`，用于读取方向键状态。

**修正建议：** 文档中 `update(dt, collisionMap)` → `update(dt, inputState)`，并说明碰撞检测通过 `isWalkable()` 全局函数间接完成。

---

### [FIX] §5.3 碰撞层数据 — `collision[8][8]` 应修正为 0

**文档描述（行 728）：**
```
y=8  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1]   ← 小二哥 NPC(8)
                                        ↑ [8]=1 ❌ 错误
```

**实际代码（scene.js L75）：**
```js
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]     // y=8, col[8]=0 ✅ 已修复
```

这是 Bug #2（孤立碰撞块）和 Bug #3（NPC 出生点阻塞）的修复结果。文档中的碰撞层 ASCII 图示保留了旧数据。

**修正建议：** 将文档 §5.3 碰撞层 y=8 行 `[8]` 位置从 `1` 改为 `0`，并标注此修复。

---

### [FIX] §7.4 通信流程 — 未实现的事件

**文档描述的以下事件在代码中未实现：**
- `GameBus.emit('game:resume')` / `GameBus.on('game:resume')`
- `GameBus.emit('game:overlayClosed')` / `GameBus.on('game:overlayClosed')`
- `GameBus.emit('game:sendInvite')` / `GameBus.on('game:sendInvite')`
- `GameBus.emit('game:matchSuccess')` / `GameBus.on('game:matchSuccess')`

**实际代码中实现的事件：**
- `game:openDialog` — 打开 NPC 对话
- `game:openSquare` — 打开需求广场
- `game:openProfile` — 打开个人名片

匹配成功流程、邀请流程、弹窗关闭回调等均为**远期规划，P0 未实现**。

**修正建议：** 在文档中标注未实现的事件为"P1 规划"或"待实现"。

---

### [FIX] §8.7 + sprites.js — `OffscreenCanvas.transferToImageBitmap()` 兼容性

**文档描述（行 1314）与实际代码（sprites.js L344）：**
```js
return canvas.transferToImageBitmap();
```

**分析：** `OffscreenCanvas.transferToImageBitmap()` 是一个**有效的标准 API**（Chrome 69+, Firefox 105+, Safari 16.4+, Edge 79+），文档对此 API 的使用是**正确的**。但需注意：

1. **该方法会"转移"画布所有权**——调用后原 `OffscreenCanvas` 的 `width`/`height` 变为 0，不可再绘制。代码中每次调用 `createTileSprite()` 都新建 `OffscreenCanvas`，用完即转移，此用法安全。
2. **`createPlayerSprite()` 中使用了不同的 API**——`createImageBitmap(canvas)`（异步，不转移所有权），因为同一个 `OffscreenCanvas` 被复用来绘制 32 帧，不能每次调用后转移。

**修正建议：** 在文档中补充说明两种 API 的使用场景差异，并添加浏览器兼容性注意事项。

---

### [FIX] §2.2 scene.js — `renderLayer()` 签名不匹配

**文档描述：**
```js
renderLayer(ctx, layer)  // 2 个参数
```

**实际代码（scene.js L190）：**
```js
function renderLayer(ctx, layerName, scene)  // 3 个参数
```

第三个参数 `scene` 用于读取预渲染的 `bgCanvas` / `objCanvas`。

---

### [FIX] §9.1 场景数据 — objects 层缺少灯笼

**文档 objects 层（行 1350-1351）：**
```
y=1  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]  ← 无灯笼
y=2  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]  ← 无灯笼
```

**实际代码（scene.js L50-51）：**
```js
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0],  // y=1, col[14]=9 灯笼
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,0,0],  // y=2, col[14]=9 灯笼
```

实际交付版本在场景中增加了灯笼装饰物件。

---

### [FIX] §3.1 渲染管线 — foreground 层未实现

**文档描述：**
```
第 4 层: 前景层 (foreground)
  └── 遮挡物件 (柱子/横梁/门口帘布)
```

**实际代码（engine.js L187-207）：**
```js
function render() {
  renderLayer(gameCtx, 'background', scene);  // Layer 0
  renderLayer(gameCtx, 'objects', scene);     // Layer 1
  // NPC + Player                           // Layer 2-3
  renderHUD();                                // Layer 5
  // ❌ 无 foreground 层
}
```

前景遮挡层在 P0 版本中未实现。

---

### [FIX] §6.5 — `PlayerState` 枚举未在代码中使用

**文档描述：**
```js
const PlayerState = { IDLE: 'idle', WALKING: 'walking' };
```

**实际代码：** 直接使用字符串字面量 `'idle'` / `'walking'`，未定义枚举常量。

---

### [FIX] §2.2 npc.js — `getAction()` 方法不存在

**文档列出的方法：**
```
- getAction()    返回触发动作名
```

**实际 npc.js：** 没有 `getAction()` 方法。`action` 作为属性存储在 `this.action` 上，由 `engine.js` 的 `triggerNPCInteraction()` 直接读取 `npc.action`。

---

### [FIX] §2.2 npc.js — 侠客(hero) NPC 特殊逻辑未实现

**文档描述：**
```
侠客 NPC 特殊逻辑：
- spawnTimer: 出现倒计时
- matchedUserId: 关联匹配用户 ID
- 刷新逻辑: 进入场景时检查 API
```

**实际 npc.js：** 仅实现了基础 NPC 类（呼吸动画 + 方向随机切换）。侠客(hero)类型的动态生成、定时消失、API 关联等逻辑均未实现。P0 交付中只有一个 `waiter` 类型 NPC。

---

### [FIX] §2.2 Player — 构造函数缺少 sprite 参数

**文档描述：**
```js
constructor(spawnX, spawnY)  // 2 个参数
```

**实际代码（player.js L9）：**
```js
function Player(spawnX, spawnY, sprite)  // 3 个参数，sprite 在构造时注入
```

精灵表通过构造函数注入，而非在 Player 内部创建。这体现了依赖注入模式。

---

### [FIX] §9.2 场景加载 — tile 跳过条件差异

**文档描述（行 1458）：**
```js
if (tileId !== 0) {
  bgCtx.drawImage(tileSprites[tileId], x * TILE_SIZE, y * TILE_SIZE);
}
```

**实际代码（scene.js L148）：**
```js
if (tileSprites[tileId]) {
  bgCtx.drawImage(tileSprites[tileId], x * TILE_SIZE, y * TILE_SIZE);
}
```

这是 Bug #1（地板透明）的修复：文档的 `!== 0` 条件会跳过 `tileId=0`（木地板），导致背景层地板不可见。实际代码改为 `tileSprites[tileId]` 存在性检查——因为 `tileSprites['0']` 是存在的（木地板精灵已被创建），所以能正确渲染。

---

## 二、交付后补充

### [ADD] §2.5 代码风格差异说明

实际交付代码全部使用 **ES5 风格**（与现有系统保持一致），与文档中的 ES6+ 伪代码有显著差异：

| 项目 | 文档（伪代码） | 实际代码 |
|------|--------------|----------|
| 变量声明 | `const`/`let` | `var` |
| 类定义 | `class Player {}` | `function Player()` + `prototype` |
| 函数定义 | 箭头函数 | `function` 声明 |
| 字符串拼接 | 模板字面量 | `+` 拼接 |

这属于**实现细节差异**，不影响功能和架构设计，但文档读者应注意代码风格转换。

---

### [ADD] §4.5 真实交互流程补充

实际 engine.js 中的交互流程比文档描述的更完整：

**交互目标检测顺序（在 engine.js 的 `tryInteract()` 中）：**

1. 调用 `getNearbyInteractTarget(player.x, player.y, npcs)` 获取最近目标
2. 若目标是 NPC → `triggerNPCInteraction()` → 发出 `game:openDialog` 事件
3. 若目标是 interactable → 遍历 `scene.interactables` 再次确认距离 → `triggerObjectInteraction()`
4. 根据 `obj.action` 分别发出 `game:openSquare` 或 `game:openProfile`

**HUD 提示（`renderHUD()`）：**
- 检测 2 tile 内的 NPC/交互点
- 绘制圆角气泡 + "按 E 对话"/"按 E 查看" 文本
- 气泡有屏幕边缘裁剪保护
- 交互提示音（`sfxInteract()`）当前被注释掉，标注"可能太频繁，先关闭"

---

### [ADD] §4.6 IIFE 闭包修复（Bug #4）

**问题根因：** 在 `initGame()` 中，使用 `for` 循环创建 NPC Promise 时，循环变量 `npcData` 被 `var` 声明提升到函数作用域，导致所有 `then` 回调共享同一个变量引用（最终值 = 最后一个 NPC 的数据）。

**修复方案（engine.js L348-364）：**
```js
for (var i = 0; i < scene.npcs.length; i++) {
  var npcData = scene.npcs[i];
  (function(npcData) {           // ← IIFE 捕获当前值
    npcPromises.push(
      createNPCSprite(npcData.type).then(function(sprite) {
        return new NPC({
          id: npcData.id,        // 现在引用的是 IIFE 参数，非循环变量
          x: npcData.x,
          // ...
        });
      })
    );
  })(npcData);                   // ← 立即执行，传入当前值
}
```

**教训：** 即使在 ES5 代码中，`for` 循环内创建异步回调时，务必用 IIFE 或 `Array.forEach()` 隔离作用域。若项目升级到 ES6+，`let` 的块级作用域可从根本上解决此问题。

---

### [ADD] §7.7 stopGameLoop / resumeGameLoop 设计

**对外接口：**

| 函数 | 用途 | 调用时机 |
|------|------|----------|
| `stopGameLoop()` | 暂停游戏 + 取消 RAF | `exitGameMode()` 退出驿站 |
| `resumeGameLoop()` | 恢复暂停 + 重启 RAF | `enterGameMode()` 进入驿站（非首次） |

**设计要点：**
- `stopGameLoop()` 调用 `cancelAnimationFrame()` **主动取消** RAF，释放 GPU 资源（Bug #5 修复）
- `resumeGameLoop()` 在 `animationFrameId` 为 null 时**重新启动** `gameLoop()`
- `pause()` 仅设置 `paused = true`，**不清除** `animationFrameId`——这样在 DIALOG 状态下循环仍在运行（每一帧 return），便于恢复时无需重启

**状态流转：**
```
ENTER_GAME → initGame() → gameLoop() 启动
  ├── 打开弹窗 → pause() → paused=true (RAF 继续但 return)
  ├── 关闭弹窗 → resume() → paused=false
  └── 退出游戏 → stopGameLoop() → paused=true + cancelAnimationFrame
       └── 再次进入 → resumeGameLoop() → resume() + gameLoop() 重启
```

---

### [ADD] §12 性能数据（待实测）

当前架构文档中**没有实际运行性能数据**。以下为测量建议：

#### 测量方法

| 指标 | 测量工具 | 测量步骤 |
|------|---------|----------|
| FPS | `__DEBUG_GAME__ = true` | 在控制台执行 `__DEBUG_GAME__ = true`，每秒输出 FPS |
| 主循环耗时 | `performance.now()` 打点 | 在 `gameLoop()` 开头和末尾插桩 |
| 内存占用 | Chrome DevTools → Memory | 进入游戏模式 → 录制堆快照 → 查看 Canvas/ImageBitmap 内存 |
| 首次交互时间 | Performance.now() + 手动 | 从 `enterGameMode()` 调用到精灵加载完成的时间差 |
| 渲染耗时 | `ctx.measureTime` 或手动打点 | 在 `render()` 函数中计时各层渲染耗时 |
| Canvas 显存 | `chrome://gpu` | 查看 Canvas 资源占用 |

#### 预期性能基线（设计值，待实测验证）

| 指标 | 设计预期 | 实际值 |
|------|---------|--------|
| 稳定 FPS | 60fps（桌面Chrome） | **待实测** |
| 精灵加载耗时 | < 200ms（32帧 ImageBitmap） | **待实测** |
| 单帧渲染耗时 | < 4ms | **待实测** |
| 内存增量 | < 10MB（游戏层） | **待实测** |
| 游戏 JS 总大小 | ~13KB（6 文件合计） | **待实测** |

---

### [ADD] §13 已知限制

本节列出 P0 版本的已知技术限制和未实现特性。

#### 13.1 功能限制

| 限制 | 影响 | 计划 |
|------|------|------|
| 仅 1 个场景（20×15） | 无场景切换/过渡 | P2 扩展 |
| 仅 1 个 NPC（小二哥） | 缺少侠客匹配 NPC | P1 补充动态 NPC 系统 |
| 无摄像机系统 | 场景不可超过 640×480 | P2 |
| 不支持移动端 | 无虚拟摇杆/触屏输入 | P1 |
| 无游戏内菜单（MENU 状态） | `GameState.MENU` 定义但无入口 | P1 |
| 匹配成功动画（ANIMATION 状态）未实现 | 无入座/庆祝动画 | P2 |
| foreground 遮挡层未渲染 | 玩家无法"走到柱子后面" | P2 |
| 整数倍缩放模式未启用 | 当前使用 CSS 100vw×100vh 拉伸 | P1 可选 |

#### 13.2 技术限制

| 限制 | 说明 |
|------|------|
| `OffscreenCanvas.transferToImageBitmap()` | Firefox < 105、Safari < 16.4 不支持；需降级为 `createImageBitmap()` |
| `ImageBitmap` 不可序列化 | 无法缓存到 localStorage，每次进入需重新生成精灵 |
| 全局变量污染 | ES5 `var` 声明，所有游戏变量在 `window` 作用域 |
| 无模块系统 | 依赖 `<script>` 标签加载顺序，不可 tree-shaking |
| 音效需用户交互后初始化 | `AudioContext` 自动播放策略限制，`initAudio()` 需在 click/keydown 中调用 |
| 碰撞检测仅 tile 级 | 不支持像素级碰撞，角色必须在 tile grid 内移动 |

#### 13.3 未实现的文档设计

| 文档章节 | 未实现内容 |
|----------|-----------|
| §2.2 npc.js | 侠客 NPC（hero 类型、spawnTimer、API 关联） |
| §2.2 npc.js | `getAction()` 方法 |
| §3.1 | foreground 遮挡层 |
| §3.3 | 摄像机系统 |
| §6 | MENU 状态、ANIMATION 状态的实际触发和使用 |
| §7.4 | 匹配成功动画通信流程（`game:sendInvite`、`game:matchSuccess`） |
| §7.6 | 铜镜→Profile、侠客→匹配卡片 的 overlay 复用 |
| §9.3 | 可视化 tile 编辑器（P1） |
| §11.3 | `renderTarget` 全局标志和 `getContentContainer()` |

---

### [ADD] §14 开发教训

从 P0 交付过程中的 5 个 P1 级 Bug 修复总结的关键经验。

#### 教训 1：tileId 0 不等于"无 tile"

**Bug #1（地板透明）** 揭示了：在 tile map 设计中，`tileId = 0` 通常是有意义的 tile（例如木地板），不能用作 "空" 的哨兵值。应使用**显式的存在性检查**（`tileSprites[tileId]`）而非 `!== 0` 判断。

> **规则：** 在 tile map 系统中，永远不要假设 tileId=0 是"空"。要么用 `null`/`undefined` 表示空位，要么用 `tileset` 的 key 存在性来判断。

#### 教训 2：碰撞数据人工编排容易出错

**Bug #2（孤立碰撞块 [#8][8]=1）** 说明手工编写 20×15 的二维碰撞数组容易产生笔误，尤其当 tile map 层和 collision 层不在同一视觉上下文中编排时。

> **建议：** P1 阶段应编写简单的碰撞数据验证脚本（检查孤立的 1 值、检查 NPC/出生点是否在碰撞块上），或使用可视化编辑器。

#### 教训 3：NPC 出生点与碰撞数据的一致性

**Bug #3（NPC 出生在碰撞块上）** 本质是 Bug #2 的连锁反应——当碰撞数据有误时，NPC 放置位置不会自动检测合法性。

> **规则：** 场景加载时应做合理性校验：验证所有 NPC 出生点和 `spawnPoint` 是否在 `isWalkable()` 区域。

#### 教训 4：ES5 循环中异步回调的闭包陷阱

**Bug #4（闭包变量共享）** 是经典 JavaScript 问题：`var` 声明被提升到函数作用域，循环内异步回调引用的是同一个变量。

> **规则：** ES5 中 `for` 循环创建异步回调时，**必须**使用 IIFE 包装。如果项目迁移到 ES6+，优先使用 `let` 声明（块级作用域）或 `Array.forEach()`。

#### 教训 5：requestAnimationFrame 的生命周期管理

**Bug #5（RAF 内存泄漏）** 说明 `pause()` 仅设置标志位是不够的——`requestAnimationFrame` 回调仍被浏览器调度，Canvas 不可见时 GPU 资源仍然占用。

> **规则：** 对于需要完全退出的游戏模式（如切回普通 UI），必须调用 `cancelAnimationFrame()` 彻底停止渲染管线。`pause()` 仅适用于临时暂停（如打开弹窗）。

---

## 三、附录：勘误汇总表

| 编号 | 章节 | 类型 | 问题摘要 |
|------|------|------|----------|
| E01 | §2.2 engine.js | [FIX] | `destroy()` → `stopGameLoop()` / `resumeGameLoop()` |
| E02 | §7.5, §11.1 | [FIX] | `gameLoop.pause/resume()` → 全局函数 `pause()`/`resume()` |
| E03 | §4.2 | [FIX] | `inputState.interact` 字段不存在 |
| E04 | §4.1-4.3 | [FIX] | 交互键实际仍为 E（需确认是否为空格键） |
| E05 | §4.3 | [FIX] | `processInput(inputState)` → `processInput()` 无参数 |
| E06 | §4.4 | [FIX] | `player.update(dt, collisionMap)` → `update(dt, inputState)` |
| E07 | §5.3 | [FIX] | 碰撞层 `collision[8][8]` = 1 → 0 |
| E08 | §7.4 | [FIX] | 4 个 GameBus 事件未实现 |
| E09 | §8.7 | [FIX] | `transferToImageBitmap()` 在 OffscreenCanvas 上的兼容性说明 |
| E10 | §2.2 scene.js | [FIX] | `renderLayer(ctx, layer)` → `renderLayer(ctx, layerName, scene)` |
| E11 | §9.1 | [FIX] | objects 层缺少灯笼 tile |
| E12 | §3.1 | [FIX] | foreground 层未实现 |
| E13 | §6.5 | [FIX] | `PlayerState` 枚举未使用 |
| E14 | §2.2 npc.js | [FIX] | `getAction()` 不存在；hero NPC 逻辑未实现 |
| E15 | §2.2 Player | [FIX] | 构造函数缺 sprite 参数 |
| E16 | §9.2 | [FIX] | `tileId !== 0` → `tileSprites[tileId]` 存在性检查 |
| A01 | §2.5 | [ADD] | 代码风格差异说明（ES5 vs ES6+） |
| A02 | §4.5 | [ADD] | 真实交互流程补充 |
| A03 | §4.6 | [ADD] | IIFE 闭包修复（Bug #4） |
| A04 | §7.7 | [ADD] | stopGameLoop / resumeGameLoop 设计 |
| A05 | §12 | [ADD] | 性能数据（待实测）+ 测量建议 |
| A06 | §13 | [ADD] | 已知限制章节 |
| A07 | §14 | [ADD] | 开发教训章节 |

---

*勘误文档 v1.0 · 高见远 · 建议与原架构文档配合阅读*
