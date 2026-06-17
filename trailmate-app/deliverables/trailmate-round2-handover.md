# TrailMate 徒步助手 — Round 2 交接文档

**日期**: 2026-06-14  
**状态**: ✅ 全部完成  
**构建**: TypeScript 0 错误 · Vite 生产构建 976KB JS + 52KB CSS  
**Git**: 4 个提交，工作区干净

---

## 一、变更总览

| # | 功能 | 级别 | 涉及文件 | 状态 |
|---|------|------|---------|------|
| 1 | GPS 路线记录与实时轨迹 | P0 | types, store, utils, LocationMap, TeamChat, HikeLog (6) | ✅ |
| 2 | 全站暗色模式 | P0 | 14 个 TSX + index.css | ✅ |
| 3 | 通知开关持久化 | P1 | Settings.tsx | ✅ |
| 4 | 访客模式优化 | P1 | Login.tsx, App.tsx, store | ✅ |
| 5 | 反馈表单错误降级 | P1 | Feedback.tsx | ✅ |
| 6 | Empty 空态组件 | P2 | Empty.tsx, Teams, Notices, HikeLog | ✅ |

---

## 二、详细说明

### 1. GPS 路线记录与实时轨迹

**文件与改动**:

| 文件 | 改动内容 |
|------|---------|
| `src/types/index.ts` | TrailLog 新增 `track: {lat, lng, timestamp}[]`、`totalDistance`、`movingDuration`、`avgPace` |
| `src/lib/utils.ts` | 新增 `haversineDistance(lat1, lng1, lat2, lng2): number` 哈弗辛公式 |
| `src/store/index.ts` | 新增 `track: GpsPoint[]` 状态、`addTrackPoint(pt)`、`clearTrack()` action |
| `src/pages/LocationMap.tsx` | hiking 状态 → 15s 间隔 `watchPosition` 采集 GPS → `addTrackPoint` → Leaflet Polyline 渲染蓝色半透明轨迹线 |
| `src/pages/TeamChat.tsx` | 完成征途弹窗新增轨迹统计区域（里程 km / 时长 min / 配速 'XX"）；完成时 `doComplete()` 计算并存入 TrailLog → `clearTrack()` |
| `src/pages/HikeLog.tsx` | 展开含 `track` 日志时渲染 200px 迷你 Leaflet Map + 轨迹统计行 |

**数据流**:
```
LocationMap GPS (15s轮询)
  → addTrackPoint() → store.track[]
  → 队长点"完成征途"
  → TeamChat 计算: haversineDistance 累加 → totalDistance/movingDuration/avgPace
  → traillogsApi.generateForUser({track, totalDistance, movingDuration, avgPace})
  → clearTrack() 清零
  → HikeLog 回顾: 迷你地图 + 统计
```

---

### 2. 全站暗色模式

**机制**: Tailwind `dark:` class 变体 + `darkMode: 'class'` 配置。`useTheme()` hook 管理 `document.documentElement` class 切换。

**覆盖文件与 dark: 类数量**:

| 文件 | dark: 数 | 关键映射 |
|------|---------|---------|
| `TeamChat.tsx` | 122 | 页面 bg→gray-950, 聊天气泡→gray-800/700 |
| `Settings.tsx` | 66 | 卡片→gray-800, 输入→gray-700 |
| `Profile.tsx` | 61 | 头像区→gray-900, 表单→gray-800 |
| `HikeLog.tsx` | 49 | 日志卡片→gray-800, 筛选→gray-900 |
| `LocationMap.tsx` | 41 | 信息面板→gray-800/900, 弹窗→gray-900 |
| `Notices.tsx` | 37 | 通知卡片→gray-800, 彩色条→900/30 |
| `Home.tsx` | 31 | 卡片→gray-800, 输入→gray-700 |
| `Login.tsx` | 24 | 表单→gray-800, 渐变→dark变体 |
| `PrivacyPolicy.tsx` | 24 | 内容区→gray-800 |
| `Feedback.tsx` | 15 | 表单→gray-800, 输入→gray-700 |
| `Teams.tsx` | 8 | 头部→gray-900, 卡片→gray-800 |
| `Empty.tsx` | 4 | 文字/图标→gray-400/600 |
| `TabBar.tsx` | 2 | 导航栏→gray-900 |
| `App.tsx` | 2 | Toast 阴影 |

**颜色映射规范**:

| 浅色 | 暗色 | 用途 |
|------|------|------|
| `bg-white` | `dark:bg-gray-900` | 页面头部/主容器 |
| `bg-white` | `dark:bg-gray-800` | 卡片面板 |
| `bg-gray-50` | `dark:bg-gray-950` | 页面背景 |
| `bg-gray-50` | `dark:bg-gray-800/50` | 输入框/灰色区域 |
| `text-gray-800` | `dark:text-gray-100` | 主标题 |
| `text-gray-600/700` | `dark:text-gray-300` | 正文 |
| `text-gray-400/500` | `dark:text-gray-400` | 辅助文字 |
| `border-gray-100/200` | `dark:border-gray-700/800` | 边框/分割线 |
| `bg-green-50` | `dark:bg-green-900/30` | 绿色色调保持 |

