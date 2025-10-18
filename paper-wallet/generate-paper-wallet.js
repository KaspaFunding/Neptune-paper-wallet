'use strict';

// Fast, secure wrapper around neptune-cli to generate a printable paper wallet
// - Generates a fresh wallet in an isolated data-dir
// - Exports 18-word BIP-39 mnemonic
// - Derives first Generation receiving address (index 0)
// - Optionally emits a minimal HTML file for printing

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
  // Lines like: "1. word" ... "18. word"
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
  // get_nth_receiving_address prints wallet path then the address; take last non-empty line
  const lines = output.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return lines[lines.length - 1];
}

function renderHtml({ network, words, addresses }) {
  const escapedWords = words.map((w, i) => `${i + 1}. ${w}`).join('<br/>');
  const addrList = addresses.map((a, i) => `<div><strong>Address #${i}:</strong> ${a}</div>`).join('');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Neptune Paper Wallet</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; }
      .box { border: 2px solid #222; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
      .warning { color: #b00020; font-weight: 700; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      h1 { margin-top: 0; }
    </style>
  </head>
  <body>
    <h1>Neptune Paper Wallet</h1>
    <div class="box warning">Keep this paper safe and offline. Anyone with the words can spend your funds.</div>
    <div class="box">
      <h2>Important - Recovery Limitations</h2>
      <ul>
        <li>
          This wallet can recover funds received with <strong>on-chain UTXO notifications</strong>
          (ciphertexts embedded on-chain). The 18-word mnemonic plus the blockchain is sufficient.
        </li>
        <li>
          Funds received via <strong>off-chain UTXO notifications</strong> require extra data (incoming randomness)
          that is <em>not</em> derivable from the mnemonic. The sender must provide a transfer file, or the
          running wallet must capture it when received. Otherwise, such funds cannot be recovered from this paper wallet.
        </li>
        <li>
          Best practice: Instruct senders to use on-chain notifications when paying these addresses, or if you receive
          off-chain transfers, immediately consolidate to yourself using an on-chain notification.
        </li>
      </ul>
    </div>
    <div class="box">
      <div><strong>Network:</strong> ${network}</div>
      <h2>Receive Address(es)</h2>
      <div class="mono">${addrList}</div>
    </div>
    <div class="box">
      <h2>Seed Phrase (18 words)</h2>
      <div class="mono">${escapedWords}</div>
    </div>
  </body>
</html>`;
}

(function main() {
  const cli = findNeptuneCli();
  const args = process.argv.slice(2);
  const network = (process.env.NETWORK || (args.includes('--testnet') ? 'test' : 'main')).toLowerCase();
  const count = Math.max(1, Math.min(50, parseInt(process.env.NUM_ADDRESSES || '1', 10) || 1));
  const writeHtml = process.env.WRITE_HTML === '1' || args.includes('--write');

  const outRoot = path.join(process.cwd(), 'paper-wallet', 'output');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dataDir = path.join(outRoot, `wallet-${timestamp}`);
  ensureDir(dataDir);
  ensureDir(outRoot);

  // 1) Generate fresh wallet in isolated data-dir (global flag must precede subcommand)
  runCli(cli, ['--data-dir', dataDir, 'generate-wallet', '--network', network]);

  // 2) Export mnemonic
  const mnemonicOut = runCli(cli, ['--data-dir', dataDir, 'export-seed-phrase', '--network', network]);
  const words = parseMnemonicFromExport(mnemonicOut);

  // 3) Derive first N addresses
  const addresses = [];
  for (let i = 0; i < count; i++) {
    const nthOut = runCli(cli, ['--data-dir', dataDir, 'nth-receiving-address', '--network', network, String(i)]);
    addresses.push(parseAddressFromNth(nthOut));
  }

  // 4) Print to console
  console.log('------------------------------');
  console.log('Network:', network);
  console.log('Address(es):');
  addresses.forEach((a, i) => console.log(`#${i} ${a}`));
  console.log('Seed phrase (18 words):');
  words.forEach((w, i) => console.log(`${i + 1}. ${w}`));
  console.log('------------------------------');

  console.log('\nIMPORTANT - Recovery limitations:');
  console.log('- Mnemonic + blockchain can recover funds received with ON-CHAIN UTXO notifications.');
  console.log('- OFF-CHAIN UTXO notifications require additional incoming randomness (transfer file) that is not derivable from the mnemonic.');
  console.log('- If you expect off-chain transfers, ensure you obtain the transfer file(s) or consolidate to yourself via an on-chain notification.');

  // 5) Write plaintext helpers (mnemonic and addresses) to files to avoid terminal wrapping issues
  const mnemonicTxt = path.join(outRoot, `mnemonic-${timestamp}.txt`);
  const addressesTxt = path.join(outRoot, `addresses-${timestamp}.txt`);
  fs.writeFileSync(mnemonicTxt, words.join(' '), { encoding: 'utf8', flag: 'wx' });
  fs.writeFileSync(addressesTxt, addresses.join('\n'), { encoding: 'utf8', flag: 'wx' });

  // 6) Optionally write printable HTML
  if (writeHtml) {
    const html = renderHtml({ network, words, addresses });
    const htmlPath = path.join(outRoot, `paper-wallet-${timestamp}.html`);
    fs.writeFileSync(htmlPath, html, { encoding: 'utf8', flag: 'wx' });
    console.log(`\nWrote files:\n- ${htmlPath}\n- ${mnemonicTxt}\n- ${addressesTxt}`);
  } else {
    console.log(`\nWrote files:\n- ${mnemonicTxt}\n- ${addressesTxt}`);
    console.warn('[Info] Skipped writing HTML. Pass --write or set WRITE_HTML=1 to save a printable file.');
  }
})();


