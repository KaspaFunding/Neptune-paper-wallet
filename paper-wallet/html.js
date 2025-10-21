'use strict';

function renderHtml({ network, words, addresses, addressesFile, mnemonicFile, timestamp, qrLibInline, qrTargets, checksums }) {
  const seedPhraseOneLine = words.join(' ');
  const escapedWords = words.map((w, i) => `${i + 1}. ${w}`).join('<br/>');
  const addrList = buildAddressListHtml(addresses, qrTargets);
  const pageTitle = `Neptune Paper Wallet — ${network} — ${timestamp}`;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${pageTitle}</title>
    <style>
      :root {
        --bg: #0b0c10;
        --panel: #12151a;
        --text: #e5e7eb;
        --muted: #9aa3af;
        --accent: #4f46e5;
        --accent-2: #22c55e;
        --warn: #ef4444;
        --border: #2a2f3a;
      }
      @media (prefers-color-scheme: light) {
        :root {
          --bg: #f6f7f9;
          --panel: #ffffff;
          --text: #0b1220;
          --muted: #4b5563;
          --border: #e5e7eb;
        }
      }
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; color: var(--text); background: radial-gradient(1200px 800px at 10% 10%, #111827 0%, var(--bg) 50%); }
      .container { max-width: 980px; margin: 0 auto; padding: 24px; }
      header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
      .title { display: flex; flex-direction: column; gap: 6px; }
      h1 { margin: 0; font-size: 24px; letter-spacing: 0.3px; }
      .sub { color: var(--muted); font-size: 13px; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .btn { appearance: none; border: 1px solid var(--border); background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0)); color: var(--text); padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
      .btn:hover { border-color: #566; }
      .btn.primary { border-color: transparent; background: linear-gradient(180deg, var(--accent), #4338ca); color: white; }
      .btn.success { border-color: transparent; background: linear-gradient(180deg, var(--accent-2), #16a34a); color: #062a19; }
      .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
      @media (min-width: 900px) { .grid { grid-template-columns: 1.1fr 0.9fr; } }
      .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 18px; box-shadow: 0 20px 40px rgba(0,0,0,0.25), inset 0 1px rgba(255,255,255,0.04); }
      .panel h2 { margin-top: 0; font-size: 18px; }
      .warning { border-left: 4px solid var(--warn); background: rgba(239,68,68,0.08); }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      .seed { font-size: 14px; line-height: 1.9; column-count: 2; column-gap: 24px; }
      @media (max-width: 640px) { .seed { column-count: 1; } }
      .addr-item { padding: 8px 0; border-bottom: 1px dashed var(--border); }
      .addr-item:last-child { border-bottom: 0; }
      .kbd { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: #0b1220; color: #e5e7eb; padding: 2px 6px; border-radius: 6px; border: 1px solid #1f2937; }
      footer { margin-top: 18px; color: var(--muted); font-size: 12px; text-align: center; }
      .muted { color: var(--muted); }
      .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .address { word-break: break-all; overflow-wrap: anywhere; white-space: normal; line-height: 1.6; }
      @media print {
        body { background: white; }
        header .actions { display: none; }
        .btn { display: none; }
        .panel { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div class="title">
          <h1>Neptune Paper Wallet</h1>
          <div class="sub">Network: <span class="kbd">${network}</span> · Timestamp: <span class="kbd">${timestamp}</span></div>
        </div>
        <div class="actions">
          <button class="btn primary" onclick="window.print()">🖨️ Print</button>
          <a class="btn" href="${addressesFile}" download>⬇️ Download addresses.txt</a>
          <a class="btn" href="${mnemonicFile}" download>⬇️ Download mnemonic.txt</a>
          <button class="btn" onclick="downloadHtml()">⬇️ Download this HTML</button>
        </div>
      </header>

      <div class="panel warning" style="margin-bottom:16px">
        <strong>Security Notice:</strong> Keep this page and files offline and private. Anyone with the seed phrase can spend your funds.
      </div>

      <div class="grid">
        <section class="panel">
          <h2>Receive Address(es)</h2>
          <div class="muted" style="margin-bottom:6px">Share these addresses to receive funds.</div>
          ${addrList}
        </section>

        <section class="panel">
          <div class="row" style="justify-content:space-between">
            <h2 style="margin-bottom:6px">Seed Phrase (18 words)</h2>
            <div class="row">
              <button class="btn success" onclick="copySeed()">📋 Copy</button>
            </div>
          </div>
          <div class="seed mono">${escapedWords}</div>
          <div class="muted" style="margin-top:10px">Write this down carefully. Do not store digitally unless encrypted and offline.</div>
        </section>
      </div>

      <section class="panel" style="margin-top:16px">
        <h2>Important - Recovery Limitations</h2>
        <ul>
          <li>
            Mnemonic + blockchain can recover funds received with <strong>on-chain UTXO notifications</strong> (ciphertexts embedded on-chain).
          </li>
          <li>
            Funds received via <strong>off-chain UTXO notifications</strong> require additional data (incoming randomness) that is <em>not</em> derivable from the mnemonic.
          </li>
          <li>
            If you expect off-chain transfers, ensure you obtain the transfer file(s) or consolidate to yourself via an on-chain notification.
          </li>
        </ul>
      </section>

      <section class="panel" style="margin-top:16px">
        <h2>Restore Instructions</h2>
        <ol>
          <li>Run <span class="mono">neptune-cli import-seed-phrase --network ${network}</span> and enter the 18 words in order.</li>
          <li>Verify an address: <span class="mono">neptune-cli nth-receiving-address 0 --network ${network}</span>.</li>
          <li>Compare with the address shown above. If mismatched, stop and re-try import.</li>
        </ol>
      </section>

      <section class="panel" style="margin-top:16px">
        <h2>File Integrity</h2>
        <div class="muted">Use these checksums to verify exported files:</div>
        <div class="mono" style="margin-top:8px">
          mnemonic.txt — SHA-256: ${checksums ? checksums.mnemonicSha256 : ''}<br/>
          addresses.txt — SHA-256: ${checksums ? checksums.addressesSha256 : ''}
        </div>
      </section>

      <footer>
        Generated by Neptune tools · ${timestamp}
      </footer>
    </div>

    <script>
      ${qrLibInline ? qrLibInline : '// QRCode library unavailable (offline at generation time). Show QR will fallback to an alert.'}
      const PAGE_TIMESTAMP = ${JSON.stringify(timestamp)};
      const SEED_ONE_LINE = ${JSON.stringify(seedPhraseOneLine)};
      async function copySeed() {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(SEED_ONE_LINE);
            alert('Seed phrase copied to clipboard.');
          } else {
            const ta = document.createElement('textarea');
            ta.value = SEED_ONE_LINE; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta);
            alert('Seed phrase copied to clipboard.');
          }
        } catch (e) {
          alert('Copy failed: ' + (e && e.message ? e.message : e));
        }
      }
      async function copyAddress(addr) { try { await navigator.clipboard.writeText(addr); alert('Address copied.'); } catch(e) { alert('Copy failed: ' + e); } }
      function toggleQR(textToEncode, elId, btnEl) {
        const el = document.getElementById(elId);
        if (!el) return;
        const isHidden = el.style.display === 'none' || !el.style.display;
        if (isHidden) {
          el.innerHTML = '';
          if (window.QRCode) {
            try {
              new QRCode(el, { text: textToEncode, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.L });
            } catch (e) {
              el.innerHTML = '<div class="muted">Unable to render QR. Content too large. Configure QR_BASE_URL to use a short-code.</div>';
            }
          } else {
            alert('QR library not embedded (generation was offline).');
          }
          el.style.display = 'block';
          if (btnEl) btnEl.textContent = '▣ Hide QR';
        } else {
          el.style.display = 'none';
          el.innerHTML = '';
          if (btnEl) btnEl.textContent = '▣ Show QR';
        }
      }
      function downloadHtml() {
        const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'paper-wallet-' + PAGE_TIMESTAMP + '.html';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  </body>
</html>`;
}

function buildAddressListHtml(addresses, qrTargets) {
  return addresses.map((a, i) => `
          <div class="addr-item">
            <div class="row" style="justify-content:space-between">
              <div><strong>#${i}:</strong></div>
              <div class="row">
                <button class="btn" onclick='copyAddress(${JSON.stringify(a)})'>📋 Copy</button>
                <button class="btn" onclick='toggleQR(${JSON.stringify(qrTargets ? qrTargets[i] : a)}, "qr-${i}", this)'>▣ Show QR</button>
              </div>
            </div>
            <div class="mono address">${a}</div>
            <div id="qr-${i}" class="panel" style="display:none; margin-top:10px; padding:12px"></div>
          </div>
  `).join('');
}

module.exports = {
  renderHtml,
};


