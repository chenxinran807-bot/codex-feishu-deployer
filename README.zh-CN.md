# codex-feishu-deployer

[English](./README.md) | 简体中文

`codex-feishu-deployer` 可以把飞书变成本地 Codex 的远程控制入口。

部署完成后，你可以在电脑端或手机端飞书里给机器人发消息，机器人会把请求转发给运行在你自己电脑上的 Codex。Codex 会在你指定的项目目录里工作：读取文件、解释代码、提出修改、运行检查；如果启用飞书文档能力，还可以通过 `lark-cli` 读取或写入飞书文档。

这个 CLI 会自动处理本地重复配置：生成 `cc-connect` 配置、连接你的飞书自建应用、限制只有指定飞书用户可以调用、安装后台服务，并可选地为 Codex 准备飞书文档读写说明。

## 前置条件

- macOS
- Node.js 18+
- 已安装并完成认证的 Codex CLI
- 已安装 `cc-connect`
- 一个飞书自建应用，并完成：
  - 开启机器人能力
  - 开启 WebSocket 事件订阅
  - 订阅 `im.message.receive_v1`
  - 如果启用飞书卡片，订阅 `card.action.trigger`
  - 创建并发布应用版本

如果还没有安装 `cc-connect`，请在终端执行：

```bash
npm install -g cc-connect
```

## 飞书应用配置

运行部署前，需要先在飞书开放平台 https://open.larkoffice.com/app 创建一个自建应用。

1. 打开飞书开放平台-开发者后台，创建自建应用。
2. 开启应用的「机器人」能力。
3. 复制应用的 `App ID` 和 `App Secret`。
4. 打开「事件订阅」。
5. 开启 WebSocket 长连接模式。
6. 订阅事件：
   - `im.message.receive_v1`
   - 如果启用交互式卡片，订阅 `card.action.trigger`
7. 按飞书提示添加机器人和消息相关权限。
8. 创建并发布应用版本。

如果要在群聊里使用，把机器人邀请进群。默认情况下，群聊里需要 @ 机器人，它才会响应。

## 使用方式

```bash
npx github:chenxinran807-bot/codex-feishu-deployer setup
```

当前项目通过 GitHub 分发。只有发布到 npm 后，较短的 `npx codex-feishu-deployer setup` 命令才可用。

setup 会询问：

- Feishu App ID
- Feishu App Secret
- Feishu User Open ID
- Codex 工作目录
- 权限模式
- 是否启用 Codex 读写飞书文档能力

它会写入：

```text
~/.cc-connect/config.toml
```

并安装 `cc-connect` 后台服务。

## 这些信息从哪里获取

### Feishu App ID

从飞书自建应用获取：

1. 打开飞书开放平台。
2. 进入你的自建应用。
3. 打开「凭证与基础信息」。
4. 复制 `App ID`。

通常长这样：

```text
cli_xxxxxxxxxxxxxxxx
```

### Feishu App Secret

从同一个飞书自建应用获取：

1. 打开飞书开放平台。
2. 进入你的自建应用。
3. 打开「凭证与基础信息」。
4. 复制 `App Secret`。

这是密钥。不要发到公开聊天、GitHub issue、截图或提交记录里。如果泄露，在飞书开放平台重置后重新运行 setup。

### Feishu User Open ID

这是允许控制本地 Codex agent 的飞书用户 ID。

最简单的获取方式是在机器人运行后，给机器人发送：

```text
/whoami
```

或：

```text
/status
```

机器人会返回类似：

```text
User ID: ou_xxxxxxxxxxxxxxxxx
```

使用这个 `ou_...` 值。

### Codex 工作目录

这是 Codex 要操作的本地项目目录。

示例：

```text
/Users/alice/projects/my-app
```

建议：

- 使用真实项目目录。
- 不要使用 `/`。
- 不要使用整个 home 目录。
- 第一次测试时先使用一个小的可信项目。

### 权限模式

权限模式决定 Codex 可以自动做多少事情。

不确定时使用：

```text
suggest
```

可选模式：

| 模式 | 适用场景 |
| --- | --- |
| `suggest` | 最安全的默认选项，适合首次配置。 |
| `auto-edit` | 允许自动改文件，但命令执行仍更受控。 |
| `full-auto` | 更高自动化程度，适合可信项目和熟练用户。 |
| `yolo` | 风险最高，不建议日常使用。 |

### 是否启用飞书文档读写

这个选项允许 Codex 通过 `lark-cli` 读写飞书文档。

如果你希望这样使用，就启用：

```text
请总结这个飞书文档：https://example.feishu.cn/docx/...
```

或：

