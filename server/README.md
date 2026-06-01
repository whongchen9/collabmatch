# CollabMatch API

Express + TypeScript 后端，对接 `../index.html` 前端原型。支持 **MongoDB**（本地开发）与 **PostgreSQL**（Coze 平台内置库 / Supabase）。

## 快速开始

```bash
cd server
cp .env.example .env
npm install
# 默认 USE_MEMORY_DB=true，无需安装 MongoDB 即可开发
# Coze 部署：配置 DATABASE_URL（postgresql://...），无需 MongoDB
# 自建生产：USE_MEMORY_DB=false + MONGODB_URI 或 DATABASE_URL
npm run dev
```

服务地址：`http://localhost:3001`

### 演示登录

首次启动会自动写入演示数据（`SEED_ON_START=true`）：

- 手机号：`13800000000`
- 验证码：`.env` 中 `DEV_AUTH_CODE`（默认 `123456`），或前端点击「获取验证码」

```bash
curl http://localhost:3001/api/auth/config
curl -X POST http://localhost:3001/api/auth/sms/send \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"13800000000\"}"
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"13800000000\",\"code\":\"123456\"}"
```

生产环境短信 + COS 配置见项目根目录 **`PRODUCTION_SETUP.md`**。

## API 一览

| 模块 | 前缀 |
|------|------|
| 认证 | `/api/auth`（`config`、`sms/send`、`login`） |
| 文件上传 | `POST /api/upload`（multipart，COS/内联） |
| 文件下载 | `GET /api/files/:id` |
| 用户 | `/api/users` |
| 需求 | `/api/requirements` |
| 匹配 | `/api/match` |
| 对话 | `/api/conversations` |
| AI | `/api/ai` |
| 群组 | `/api/groups` |
| 配置 | `/api/config` |
| 技能市场 | `/api/skills/market` |
| 已安装技能 | `GET/POST /api/users/me/skills`（skillIds） |
| 工作流 | `GET /api/workflows`（登录后含自定义）、`POST /api/workflows/run` |
| 自定义技能 | `GET/POST /api/user-skills`、`DELETE /api/user-skills/:skillId` |
| 自定义工作流 | `GET/POST /api/user-workflows`、`DELETE /api/user-workflows/:workflowId` |
| 参与申请 | `PUT /apply`、`GET/PUT .../applications`（发布者审批） |
| 作品集 | `GET/POST/PUT/DELETE /api/users/me/portfolio` |
| AI 完善名片 | `POST /api/users/me/ai-enhance-profile` |
| 技能详情 | `GET /api/skills/:skillId` |

详细契约见项目根目录 `BACKEND_SPEC.md`。

### 自定义技能 / 工作流

```bash
# 创建自定义技能（自动加入 skillIds）
curl -X POST http://localhost:3001/api/user-skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"我的技能","instruct":"请根据上下文…","desktop":"简短描述"}'

# 创建自定义工作流
curl -X POST http://localhost:3001/api/user-workflows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"我的流程","steps":[{"skillId":"generate_prd","title":"整理需求"}]}'
```

## AI 模式

- **未配置** `DOUBAO_API_KEY`：使用与前端原型一致的本地模拟逻辑；`POST /api/ai/chat` 仍以 SSE 分块返回。
- **已配置**：调用火山方舟豆包 API；流式聊天走真实 SSE。

## 环境变量

见 `.env.example`。

## 生产构建

```bash
npm run build
npm start
```
