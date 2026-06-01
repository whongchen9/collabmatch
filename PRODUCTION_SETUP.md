# CollabMatch 生产部署：短信登录 + COS 大文件

## 1. 认证（腾讯云短信）

在 [短信控制台](https://console.cloud.tencent.com/smsv2) 创建应用、签名与「登录验证码」模板，记下：

| 变量 | 说明 |
|------|------|
| `TENCENT_SMS_SECRET_ID` / `TENCENT_SMS_SECRET_KEY` | API 密钥 |
| `TENCENT_SMS_SDK_APP_ID` | 短信应用 ID |
| `TENCENT_SMS_SIGN_NAME` | 已审核签名 |
| `TENCENT_SMS_TEMPLATE_ID` | 模板 ID（变量名需含验证码，如 `code`） |

服务端环境：

```env
AUTH_MODE=production
JWT_SECRET=<至少16位随机串>
SMS_CODE_TTL_SEC=300
SMS_RESEND_INTERVAL_SEC=60
```

API：

- `GET /api/auth/config` — 前端判断是否走短信
- `POST /api/auth/sms/send` — `{ "phone": "13800138000" }`
- `POST /api/auth/login` — `{ "phone", "code" }`

开发环境可保持 `AUTH_MODE=dev` 或 `auto`（未配短信时自动用 `DEV_AUTH_CODE`，默认 `123456`）。

## 2. 文件存储（腾讯云 COS）

在 [COS 控制台](https://console.cloud.tencent.com/cos) 创建存储桶，配置 CORS（允许浏览器直传时）与私有读策略。

```env
FILE_STORAGE=cos
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=your-bucket-1250000000
COS_REGION=ap-guangzhou
COS_PREFIX=collabmatch
# 可选：CDN 域名
COS_PUBLIC_BASE_URL=
MAX_FILE_BYTES_INLINE=2097152
MAX_FILE_BYTES_COS=52428800
```

- **≤2MB** 且 `FILE_STORAGE=inline`：Base64 存 Mongo（兼容旧逻辑）
- **>2MB** 或 `FILE_STORAGE=cos/auto`（已配 COS）：`POST /api/upload` multipart，元数据入 `FileAsset`，对象在 COS
- 下载：`GET /api/files/:id`（COS 文件 302 到签名 URL）

前端：`CollabApi.uploadFile` / `uploadFileForChat`；群聊与私聊大文件自动走 multipart。

## 3. 启动检查

`npm run dev` / `node dist/index.js` 启动时会：

- `assertProductionSecrets()`：`AUTH_MODE=production` 时校验短信与 `JWT_SECRET`
- 控制台打印当前认证模式与文件存储模式

## 4. 前端登录

登录页「获取验证码」→ `CollabApi.sendSmsCode`；开发模式在 `login-hint` 显示 `devAuthCode`。

## 5. 快速验证

```bash
cd server && npm run dev
```

```bash
curl http://localhost:3001/api/auth/config
curl -X POST http://localhost:3001/api/auth/sms/send -H "Content-Type: application/json" -d "{\"phone\":\"13800000000\"}"
```

生产短信配置完成后，第二条会真实发短信；开发模式响应中带 `hint` 显示固定验证码。
