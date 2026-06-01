# CollabMatch · Coze 上线指南

本文说明如何将 **纯净部署包** 交给 Coze 平台上线。

## 一、获取部署包

在项目根目录执行：

```bash
node scripts/pack-coze-release.mjs
```

生成目录：`release/collabmatch-coze/`

将该文件夹**整体**作为 Coze 项目根目录上传（或打成 zip 后导入）。包内已包含：

| 内容 | 说明 |
|------|------|
| `index.html` / `api-bridge.js` | 前端单页 |
| `server/src` + `server/dist` | 后端源码与预编译产物 |
| `.coze` | Coze 构建/启动命令 |
| `.env.coze.example` | 环境变量清单 |
| `COZE_DATABASE.md` | PostgreSQL 适配说明 |

**不包含**：本地 `node_modules`、`.env`、各类 `fix-*.js` 开发脚本、内部 PRD 文档。

## 二、Coze 环境变量（必填/推荐）

在 Coze 控制台配置（参考 `.env.coze.example`）：

| 变量 | 值 |
|------|-----|
| `DATABASE_URL` | 平台注入的 `postgresql://...`（一般自动提供） |
| `USE_MEMORY_DB` | `false` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | **必改**：随机长字符串（≥16 位） |
| `SEED_ON_START` | 首次 `true`（写入演示账号），稳定后可 `false` |
| `PORT` | 使用平台分配的端口（若平台注入则无需手填） |

可选：

- `DOUBAO_API_KEY`：配置后 AI 走豆包，否则为内置模拟回复
- `AUTH_MODE=production` + 腾讯云短信变量：真实短信登录
- `COS_*`：大文件走对象存储

## 三、构建与启动

根目录 `.coze` 已配置：

- **构建**：`cd server && npm ci && npm run build && npm prune --omit=dev`
- **运行**：`cd server && node dist/index.js`

启动日志应出现：

```text
[db] PostgreSQL (Coze/Supabase, DATABASE_URL)
```

## 四、访问与演示账号

- 浏览器打开服务根路径 `/`（不要用 `file://` 打开 html）
- 健康检查：`GET /api/health`
- `SEED_ON_START=true` 时演示登录：
  - 手机：`13800000000`
  - 验证码：环境变量 `DEV_AUTH_CODE`（默认 `123456`，未配短信时有效）

## 五、上线后检查清单

- [ ] `/api/health` 返回 `ok: true`
- [ ] 登录、创建对话、发布需求、需求广场列表正常
- [ ] 智能匹配两种模式切换后内容即时刷新
- [ ] 生产环境已更换 `JWT_SECRET`，未提交真实密钥到仓库
- [ ] 确认未使用 `USE_MEMORY_DB=true`（Coze 上数据会丢失）

## 六、常见问题

**构建失败**  
在本地先执行 `cd server && npm run build`，修复 TypeScript 错误后再重新打包。

**页面 404**  
确保项目根目录同时存在 `index.html` 与 `server/`，且通过 Node 服务访问，而非静态托管遗漏 API。

**数据库连接失败**  
检查 `DATABASE_URL`、`PG_SSL`（内网库可试 `PG_SSL=false`）。

更多数据库细节见 [COZE_DATABASE.md](./COZE_DATABASE.md)。
