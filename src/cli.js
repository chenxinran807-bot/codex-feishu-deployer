import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { commandExists, expandHome, runCommand } from './system.js';
import {
  larkCliInstallCommand,
  redactSecret,
  renderAgentsInstructions,
  renderConfig,
  renderLarkDocsGuide,
  validModes,
  validateSetupAnswers
} from './config.js';

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.cc-connect');
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_CONFIG_DIR, 'config.toml');

export async function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'help';
  if (command === '--help' || command === '-h' || command === 'help') return printHelp();
  if (command === 'setup') return setup(parseFlags(argv.slice(1)));
  if (command === 'doctor') return doctor();
  if (['status', 'restart', 'stop', 'uninstall'].includes(command)) return daemon(command);
  throw new Error(`Unknown command: ${command}`);
}

async function setup(flags = {}) {
  console.log('Codex Feishu Deployer');
  console.log('This writes ~/.cc-connect/config.toml and installs the cc-connect daemon.\n');

  await checkRequiredCommand('codex', 'Install Codex first, then re-run setup.');
  await checkRequiredCommand('cc-connect', 'Install cc-connect with: npm install -g cc-connect');

  const answers = {
    appId: flags.appId || await ask('Feishu App ID: '),
    appSecret: flags.appSecret || await askHidden('Feishu App Secret: '),
    userOpenId: flags.userOpenId || await ask('Your Feishu User Open ID: '),
    workDir: expandHome(flags.workDir || await ask(`Codex work directory [${process.cwd()}]: `) || process.cwd()),
    mode: flags.mode || await ask(`Permission mode (${validModes.join('/')}) [suggest]: `) || 'suggest',
    enableLarkDocs: flags.enableLarkDocs ?? await askYesNo('Enable Feishu document read/write for Codex? [y/N] '),
    language: 'zh',
    reasoningEffort: 'medium'
  };
  answers.dataDir = path.join(answers.workDir, '.cc-connect-data');
  validateSetupAnswers(answers);
  if (answers.enableLarkDocs) {
    await ensureLarkCli(flags);
  }

  const config = renderConfig(answers);
  if (flags.dryRun) {
    console.log(redactSecret(config));
    return;
  }
  await fs.mkdir(DEFAULT_CONFIG_DIR, { recursive: true, mode: 0o700 });
  await fs.writeFile(DEFAULT_CONFIG_PATH, config, { mode: 0o600 });

  console.log(`\nWrote ${DEFAULT_CONFIG_PATH}`);
  console.log(redactSecret(config));

  if (answers.enableLarkDocs) {
    const guideDir = path.join(answers.workDir, '.codex-feishu');
    const guidePath = path.join(guideDir, 'LARK_DOCS.md');
    const agentsPath = path.join(answers.workDir, 'AGENTS.md');
    await fs.mkdir(guideDir, { recursive: true, mode: 0o700 });
    await fs.writeFile(guidePath, renderLarkDocsGuide(), { mode: 0o600 });
    await fs.writeFile(agentsPath, renderAgentsInstructions(), { mode: 0o600 });
    console.log(`Wrote ${guidePath}`);
    console.log(`Wrote ${agentsPath}`);
  }

  await removeLockIfPresent(path.join(answers.workDir, '.cc-connect.codex-feishu.toml.lock'));
  await runCommand('cc-connect', ['daemon', 'install'], { cwd: DEFAULT_CONFIG_DIR });
  console.log('\nDeployment finished. Send /status to your Feishu bot.');
}

async function doctor() {
  console.log('Doctor checks');
  reportCommand('node');
  reportCommand('codex');
  reportCommand('cc-connect');
  reportCommand('lark-cli');
  await reportLarkAuth();
  try {
    const config = await fs.readFile(DEFAULT_CONFIG_PATH, 'utf8');
    console.log(`config: found ${DEFAULT_CONFIG_PATH}`);
    console.log(config.includes('app_secret = "') ? 'secret: present' : 'secret: missing');
  } catch {
    console.log(`config: missing ${DEFAULT_CONFIG_PATH}`);
  }
}

