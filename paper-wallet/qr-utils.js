'use strict';

const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function fetchQrLibInline() {
  const url = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) { resolve(null); return; }
      res.setEncoding('utf8');
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(4000, () => { req.destroy(); resolve(null); });
  });
}

function makeShortCode(address, index) {
  const hash = crypto.createHash('sha256').update(address).digest('base64url').slice(0, 10);
  return `${index}-${hash}`;
}

function joinUrl(base, code) {
  if (!base) return code;
  return base.endsWith('/') ? (base + code) : (base + '/' + code);
}

function writeResolverAssets(outRoot, codes, addresses) {
  const resolverDir = path.join(outRoot, 'resolver');
  fs.mkdirSync(resolverDir, { recursive: true });
  const mapping = {};
  codes.forEach((code, i) => { mapping[code] = addresses[i]; });
  fs.writeFileSync(path.join(resolverDir, 'codes.json'), JSON.stringify(mapping, null, 2), { encoding: 'utf8' });
  const indexHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Neptune QR Resolver</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; padding:24px; margin:0;}
      .container{max-width:720px;margin:0 auto}
      .panel{border:1px solid #e5e7eb;border-radius:12px;padding:16px}
      .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .btn{appearance:none;border:1px solid #e5e7eb;padding:8px 12px;border-radius:8px;cursor:pointer;font-weight:600}
      .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Neptune QR Resolver</h1>
      <div id="status" class="panel">Resolving…</div>
    </div>
    <script>
      (async function(){
        const code = (location.pathname.split('/').filter(Boolean).pop()||'').trim();
        const status = document.getElementById('status');
        try{
          const res = await fetch('codes.json', { cache: 'no-cache' });
          const map = await res.json();
          const addr = map[code];
          if(!addr){ status.textContent = 'Unknown code'; return; }
          status.innerHTML = '<div class="row"><strong>Address</strong></div>'+
            '<div class="mono" style="margin:8px 0; word-break:break-all">'+addr+'</div>'+
            '<div class="row"><button class="btn" id="copyBtn">Copy</button></div>'+
            '<div class="row" style="color:#6b7280;margin-top:8px">This page is local-only and does not transmit your address.</div>';
          const btn = document.getElementById('copyBtn');
          btn.onclick = async () => { try { await navigator.clipboard.writeText(addr); btn.textContent = 'Copied'; setTimeout(()=>btn.textContent='Copy', 1200);} catch(e){ alert('Copy failed'); } };
        }catch(e){ status.textContent='Failed to resolve code.'; }
      })();
    </script>
  </body>
</html>`;
  fs.writeFileSync(path.join(resolverDir, 'index.html'), indexHtml, { encoding: 'utf8' });
}

module.exports = {
  fetchQrLibInline,
  makeShortCode,
  joinUrl,
  writeResolverAssets,
};


