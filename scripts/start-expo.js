#!/usr/bin/env node
/**
 * Start Expo using Node from Program Files (avoids Miniconda/other Node on PATH).
 * Uses port 8090 by default so Expo never prompts in non-interactive mode.
 * Runs Expo CLI via Node (no shell) so terminal keypresses (e.g. 'r' to reload) reach Metro.
 * Usage: node scripts/start-expo.js [--clear] [--tunnel] [--port N] ...
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
const expoCli = path.join(cwd, 'node_modules', 'expo', 'bin', 'cli');
const nodeFromProgramFiles = process.platform === 'win32' ? path.join(nodeDir, 'node.exe') : path.join(nodeDir, 'node');
const nodeBin = (process.platform === 'win32' && fs.existsSync(nodeFromProgramFiles)) ? nodeFromProgramFiles : process.execPath;

// Spawn Node running Expo CLI directly (no shell) so 'r' reload and other keys reach Metro
const child = spawn(nodeBin, [expoCli, 'start', ...args], {
  stdio: 'inherit',
  shell: false,
  env,
  cwd,
  windowsHide: false,
});

child.on('error', (err) => {
  console.error('Failed to start Expo:', err.message);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  process.exit(code != null ? code : signal ? 1 : 0);
});
