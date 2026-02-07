#!/usr/bin/env node
/**
 * Start Expo using Node from Program Files (avoids Miniconda/other Node on PATH).
 * Uses port 8082 by default so Expo never prompts in non-interactive mode.
 * Usage: node scripts/start-expo.js [--clear] [--tunnel] [--port N] ...
 */
const { spawn } = require('child_process');
const path = require('path');

const nodeDir = process.platform === 'win32'
  ? 'C:\\Program Files\\nodejs'
  : '/usr/local/bin';

const env = { ...process.env };
const pathSep = process.platform === 'win32' ? ';' : ':';
env.PATH = pathSep === ';'
  ? `${nodeDir};${env.PATH || ''}`
  : `${nodeDir}:${env.PATH || ''}`;
env.EXPO_NO_PROMPT = '1';

const args = process.argv.slice(2);
const hasPort = args.some(a => a === '--port' || (a && a.startsWith('--port=')));
if (!hasPort) {
  args.push('--port', '8090');
}

const cwd = path.resolve(__dirname, '..');
const argsStr = args.map(a => (a.includes(' ') ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' ');
const cmd = `npx expo start ${argsStr}`;

const child = spawn(cmd, {
  stdio: 'inherit',
  shell: true,
  env,
  cwd,
});

child.on('error', (err) => {
  console.error('Failed to start Expo:', err.message);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  process.exit(code != null ? code : signal ? 1 : 0);
});
