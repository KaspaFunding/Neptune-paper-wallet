# Neptune Paper Wallet (CLI wrapper)

This script wraps `neptune-cli` to generate a secure, offline “paper wallet”.

- Creates a fresh wallet in an isolated data directory
- Exports the 18-word BIP‑39 seed phrase
- Derives the first N Generation receiving addresses
- Optionally writes a printable HTML file

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

## Security notes

- Treat the 18‑word phrase like cash. Anyone with it can spend funds.
- Prefer running this on an offline machine; print the HTML and store safely.
- The script never uploads data; it shells out to your local `neptune-cli` and writes only to `paper-wallet/output/` when `--write` is set.

## How it works (internals)

- `neptune-cli generate-wallet` creates a wallet in a timestamped data dir
- `neptune-cli export-seed-phrase` prints the 18‑word mnemonic
- `neptune-cli nth-receiving-address --index i` prints address `#i`
- Output is formatted for console and optionally saved to HTML