**去重**: 并行开发导致多处 dark: 类重复/冲突，已通过自动化脚本修复，零残留。

---

### 3. 通知开关持久化

**文件**: `src/pages/Settings.tsx`

- 开关 `notifyMatch`、`notifyTeam`、`notifyChat` 从 `localStorage key: "trailmate_notify"` 初始化
- 变更时 `useEffect` 写入 `localStorage` + 异步 `usersApi.updateSettings()`
- 后端失败静默降级（localStorage 作主数据源）

---

### 4. 访客模式优化

**文件**: `src/pages/Login.tsx`、`src/App.tsx`、`src/store/index.ts`

| 改动 | 说明 |
|------|------|
| 移除硬编码 | 不再使用 `guest@trailmate.app / guest123` |
| 本地访客 | `token = "guest_" + timestamp + "_" + random`，用户名 `"访客" + 4位随机字符` |
| 存储标记 | `localStorage.setItem('trailmate_guest', JSON.stringify(guestUser))` |
| 认证跳过 | `App.tsx AuthGuard` 检测 `trailmate_guest` → 跳过 `loadAll()` API 调用 |
| 退出清理 | `store.logout()` 中 `localStorage.removeItem('trailmate_guest')` + `track: []` |
| 用户提示 | Toast: "正在使用访客模式，数据仅保存在本地" |

---

### 5. 反馈表单错误降级

**文件**: `src/pages/Feedback.tsx`

- API 成功 → toast "感谢您的反馈！"
- API 失败 → 降级 `localStorage` 存储（key: `"trailmate_feedback"`）→ toast "反馈已保存到本地，联网后将自动同步"
- 外层异常 → toast err.message 或 "提交失败，请重试"

---

### 6. Empty 空态组件

**文件**: `src/components/Empty.tsx`

**Props**:
| 属性 | 类型 | 默认值 |
|------|------|--------|
| `icon` | `LucideIcon` | `PackageOpen` |
| `title` | `string` | `"暂无数据"` |
| `description` | `string` | - |
| `action` | `{ label, onClick }` | - |

**应用**:
- `Teams.tsx`: 无队伍 → `<Empty icon={Users} title="还没有加入任何队伍" action="去匹配队友" />`
- `Notices.tsx`: 无通知 → `<Empty icon={Bell} title="暂无匹配通知" action="去匹配队友" />`
- `HikeLog.tsx`: 无日志 → `<Empty icon={MapPin} title="2026年暂无活动记录" />`

---

## 三、文件清单（21 个源文件改动）

### 新增
- `src/lib/utils.ts` — `haversineDistance()` 函数

### 修改
```
src/types/index.ts          — TrailLog 扩展 (track 字段)
src/store/index.ts          — track 状态 + addTrackPoint + clearTrack
src/api/index.ts            — 已有 usersApi.getSettings/updateSettings (无需改动)
src/App.tsx                 — AuthGuard guest 检测 + dark: 类
src/index.css               — body dark 背景
src/components/Empty.tsx    — Props 接口增强
src/components/TabBar.tsx   — dark: 类
src/pages/Login.tsx         — 访客模式重写 + dark: 类
src/pages/Home.tsx          — dark: 类
src/pages/Teams.tsx         — Empty 应用 + dark: 类
src/pages/TeamChat.tsx      — GPS 完成流程 + dark: 类
src/pages/Profile.tsx       — dark: 类
src/pages/Notices.tsx       — Empty 应用 + dark: 类
src/pages/Settings.tsx      — 通知持久化 + dark: 类
src/pages/HikeLog.tsx       — 轨迹回顾 + Empty 应用 + dark: 类
src/pages/LocationMap.tsx   — GPS 采集 + Polyline 轨迹 + dark: 类
src/pages/PrivacyPolicy.tsx — dark: 类
src/pages/Feedback.tsx      — 错误降级 + dark: 类
```

---

## 四、验证结果

```
✅ TypeScript 编译 : tsc --noEmit — 0 errors
✅ Vite 生产构建  : 976KB JS (gzip 200KB) + 52KB CSS (gzip 13KB)
✅ dark: 类去重   : 零重复，零语法错误
✅ Git 状态       : 干净工作区，4 个提交
```

---

## 五、给接手者的提示

1. **启动**: `npm install && npm run dev`
2. **无真实后端**: API 调用会 404，访客模式绕过所有 API（关键路径全降级覆盖）
3. **GPS 轨迹**: 仅 hiking 状态采集，`track[]` 敏感数据在 logout/complete 时清除
4. **暗色模式切换**: Settings 页面 <kbd>暗色模式</kbd> 开关，Tailwind `dark:` 驱动
5. **下一步可做**: 代码分割（当前单 chunk 976KB）、PWA 离线支持、E2E 测试、后端对接
