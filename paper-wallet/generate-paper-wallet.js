'use strict';

// Fast, secure wrapper around neptune-cli to generate a printable paper wallet
// - Generates a fresh wallet in an isolated data-dir
// - Exports 18-word BIP-39 mnemonic
// - Derives first Generation receiving address (index 0)
// - Optionally emits a minimal HTML file for printing

const fs = require('fs');
const path = require('path');
const { findNeptuneCli, runCli, ensureDir, parseMnemonicFromExport, parseAddressFromNth } = require('./cli-utils');
const { fetchQrLibInline, makeShortCode, joinUrl, writeResolverAssets } = require('./qr-utils');
const { renderHtml } = require('./html');

// renderHtml is imported from ./html

function parseCliArgs(argv) {
  const options = { flags: new Set(), kv: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    if (a === '--write') { options.flags.add('write'); continue; }
    if (a === '--testnet') { options.kv.network = 'test'; continue; }
    if (a === '--network') { options.kv.network = (argv[i + 1] || '').toLowerCase(); i++; continue; }
    if (a === '--count') { options.kv.count = parseInt(argv[i + 1] || '1', 10); i++; continue; }
    if (a === '--qr-base-url') { options.kv.qrBaseUrl = argv[i + 1] || ''; i++; continue; }
    if (a === '--out-dir') { options.kv.outDir = argv[i + 1] || ''; i++; continue; }
  }
  return options;
}

function sha256FileHex(filepath) {
  const crypto = require('crypto');
  const h = crypto.createHash('sha256');
  const data = fs.readFileSync(filepath);
  h.update(data);
  return h.digest('hex');
}

(async function main() {
  const cli = findNeptuneCli();
  const args = process.argv.slice(2);
  const parsed = parseCliArgs(args);
  const network = (parsed.kv.network || process.env.NETWORK || 'main').toLowerCase();
  const count = Math.max(1, Math.min(50, parsed.kv.count || parseInt(process.env.NUM_ADDRESSES || '1', 10) || 1));
  const writeHtml = parsed.flags.has('write') || process.env.WRITE_HTML === '1' || args.includes('--write');
  const baseUrlOverride = parsed.kv.qrBaseUrl || process.env.QR_BASE_URL || '';
  const outDirOverride = parsed.kv.outDir || '';

  const outRoot = outDirOverride
    ? (path.isAbsolute(outDirOverride) ? outDirOverride : path.join(process.cwd(), outDirOverride))
    : path.join(process.cwd(), 'paper-wallet', 'output');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dataDir = path.join(outRoot, `wallet-${timestamp}`);
  ensureDir(dataDir);
  ensureDir(outRoot);

  // Pre-compute output filenames so the HTML can link to them
  const mnemonicTxt = path.join(outRoot, `mnemonic-${timestamp}.txt`);
  const addressesTxt = path.join(outRoot, `addresses-${timestamp}.txt`);

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
  fs.writeFileSync(mnemonicTxt, words.join(' '), { encoding: 'utf8', flag: 'wx' });
  fs.writeFileSync(addressesTxt, addresses.join('\n'), { encoding: 'utf8', flag: 'wx' });
  const mnemonicSha256 = sha256FileHex(mnemonicTxt);
  const addressesSha256 = sha256FileHex(addressesTxt);

  // 6) Optionally write printable HTML
  if (writeHtml) {
    const qrLibInline = await fetchQrLibInline();
    const baseUrl = baseUrlOverride;
    let shortCodes = [];
    let qrTargets = addresses.slice();
    if (baseUrl) {
      shortCodes = addresses.map((addr, idx) => makeShortCode(addr, idx));
      qrTargets = shortCodes.map(code => joinUrl(baseUrl, code));
      writeResolverAssets(outRoot, shortCodes, addresses);
    }
    const html = renderHtml({
      network,
      words,
      addresses,
      addressesFile: path.basename(addressesTxt),
      mnemonicFile: path.basename(mnemonicTxt),
      timestamp,
      qrLibInline,
      qrTargets,
      checksums: { mnemonicSha256, addressesSha256 },
    });
    const htmlPath = path.join(outRoot, `paper-wallet-${timestamp}.html`);
    fs.writeFileSync(htmlPath, html, { encoding: 'utf8', flag: 'wx' });
    console.log(`\nWrote files:\n- ${htmlPath}\n- ${mnemonicTxt}\n- ${addressesTxt}`);
  } else {
    console.log(`\nWrote files:\n- ${mnemonicTxt}\n- ${addressesTxt}`);
    console.warn('[Info] Skipped writing HTML. Pass --write or set WRITE_HTML=1 to save a printable file.');
  }
})();