```text
请把这份教程整理成飞书文档。
```

启用后，机器需要安装并认证 `lark-cli`。部署器可以自动安装：

```bash
npx github:chenxinran807-bot/codex-feishu-deployer setup --enable-lark-docs --install-lark-cli
```

如果你只想用飞书聊天控制 Codex，不需要读写飞书文档，选择 `no` 即可。

## 飞书文档读写

如果要让 Codex 通过 `lark-cli` 读写飞书文档，运行：

```bash
npx github:chenxinran807-bot/codex-feishu-deployer setup --enable-lark-docs
```

需要先安装并认证 `lark-cli`：

```bash
lark-cli auth status
```

如果机器上没有 `lark-cli`，可以让部署器从 npm 安装：

```bash
npx github:chenxinran807-bot/codex-feishu-deployer setup --enable-lark-docs --install-lark-cli
```

等价的手动安装命令：

```bash
npm install -g @larksuite/cli
```

启用后，setup 会在 Codex 工作目录写入：

```text
.codex-feishu/LARK_DOCS.md
AGENTS.md
```

Codex 可以使用类似命令：

```bash
lark-cli docs +fetch --api-version v2 --as user --doc "<document-url-or-token>"
lark-cli docs +create --api-version v2 --as user --doc-format markdown --content @./draft.md
lark-cli docs +update --api-version v2 --as user --doc "<document-url-or-token>" --command overwrite --doc-format markdown --content @./draft.md
```

部署器不会存储飞书文档内容。它只生成本地说明并检查 `lark-cli` 是否可用。

`AGENTS.md` 很重要：它会告诉 Codex 遇到飞书/Lark 文档链接时使用 `lark-cli`，而不是尝试直接用浏览器访问这些链接。

## 预览配置

不写入文件、不安装后台服务，只预览生成的配置：

```bash
npx github:chenxinran807-bot/codex-feishu-deployer setup --dry-run \
  --enable-lark-docs \
  --app-id cli_xxx \
  --app-secret your-secret \
  --user-open-id ou_xxx \
  --work-dir /path/to/project \
  --mode suggest
```

## 服务管理命令

```bash
codex-feishu-deployer status
codex-feishu-deployer restart
codex-feishu-deployer stop
codex-feishu-deployer uninstall
codex-feishu-deployer doctor
```

## 关闭工具进度提醒

如果你不希望飞书里不断收到 `工具 #...: Bash` 这类中间过程提醒，但仍想保留 Codex 的思考摘要，可以手动编辑：

```bash
nano /Users/bytedance/.cc-connect/config.toml
```

把下面配置放在 `[log]` 后面、`[[projects]]` 前面：

```toml
[display]
thinking_messages = true
thinking_max_len = 300
tool_messages = false

[stream_preview]
enabled = false
```

保存后重启服务：

```bash
cc-connect daemon restart
```

效果：

- 保留思考摘要。
- 不再发送每一步工具调用提醒。
- 不再发送流式预览更新。
- Codex 完成任务后仍会发送最终结果。

## 创建不同聊天会话

`cc-connect` 会按飞书聊天上下文区分会话。最简单的多任务隔离方式是：为不同任务创建不同飞书群，并把同一个机器人邀请进去。

推荐用法：

1. 为每个任务或项目创建一个单独飞书群。
2. 把机器人邀请进群。
3. 在群里 @ 机器人发送任务。
4. 在每个群里发送 `/status` 检查当前会话状态。

不同群会产生不同的 `session_key` 和不同的 Codex agent session，因此上下文会相互隔离。比如一个群可以专门做 Figma 原型任务，另一个群可以专门做文档整理任务。

注意：

- 同一个群里的连续对话会复用同一个上下文。
- 不同群通常会自动分配不同上下文。
- 如果 `group_reply_all = false`，群聊里需要 @ 机器人。
- 如果想让一个任务彻底从新上下文开始，创建新群是最直观的方法。

## 验证

给飞书机器人发送：

```text
/status
```

如果机器人在群聊中，并且 `group_reply_all = false`，需要 @ 机器人。

本地 daemon 日志中应该看到类似：

```text
feishu: bot identified
platform ready
engine started
connected to wss://msg-frontier.feishu.cn/ws/v2
```

## 安全

不要提交 `~/.cc-connect/config.toml`。它包含飞书 App Secret。

如果 App Secret 曾经被粘贴到聊天、日志或公开 issue 中，请在飞书开放平台重置，然后重新运行 setup。

## 发布

发布到 npm：

```bash
npm publish
```

发布后用户可以运行：

```bash
npx codex-feishu-deployer setup
```
