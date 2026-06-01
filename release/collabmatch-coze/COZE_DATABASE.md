# CollabMatch × Coze 数据库适配说明

Coze 部署环境内置 **PostgreSQL**（通常通过 Supabase 注入 `DATABASE_URL`）。本项目已支持在 **MongoDB（本地）** 与 **PostgreSQL（Coze）** 之间自动切换。

## 环境变量（Coze 控制台配置）

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Coze 自动注入的 `postgresql://...` 连接串（**必填**） |
| `DB_DRIVER` | 可选，设为 `postgres` 强制走 PostgreSQL |
| `USE_MEMORY_DB` | Coze 上请设为 `false` |
| `PG_SSL` | 默认 `true`；若内网库不需要 SSL 可设 `false` |
| `SEED_ON_START` | 首次部署可 `true`，写入演示账号与样例数据 |

无需再配置 `MONGODB_URI`（除非改用外部 MongoDB Atlas）。

## 本地开发（不变）

```bash
cd server
cp .env.example .env
# USE_MEMORY_DB=true，不配置 DATABASE_URL
pnpm install   # 或 npm install
pnpm run dev
```

## Coze 部署

1. 在 Coze 项目环境变量中确认已有 `DATABASE_URL`
2. 设置 `USE_MEMORY_DB=false`
3. 构建/启动仍用根目录 `.coze` 中的 `pnpm run build` / `pnpm start`
4. 首次启动日志应出现：`[db] PostgreSQL (Coze/Supabase, DATABASE_URL)`

## 实现说明

- 表结构：单表 `cm_documents`（`collection` + `id` + JSONB `doc`），与原有 Mongoose 文档结构兼容
- 业务代码仍通过 `User` / `Requirement` 等 Model 访问，无需改路由逻辑
- 本地 Mongo 与 Coze Postgres **数据不互通**；上线后数据在 Coze 库中

## 演示登录（种子数据）

`SEED_ON_START=true` 时：

- 手机：`13800000000`
- 验证码：`.env` 中 `DEV_AUTH_CODE`（默认 `123456`）
