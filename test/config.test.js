import test from 'node:test';
import assert from 'node:assert/strict';
import {
  larkCliInstallCommand,
  redactSecret,
  renderAgentsInstructions,
  renderLarkBridgeRequestScript,
  renderLarkBridgeWorkerScript,
  renderConfig,
  renderLarkDocsGuide,
  validateSetupAnswers
} from '../src/config.js';

test('renderConfig emits codex feishu configuration without altering secret', () => {
  const toml = renderConfig({
    appId: 'cli_test',
    appSecret: 'secret-value',
    userOpenId: 'ou_user',
    workDir: '/tmp/project',
    mode: 'suggest',
    dataDir: '/tmp/project/.cc-connect-data',
    language: 'zh',
    reasoningEffort: 'medium'
  });

  assert.match(toml, /type = "codex"/);
  assert.match(toml, /app_id = "cli_test"/);
  assert.match(toml, /app_secret = "secret-value"/);
  assert.match(toml, /allow_from = "ou_user"/);
  assert.match(toml, /group_reply_all = false/);
});

test('redactSecret hides app secret values', () => {
  const input = 'app_secret = "abc123"\napp_id = "cli_test"';
  assert.equal(redactSecret(input), 'app_secret = "***"\napp_id = "cli_test"');
});

test('validateSetupAnswers rejects missing required values', () => {
  assert.throws(() => validateSetupAnswers({
    appId: '',
    appSecret: 'secret',
    userOpenId: 'ou_user',
    workDir: '/tmp/project',
    mode: 'suggest'
  }), /App ID/);
});

test('renderLarkDocsGuide documents lark-cli doc commands', () => {
  const guide = renderLarkDocsGuide();
  assert.match(guide, /lark-cli docs \+fetch --api-version v2/);
  assert.match(guide, /lark-cli docs \+create --api-version v2/);
  assert.match(guide, /lark-cli docs \+update --api-version v2/);
  assert.match(guide, /lark-doc-worker\.mjs --watch/);
  assert.match(guide, /Do not print App Secret/);
});

test('larkCliInstallCommand points to the official npm package', () => {
  assert.deepEqual(larkCliInstallCommand, ['npm', 'install', '-g', '@larksuite/cli']);
});

test('renderAgentsInstructions tells Codex to use lark-cli for Feishu docs', () => {
  const instructions = renderAgentsInstructions();
  assert.match(instructions, /Feishu or Lark document URL/);
  assert.match(instructions, /lark-doc-request\.mjs/);
  assert.match(instructions, /sandbox cannot resolve open\.feishu\.cn/);
  assert.match(instructions, /Do not try to browse the document URL directly/);
});

test('renderLarkBridgeRequestScript creates a file queue request helper', () => {
  const script = renderLarkBridgeRequestScript();
  assert.match(script, /path\.join\(bridgeDir, 'requests'\)/);
  assert.match(script, /Result Markdown:/);
  assert.match(script, /lark-doc-worker\.mjs --watch/);
});

test('renderLarkBridgeWorkerScript creates a lark-cli worker helper', () => {
  const script = renderLarkBridgeWorkerScript();
  assert.match(script, /lark-cli/);
  assert.match(script, /\['docs', '\+fetch'/);
  assert.match(script, /path\.join\(bridgeDir, 'results'\)/);
});
