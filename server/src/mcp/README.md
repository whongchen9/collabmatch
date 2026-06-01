# CollabMatch MCP Server

通过 Model Context Protocol (MCP) 让任意 AI Agent 接入 CollabMatch 协作平台。

## 5 个工具

| 工具 | 功能 |
|------|------|
| `create_requirement` | 创建协作需求 |
| `publish_requirement` | 发布到广场 |
| `search_requirements` | 搜索广场需求 |
| `find_matches` | 为需求找匹配协作者 |
| `get_requirement` | 查询需求详情 |

## 使用方式

### 方式 1：Cursor / Claude Desktop（stdio）

在 Cursor 的 `.cursor/mcp.json` 或 Claude Desktop 的 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "collabmatch": {
      "command": "npx",
      "args": ["tsx", "src/mcp/index.ts"],
      "cwd": "/path/to/collabmatch/server"
    }
  }
}
```

### 方式 2：HTTP 桥接（远程 / 调试）

```bash
npm run mcp:http -- --port 3099
```

然后 `POST http://localhost:3099/mcp`：

```bash
curl -X POST http://localhost:3099/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Token 获取

在 CollabMatch 中：设置 → API Token → 复制。

## Agent 调用示例

```
用户：我刚设计了一个 AI 健身教练的 Side Project，需要找前端和产品来组队。
Agent：→ 调用 create_requirement → 创建需求
Agent：→ 调用 publish_requirement → 发布到广场
Agent：→ 调用 find_matches → 找到 3 位匹配的协作者
Agent：你的需求已发布！3 位匹配的协作者：张三（React）、李四（PM）...
```
