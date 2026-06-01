# CollabMatch · Coze 部署包

本目录为可直接上传 Coze 的纯净版本（已预编译 `server/dist`，平台构建时会重新编译）。

## 快速步骤

1. 将整个 `collabmatch-coze` 目录作为项目根目录上传到 Coze
2. 在 Coze 环境变量中配置 `.env.coze.example` 中的项（尤其 `JWT_SECRET`、确认 `DATABASE_URL`）
3. 使用平台默认构建/启动（读取根目录 `.coze`）
4. 访问服务根路径 `/` 打开前端

详细说明见 `COZE_DEPLOY.md`。
