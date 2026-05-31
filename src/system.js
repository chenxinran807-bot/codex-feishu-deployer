import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';

export function expandHome(input, homeDir = os.homedir()) {
  if (input === '~') return homeDir;
  if (input.startsWith('~/')) return `${homeDir}/${input.slice(2)}`;
  return input;
}

export function parseCommandExistsStatus(status) {
  return status === 0;
}

export function commandExists(command) {
  const result = spawnSync('sh', ['-lc', `command -v ${shellQuote(command)} >/dev/null 2>&1`], {
    stdio: 'ignore'
  });
  return parseCommandExistsStatus(result.status);
}

export function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio || 'inherit',
      cwd: options.cwd,
      env: options.env || process.env
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

export function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}
