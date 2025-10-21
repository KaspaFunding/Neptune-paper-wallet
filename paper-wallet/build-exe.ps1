param(
  [ValidateSet('x64')]
  [string]$Arch = 'x64'
)

$ErrorActionPreference = 'Stop'

pushd $PSScriptRoot | Out-Null

if (-not (Test-Path 'package.json')) { throw 'Run from paper-wallet directory' }

# Ensure dependencies
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm not found in PATH' }
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { throw 'npx not found in PATH' }

# Install pkg locally so CI and users without global install can build
if (-not (Test-Path 'node_modules/.bin/pkg.cmd')) {
  npm install --no-audit --no-fund --save-dev pkg | Out-Null
}

New-Item -ItemType Directory -Force -Path 'dist' | Out-Null

# Build Windows EXE using Node 18 runtime (widely supported by pkg)
npx --yes pkg . --target node18-win-$Arch --output dist/neptune-paper-wallet.exe

Write-Output "Built $PWD\dist\neptune-paper-wallet.exe"

popd | Out-Null


