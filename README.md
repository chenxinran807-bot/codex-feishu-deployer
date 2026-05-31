# codex-feishu-deployer

Deploy `cc-connect + Codex + Feishu` from a small CLI.

## Prerequisites

- macOS
- Node.js 18+
- Codex CLI installed and authenticated
- `cc-connect` installed
- A Feishu custom app with:
  - Bot capability enabled
  - WebSocket event subscription enabled
  - `im.message.receive_v1` subscribed
  - `card.action.trigger` subscribed if interactive cards are enabled
  - App version published

Install `cc-connect` if needed:

```bash
npm install -g cc-connect
```

## Feishu App Setup

Create a custom app in the Feishu Open Platform before running setup.

1. Open the Feishu Open Platform and create a custom app.
2. Enable the app's Bot capability.
3. Copy the app's `App ID` and `App Secret`.
4. Open Event Subscriptions.
5. Enable WebSocket long connection mode.
6. Subscribe to:
   - `im.message.receive_v1`
   - `card.action.trigger` if interactive cards are enabled
7. Add required bot/message permissions when Feishu asks for them.
8. Create and publish an app version.

For group chats, invite the bot to the group. By default, the bot responds only when mentioned in a group.

## Usage

```bash
npx codex-feishu-deployer setup
```

The setup command asks for:

- Feishu App ID
- Feishu App Secret
- Feishu User Open ID
- Codex work directory
- Permission mode
- Whether to enable Feishu document read/write for Codex

## Where to Get Setup Values

### Feishu App ID

Get it from your Feishu custom app:

1. Open the Feishu Open Platform.
2. Open your custom app.
3. Go to "Credentials and Basic Info".
4. Copy `App ID`.

It usually looks like:

```text
cli_xxxxxxxxxxxxxxxx
```

### Feishu App Secret

Get it from the same Feishu custom app:

1. Open the Feishu Open Platform.
2. Open your custom app.
3. Go to "Credentials and Basic Info".
4. Copy `App Secret`.

Treat this as a secret. Do not paste it into public chats, GitHub issues, screenshots, or commits. If it leaks, rotate it in the Feishu Open Platform and run setup again.

### Feishu User Open ID

This is the Feishu user allowed to control your local Codex agent.

The easiest way to get it is after the bot is running:

```text
/whoami
```

or:

```text
/status
```

The bot returns a line like:

```text
User ID: ou_xxxxxxxxxxxxxxxxx
```

Use that `ou_...` value.

### Codex Work Directory

This is the local project directory Codex will operate in.

Example:

```text
/Users/alice/projects/my-app
```

Recommendations:

- Use a real project directory.
- Do not use `/`.
- Do not use your entire home directory.
- Start with a small trusted project while testing.

### Permission Mode

The permission mode controls how much Codex can do automatically.

Use this if unsure:

```text
suggest
```

Available modes:

| Mode | Use case |
| --- | --- |
| `suggest` | Safest default. Best for first-time setup. |
| `auto-edit` | Allows automatic file edits, while keeping command execution more controlled. |
| `full-auto` | More automation for trusted projects and experienced users. |
| `yolo` | Highest risk. Not recommended for normal use. |

### Enable Feishu Document Read/Write

This option lets Codex use `lark-cli` to read and write Feishu documents.

Enable it if you want to ask things like:

```text
Please summarize this Feishu document: https://example.feishu.cn/docx/...
```

or:

```text
Please turn this tutorial into a Feishu document.
```

If enabled, the machine needs `lark-cli` installed and authenticated. The deployer can install it:

```bash
npx codex-feishu-deployer setup --enable-lark-docs --install-lark-cli
```

If you only want Feishu chat to control Codex, and do not need document read/write, answer `no`.

It writes:

```text
~/.cc-connect/config.toml
```

and installs the `cc-connect` daemon.

## Feishu Document Access

To let Codex read and write Feishu documents through `lark-cli`, run:

```bash
npx codex-feishu-deployer setup --enable-lark-docs
```

This requires `lark-cli` to be installed and authenticated:

```bash
lark-cli auth status
```

If `lark-cli` is missing, setup can install it from npm:

```bash
npx codex-feishu-deployer setup --enable-lark-docs --install-lark-cli
```

Equivalent manual install:

```bash
npm install -g @larksuite/cli
```

When enabled, setup writes this guide into the Codex work directory:

```text
.codex-feishu/LARK_DOCS.md
```

Codex can then use commands such as:

```bash
lark-cli docs +fetch --api-version v2 --as user --doc "<document-url-or-token>"
lark-cli docs +create --api-version v2 --as user --doc-format markdown --content @./draft.md
lark-cli docs +update --api-version v2 --as user --doc "<document-url-or-token>" --command overwrite --doc-format markdown --content @./draft.md
```

The deployer does not store Feishu document content. It only generates local instructions and checks that `lark-cli` is available.

To preview the generated config without writing files or installing the daemon:

```bash
npx codex-feishu-deployer setup --dry-run \
  --enable-lark-docs \
  --app-id cli_xxx \
  --app-secret your-secret \
  --user-open-id ou_xxx \
  --work-dir /path/to/project \
  --mode suggest
```

## Service Commands

```bash
codex-feishu-deployer status
codex-feishu-deployer restart
codex-feishu-deployer stop
codex-feishu-deployer uninstall
codex-feishu-deployer doctor
```

## Verify

Send this to your Feishu bot:

```text
/status
```

If the bot is in a group and `group_reply_all = false`, mention the bot.

Expected local daemon logs include:

```text
feishu: bot identified
platform ready
engine started
connected to wss://msg-frontier.feishu.cn/ws/v2
```

## Security

Do not commit `~/.cc-connect/config.toml`. It contains your Feishu App Secret.

If an App Secret has been pasted into chat, logs, or a public issue, rotate it in the Feishu Open Platform and re-run setup.

## Publish

For npm publishing:

```bash
npm publish
```

Then users can run:

```bash
npx codex-feishu-deployer setup
```
