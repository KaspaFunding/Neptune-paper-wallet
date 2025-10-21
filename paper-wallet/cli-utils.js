'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findNeptuneCli() {
  const envPath = process.env.NEPTUNE_CLI_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const repoRoot = process.cwd();
  const candidates = [
    path.join(repoRoot, 'neptune-core', 'target', 'debug', 'neptune-cli.exe'),
    path.join(repoRoot, 'neptune-core', 'target', 'release', 'neptune-cli.exe'),
    'neptune-cli',
    'neptune-cli.exe',
  ];
  for (const p of candidates) {
    try {
      if (p.includes(path.sep)) {
        if (fs.existsSync(p)) return p;
      } else {
        const r = spawnSync(p, ['--help'], { stdio: 'ignore' });
        if ((r.status === 0 || r.status === 2) && !r.error) return p;
      }
    } catch (_) {}
  }
  throw new Error('Could not locate neptune-cli. Set NEPTUNE_CLI_PATH to the binary, or build it first.');
}

function runCli(cliPath, args, opts = {}) {
  const result = spawnSync(cliPath, args, { encoding: 'utf8', ...opts });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${cliPath} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout.trim();
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function parseMnemonicFromExport(output) {
  const words = [];
  for (const line of output.split(/\r?\n/)) {
    const m = line.match(/^\s*(\d{1,2})\.\s+([a-zA-Z]+)\s*$/);
    if (m) {
      const idx = parseInt(m[1], 10);
      words[idx - 1] = m[2];
    }
  }
  if (words.length !== 18 || words.some(w => !w)) {
    throw new Error('Failed to parse 18-word seed phrase from neptune-cli output.');
  }
  return words;
}

function parseAddressFromNth(output) {
  const lines = output.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return lines[lines.length - 1];
}

module.exports = {
  findNeptuneCli,
  runCli,
  ensureDir,
  parseMnemonicFromExport,
  parseAddressFromNth,
};