async function daemon(command) {
  const daemonCommand = command === 'status' ? 'status' : command;
  await runCommand('cc-connect', ['daemon', daemonCommand], { cwd: DEFAULT_CONFIG_DIR });
}

async function checkRequiredCommand(command, message) {
  if (!commandExists(command)) throw new Error(`${command} not found. ${message}`);
}

async function ensureLarkCli(flags) {
  if (commandExists('lark-cli')) return;
  const installText = larkCliInstallCommand.join(' ');
  const shouldInstall = flags.installLarkCli || await askYesNo(`lark-cli not found. Install it with "${installText}" now? [y/N] `);
  if (!shouldInstall) {
    throw new Error(`lark-cli not found. Install it with: ${installText}`);
  }
  await runCommand(larkCliInstallCommand[0], larkCliInstallCommand.slice(1));
  if (!commandExists('lark-cli')) {
    throw new Error('lark-cli installation finished but lark-cli is still not on PATH. Open a new terminal and re-run setup.');
  }
}

function reportCommand(command) {
  console.log(`${command}: ${commandExists(command) ? 'found' : 'missing'}`);
}

async function reportLarkAuth() {
  if (!commandExists('lark-cli')) return;
  try {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync('lark-cli', ['auth', 'status'], { encoding: 'utf8' });
    if (result.status !== 0) {
      console.log('lark auth: not ready');
      return;
    }
    const output = result.stdout || '';
    const hasDocsRead = output.includes('docs:document.content:read') || output.includes('docx:document:readonly');
    const hasDocsWrite = output.includes('docx:document:write_only') || output.includes('docx:document:create');
    console.log('lark auth: ready');
    console.log(`lark docs read scope: ${hasDocsRead ? 'present' : 'missing'}`);
    console.log(`lark docs write scope: ${hasDocsWrite ? 'present' : 'missing'}`);
  } catch {
    console.log('lark auth: not ready');
  }
}

async function removeLockIfPresent(lockPath) {
  try {
    await fs.unlink(lockPath);
    console.log(`Removed stale lock: ${lockPath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function askYesNo(prompt) {
  const answer = (await ask(prompt)).toLowerCase();
  return answer === 'y' || answer === 'yes';
}

function askHidden(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const output = rl.output;
  const originalWrite = output.write;
  output.write = function writeMuted(string, encoding, fd) {
    if (string.includes(prompt)) return originalWrite.call(output, string, encoding, fd);
    return true;
  };
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      output.write = originalWrite;
      output.write('\n');
      rl.close();
      resolve(answer.trim());
    });
  });
}

function printHelp() {
  console.log(`codex-feishu-deployer

Usage:
  codex-feishu-deployer setup [--dry-run] [--enable-lark-docs] [--install-lark-cli] [--app-id ID] [--app-secret SECRET] [--user-open-id ID] [--work-dir DIR] [--mode MODE]
  codex-feishu-deployer doctor
  codex-feishu-deployer status
  codex-feishu-deployer restart
  codex-feishu-deployer stop
  codex-feishu-deployer uninstall
`);
}

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--dry-run') {
      flags.dryRun = true;
    } else if (arg === '--enable-lark-docs') {
      flags.enableLarkDocs = true;
    } else if (arg === '--install-lark-cli') {
      flags.installLarkCli = true;
    } else if (arg === '--app-id') {
      flags.appId = args[++i];
    } else if (arg === '--app-secret') {
      flags.appSecret = args[++i];
    } else if (arg === '--user-open-id') {
      flags.userOpenId = args[++i];
    } else if (arg === '--work-dir') {
      flags.workDir = args[++i];
    } else if (arg === '--mode') {
      flags.mode = args[++i];
    } else {
      throw new Error(`Unknown setup flag: ${arg}`);
    }
  }
  return flags;
}
