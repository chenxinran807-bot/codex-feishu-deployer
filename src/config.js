const VALID_MODES = new Set(['suggest', 'auto-edit', 'full-auto', 'yolo']);

export const larkCliInstallCommand = ['npm', 'install', '-g', '@larksuite/cli'];

export function escapeTomlString(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

export function renderConfig(options) {
  validateSetupAnswers(options);
  const language = options.language || 'zh';
  const reasoningEffort = options.reasoningEffort || 'medium';
  const dataDir = options.dataDir || `${options.workDir}/.cc-connect-data`;

  return `data_dir = "${escapeTomlString(dataDir)}"
language = "${escapeTomlString(language)}"

[log]
level = "info"

[[projects]]
name = "codex-feishu"
admin_from = "${escapeTomlString(options.userOpenId)}"

[projects.agent]
type = "codex"

[projects.agent.options]
work_dir = "${escapeTomlString(options.workDir)}"
mode = "${escapeTomlString(options.mode || 'suggest')}"
reasoning_effort = "${escapeTomlString(reasoningEffort)}"

[[projects.platforms]]
type = "feishu"

[projects.platforms.options]
app_id = "${escapeTomlString(options.appId)}"
app_secret = "${escapeTomlString(options.appSecret)}"
allow_from = "${escapeTomlString(options.userOpenId)}"
enable_feishu_card = true
group_reply_all = false
`;
}

export function redactSecret(text) {
  return text.replace(/(app_secret\s*=\s*").*?(")/g, '$1***$2');
}

export function validateSetupAnswers(options) {
  if (!options.appId) throw new Error('App ID is required');
  if (!options.appSecret) throw new Error('App Secret is required');
  if (!options.userOpenId) throw new Error('Feishu User Open ID is required');
  if (!options.workDir) throw new Error('Work directory is required');
  if (options.mode && !VALID_MODES.has(options.mode)) {
    throw new Error(`Invalid mode: ${options.mode}`);
  }
}

export function renderLarkDocsGuide() {
  return `# Feishu Document Access for Codex

This workspace is configured so Codex can use lark-cli to read and write Feishu documents.

## Read a document

\`\`\`bash
lark-cli docs +fetch --api-version v2 --as user --doc "<document-url-or-token>"
\`\`\`

## Create a document from Markdown

\`\`\`bash
lark-cli docs +create --api-version v2 --as user --doc-format markdown --content @./draft.md
\`\`\`

## Update a document from Markdown

\`\`\`bash
lark-cli docs +update --api-version v2 --as user \\
  --doc "<document-url-or-token>" \\
  --command overwrite \\
  --doc-format markdown \\
  --content @./draft.md
\`\`\`

## Safety rules

- Do not print App Secret, access tokens, or refresh tokens.
- Do not commit files containing private document content unless the user asks for that.
- Prefer file-based content arguments such as \`--content @./draft.md\` for long documents.
- Use \`--api-version v2\` for document commands.
`;
}

export const validModes = [...VALID_MODES];
