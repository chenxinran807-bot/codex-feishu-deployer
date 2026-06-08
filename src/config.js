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

This workspace is configured so Codex can read and write Feishu documents.

If Codex can resolve Feishu DNS, it can use lark-cli directly. If the Codex sandbox cannot resolve open.feishu.cn, use the local bridge scripts in this directory.

## Read a document through the local bridge

Start the worker from a normal terminal, outside the Codex sandbox:

\`\`\`bash
node .codex-feishu/lark-doc-worker.mjs --watch
\`\`\`

Then Codex can request a document without direct Feishu network access:

\`\`\`bash
node .codex-feishu/lark-doc-request.mjs "<document-url-or-token>"
\`\`\`

The request command prints a local Markdown path. Read that file for the fetched document content.

## Read a document directly with lark-cli

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

export function renderAgentsInstructions() {
  return `# Codex Feishu Workspace Instructions

When the user provides a Feishu or Lark document URL, wiki URL, or doc token, use the local Feishu document bridge first.

Do not try to browse the document URL directly. Browser/web access often lacks the user's Feishu session and will fail or show an access page.

Codex sandbox network may fail with \`lookup open.feishu.cn: no such host\`. If the sandbox cannot resolve open.feishu.cn, do not keep retrying direct lark-cli calls.

Use this command to request a document through the local bridge:

\`\`\`bash
node .codex-feishu/lark-doc-request.mjs "<document-url-or-token>"
\`\`\`

The command prints a local Markdown result path. Read that file to get the document content.

The bridge worker must be running in a normal terminal:

\`\`\`bash
node .codex-feishu/lark-doc-worker.mjs --watch
\`\`\`

If the user asks to write a Feishu document, prepare a local Markdown draft first. If direct lark-cli network access works, use:

\`\`\`bash
lark-cli docs +create --api-version v2 --as user --doc-format markdown --content @./draft.md
lark-cli docs +update --api-version v2 --as user --doc "<document-url-or-token>" --command overwrite --doc-format markdown --content @./draft.md
\`\`\`

For long content, write a local Markdown draft first and pass it with \`--content @./draft.md\`.

Do not print App Secret, access tokens, refresh tokens, or private document content unless the user explicitly asks for the content.
`;
}

export function renderLarkBridgeRequestScript() {
  return `#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const bridgeDir = path.join(root, 'bridge');
const requestDir = path.join(bridgeDir, 'requests');
const resultDir = path.join(bridgeDir, 'results');

const args = process.argv.slice(2);
const doc = args.find((arg) => !arg.startsWith('--'));
const timeoutArg = args.find((arg) => arg.startsWith('--timeout-ms='));
const timeoutMs = timeoutArg ? Number(timeoutArg.split('=')[1]) : 120000;

if (!doc) {
  console.error('Usage: node .codex-feishu/lark-doc-request.mjs "<document-url-or-token>" [--timeout-ms=120000]');
  process.exit(2);
}

const id = randomUUID();
const requestPath = path.join(requestDir, id + '.json');
const resultPath = path.join(resultDir, id + '.json');

await fs.mkdir(requestDir, { recursive: true, mode: 0o700 });
await fs.mkdir(resultDir, { recursive: true, mode: 0o700 });
await fs.writeFile(requestPath, JSON.stringify({
  id,
  type: 'fetch',
  doc,
  apiVersion: 'v2',
  as: 'user',
  createdAt: new Date().toISOString()
}, null, 2), { mode: 0o600 });

const startedAt = Date.now();
while (Date.now() - startedAt < timeoutMs) {
  try {
    const result = JSON.parse(await fs.readFile(resultPath, 'utf8'));
    if (result.ok) {
      console.log('Request ID: ' + id);
      console.log('Result Markdown: ' + result.markdownPath);
      console.log('Result JSON: ' + resultPath);
      process.exit(0);
    }
    console.error('Request ID: ' + id);
    console.error('Bridge error: ' + (result.error || 'unknown error'));
    process.exit(1);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

console.error('Request ID: ' + id);
console.error('Timed out waiting for lark-doc-worker.mjs.');
console.error('Start it in a normal terminal with: node .codex-feishu/lark-doc-worker.mjs --watch');
process.exit(1);
`;
}

export function renderLarkBridgeWorkerScript() {
  return `#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const bridgeDir = path.join(root, 'bridge');
const requestDir = path.join(bridgeDir, 'requests');
const resultDir = path.join(bridgeDir, 'results');
const processedDir = path.join(bridgeDir, 'processed');
const watch = process.argv.includes('--watch');
const intervalArg = process.argv.find((arg) => arg.startsWith('--interval-ms='));
const intervalMs = intervalArg ? Number(intervalArg.split('=')[1]) : 1000;

await fs.mkdir(requestDir, { recursive: true, mode: 0o700 });
await fs.mkdir(resultDir, { recursive: true, mode: 0o700 });
await fs.mkdir(processedDir, { recursive: true, mode: 0o700 });

console.log('lark-doc worker ready');
console.log('Watching: ' + requestDir);

do {
  await processOnce();
  if (watch) await new Promise((resolve) => setTimeout(resolve, intervalMs));
} while (watch);

async function processOnce() {
  const files = (await fs.readdir(requestDir)).filter((file) => file.endsWith('.json')).sort();
  for (const file of files) {
    const requestPath = path.join(requestDir, file);
    let request;
    try {
      request = JSON.parse(await fs.readFile(requestPath, 'utf8'));
    } catch (error) {
      await writeResult(file, { ok: false, error: 'Invalid request JSON: ' + error.message });
      await moveProcessed(requestPath, file);
      continue;
    }

    if (request.type !== 'fetch' || !request.doc) {
      await writeResult(file, { ok: false, error: 'Unsupported request. Expected type=fetch and doc.' });
      await moveProcessed(requestPath, file);
      continue;
    }

    console.log('Fetching document for request ' + request.id);
    const fetched = await runLarkFetch(request.doc, request.apiVersion || 'v2', request.as || 'user');
    if (fetched.ok) {
      const markdownPath = path.join(resultDir, request.id + '.md');
      await fs.writeFile(markdownPath, fetched.stdout, { mode: 0o600 });
      await writeResult(file, {
        ok: true,
        id: request.id,
        markdownPath,
        completedAt: new Date().toISOString()
      });
    } else {
      await writeResult(file, {
        ok: false,
        id: request.id,
        error: fetched.stderr || fetched.error || 'lark-cli failed',
        completedAt: new Date().toISOString()
      });
    }
    await moveProcessed(requestPath, file);
  }
}

function runLarkFetch(doc, apiVersion, identity) {
  return new Promise((resolve) => {
    const child = spawn('lark-cli', ['docs', '+fetch', '--api-version', apiVersion, '--as', identity, '--doc', doc], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => resolve({ ok: false, error: error.message, stderr }));
    child.on('close', (code) => resolve({ ok: code === 0, stdout, stderr }));
  });
}

async function writeResult(file, payload) {
  const id = payload.id || file.replace(/\\.json$/, '');
  await fs.writeFile(path.join(resultDir, id + '.json'), JSON.stringify(payload, null, 2), { mode: 0o600 });
}

async function moveProcessed(requestPath, file) {
  try {
    await fs.rename(requestPath, path.join(processedDir, file));
  } catch {
    await fs.rm(requestPath, { force: true });
  }
}
`;
}

export const validModes = [...VALID_MODES];
