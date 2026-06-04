# CollabMatch 改动交接（2026-06-03 ~ 2026-06-04）

## 一、远程仓库状态

| 状态 | 说明 |
|------|------|
| 本地分支 | `master`，领先 `origin/master` 3 个 commit |
| 远程 | 未推送（当前环境无法连接 GitHub），需在本地执行 `git push origin master` |

## 二、未推送的 Commit

| Hash | 说明 |
|------|------|
| `cac950d` | fix: CloudBase API 路由修复 + 登录关闭按钮移除 |
| `70af613` | fix: 回退 api-bridge.js API 路径 |
| `f378258` | feat: 多领域扩展 + 需求广场筛选重构 + UI优化 |

共 39 个文件，+1900 / -319 行。

---

## 三、核心改动清单

### 1. 多领域扩展（`index.html` + `cloudfunctions/collabmatch-api/index.js`）

新增 2 个非技术领域，从 5 个扩展到 7 个：

| 领域 | Key | 图标 |
|------|-----|------|
| 技术开发 | `tech` | 💻 |
| 创意设计 | `design` | 🎨 |
| 内容创作 | `content` | 📝 |
| 教育培训 | `education` | 🎓 |
| 商业合作 | `business` | 📈 |
| **餐饮美食** | `food` | 🧋 |
| **本地服务** | `service` | 🏠 |

每个领域有独立的 `sceneTags`、`skills`、`templates`、`chatIntro`，以及领域-技能映射 `DOMAIN_SKILL_MAP`。

### 2. 需求广场重构（`index.html`）

- 移除 max-width 限制，全宽布局
- 新增搜索入口
- 筛选栏重构：领域下拉 + 场景标签 + 可投入时间
- 新增 `loadSquareRequirements` API 支持后端筛选

### 3. CloudBase 部署修复（`api-bridge.js` + `index.html`）

**问题**：线上 API 请求发到静态托管域名 `tcloudbaseapp.com`，而不是 HTTP 访问服务域名。

**修复**：
- `index.html` 添加 `window.COLLABMATCH_API` 全局变量，指向 `https://cloudbase-d6g8yog0ub3e56efe-1427257718.ap-shanghai.app.tcloudbase.com/collabmatch/api`
- `api-bridge.js` 添加 `tcloudbaseapp.com` 域名自动识别，回退到 HTTP 访问服务域名

### 4. 云函数新增（`cloudfunctions/collabmatch-api/index.js`）

全新 CloudBase 云函数，包含完整的 API 路由：

- **认证**：`/api/auth/login`、`/api/auth/me`、`/api/auth/config`
- **配置**：`/api/config/domains`、`/api/config/skills`、`/api/config/workflows`
- **需求**：CRUD + 发布/申请/审核
- **匹配**：正向/反向智能匹配
- **群组**：创建/消息/会议
- **对话**：AI 对话（模拟回复）
- **技能市场**：安装/卸载
- **文件上传**：inline 模式（≤2MB）

**关键配置**：
- `DEV_AUTH_CODE` = `xsx7ii`（固定验证码，避免冷启动随机生成）
- `JWT_SECRET` 有默认值
- 路径归一化：自动补回 `/api` 前缀

### 5. UI/UX 优化（`index.html`）

- 个人名片编辑模式（`toggleProfileEdit`）
- 资源卡片就地编辑（`editResource`、`saveResource`）
- 作品集空状态 CTA 引导
- 资源删除确认弹窗
- 登录页面关闭按钮已移除（防止未登录绕过）

### 6. 后端增强（`server/` 目录）

- 新增 `middleware/validate.ts` 请求校验中间件
- 需求编辑/删除 API
- 群组增强（创建群组、会议链接）
- 申请审核流程
- 错误处理改进

### 7. 文档（`docs/`）

- `system_design.md`：系统设计文档（300 行）
- `class-diagram.mermaid`：类图
- `sequence-diagram.mermaid`：时序图

---

## 四、部署信息

| 项目 | 值 |
|------|-----|
| 静态托管 | `https://cloudbase-d6g8yog0ub3e56efe-1427257718.tcloudbaseapp.com` |
| 页面入口 | `/dist/index.html` |
| HTTP 访问服务 | `https://cloudbase-d6g8yog0ub3e56efe-1427257718.ap-shanghai.app.tcloudbase.com/collabmatch/api` |
| 云函数 | `collabmatch-api` |
| CloudBase 环境 | `cloudbase-d6g8yog0ub3e56efe` |
| 登录验证码 | `xsx7ii` |

### 部署命令

```bash
# 在 cloudfunctions/collabmatch-api 目录下
cloudbase hosting deploy <localFile> dist/<cloudPath> -e cloudbase-d6g8yog0ub3e56efe
```

**注意**：CDN 有缓存，部署后需用无痕模式验证，或等待数分钟刷新。

---

## 五、待处理

1. **Git push**：需在能访问 GitHub 的网络环境执行 `git push origin master`
2. **云函数部署**：`cloudfunctions/collabmatch-api/index.js` 修改后需重新部署云函数
3. **CDN 缓存**：每次部署静态文件后，CDN 需要数分钟刷新