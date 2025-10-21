# Neptune Paper Wallet (Standalone HTML Export)

This tool generates a secure, offline paper wallet and a stylish HTML you can print or download. It currently shells out to `neptune-cli` for wallet creation and address derivation, but the output experience is now streamlined with copy, print, and download actions.

- Creates a fresh wallet in an isolated data directory
- Exports the 18‑word BIP‑39 seed phrase
- Derives the first N Generation receiving addresses
- Writes plaintext helpers: `mnemonic-<timestamp>.txt`, `addresses-<timestamp>.txt`
- Optionally writes a polished HTML: `paper-wallet-<timestamp>.html` with buttons for Print, Copy, Download, and per-address QR codes

## Requirements

- A built `neptune-cli` binary (or set `NEPTUNE_CLI_PATH` to it)
- Windows PowerShell or Node.js on your system

## Usage

From the repository root:

```bash
node .\paper-wallet\generate-paper-wallet.js --write
```

Environment variables:

- `NEPTUNE_CLI_PATH` (optional): absolute path to `neptune-cli.exe`
- `NETWORK` (optional): `main` (default) or `test`
- `NUM_ADDRESSES` (optional): number of addresses to derive (default 1, max 50)
- `WRITE_HTML=1` or `--write`: write a printable HTML under `paper-wallet/output/`

Examples:

```bash
# Default (mainnet, 1 address), print to console only
node .\paper-wallet\generate-paper-wallet.js

# Testnet with 5 addresses and printable HTML
$env:NETWORK='test'; $env:NUM_ADDRESSES='5'; $env:WRITE_HTML='1'; node .\paper-wallet\generate-paper-wallet.js
```

### CLI flag examples

```powershell
# Generate one address on mainnet and write the printable HTML
node .\paper-wallet\generate-paper-wallet.js --write --network main --count 1

# Generate with short-link QR and write outputs to a specific directory
# --qr-base-url enables single-scan QR codes (resolver files are written under out-dir\resolver)
node .\paper-wallet\generate-paper-wallet.js --write --qr-base-url http://localhost:8080 --out-dir .\paper-wallet\output
```

- The first command creates a new wallet, derives 1 mainnet address, and writes a polished HTML paper-wallet alongside `mnemonic-<timestamp>.txt` and `addresses-<timestamp>.txt`.
- The second command additionally enables the short-link QR mode using `--qr-base-url`. It writes a `resolver/` folder into the provided `--out-dir` containing `index.html` and `codes.json` for resolving short codes to full addresses. Serve that folder at the same base URL to use the single-scan QR flow.

## Output files and UX

All generated files are written to `paper-wallet/output/`:

- `mnemonic-<timestamp>.txt` — the 18-word seed in one line
- `addresses-<timestamp>.txt` — one address per line
- `paper-wallet-<timestamp>.html` — a stylish, printable page with:
  - Print button
  - Download buttons for the `.txt` files and the HTML itself
  - Copy-to-clipboard for the seed phrase
  - Per-address QR codes (toggle Show QR)

Open the HTML file directly in your browser to use these actions completely offline.

### About QR codes and long Neptune addresses

- Neptune Generation addresses are very long (bech32m). A single standard QR cannot hold the full text reliably.
- You have two options in this export:
  - Multi-QR (offline): toggle Show QR to view segmented QRs. Scan all segments to reconstruct the address manually.
  - One-scan short link (recommended): set `QR_BASE_URL`. Each QR encodes a short URL; scanning opens a tiny resolver page that displays the full address text.

To enable one-scan short links:

```powershell
$env:WRITE_HTML='1'
$env:QR_BASE_URL='http://localhost:8080'
node .\paper-wallet\generate-paper-wallet.js

# Serve the resolver folder so the short links work
cd .\paper-wallet\output\resolver
python -m http.server 8080
```

- The exporter writes `resolver/index.html` and `resolver/codes.json` under `paper-wallet/output/`.
- Host that folder at `QR_BASE_URL`. Each address gets a short code; scanning the QR opens the resolver showing the full address for easy copy.

Note: The HTML tries to embed a tiny QR code library at generation time. If offline during generation, the page still works; QR will show a notice instead of rendering.

## Security notes

- Treat the 18‑word phrase like cash. Anyone with it can spend funds.
- Prefer running this on an offline machine; print the HTML and store safely.
- The script never uploads data; it shells out to your local `neptune-cli` and writes only to `paper-wallet/output/`.

## How it works (internals)

- `neptune-cli generate-wallet` creates a wallet in a timestamped data dir
- `neptune-cli export-seed-phrase` prints the 18‑word mnemonic
- `neptune-cli nth-receiving-address i --network <main|test>` prints address `#i`
- Output is formatted for console and optionally saved to HTML
$env:WRITE_HTML='1'; $env:QR_BASE_URL='http://localhost:8080'; node .\paper-wallet\generate-paper-wallet.js  