# 后端闭环完成说明（P0–P2）

与 `FRONTEND_PREP.md` 配套；前端就绪后，下列接口均已实现。

## 文件与上传

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/files/:fileId` | 下载文件（需登录且有群/对话权限） |
| POST | `/api/groups/:id/messages` | body 增加 `fileData`（Data URL base64），存库并返回 `fileUrl` |
| POST | `/api/conversations/:id/attachments` | 对话区发文件 `{ fileName, fileData }` |

限制：单文件最大 **2MB**（`fileStorage` 服务内校验）。

## 对话

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/conversations/:id/forward` | `{ messageIndex, targetConversationId? }` 转发消息 |
| DELETE | `/api/conversations/:id` | 删除对话 |

## 群组

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/groups/create` | 手动建群 `{ name, reqId?, memberIds? }` |
| POST | `/api/groups/:id/meeting` | 创建 Jitsi 会议链接并写入群消息 |

## 用户在线

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/users/me/presence` | 心跳；`User.lastSeenAt` 5 分钟内为 `online: true` |
| — | 任意鉴权请求 | 自动刷新 `lastSeenAt` |

## 工作流

- 内置 `wf1` 增加步骤 **`match_forward`**（真实调用匹配算法，结果写入对话）。
- 自定义工作流步骤可传 `action: "match_forward" | "match_reverse"`。
- 特殊 skillId：`__action_match_forward__` / `__action_match_reverse__`。

## 需求

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/requirements/mine` | 每条带 `pendingApplicationCount` |
| DELETE | `/api/requirements/:id` | 作者删除需求 |

## 已有能力（前序迭代）

- 申请列表 / 审批、`inviteMessage`、Portfolio、AI 完善名片、`protoCard`（generate_ui）、技能详情、安装量统计等。

## 启动

```bash
cd server && npm run dev
```

`express.json` 上限已调至 **12mb** 以支持 base64 文件。
