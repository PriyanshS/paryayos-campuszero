#!/usr/bin/env bash
# Build script for Render deployment
# Installs Node.js dependencies and Python (already available on Render)

set -e

echo "=== System Environment ==="
node -v
npm -v
python3 --version

# Verification: Better-sqlite3 .109 MUST have Node 18
if [[ $(node -v) != v18* ]]; then
  echo "ERROR: Current Node version $(node -v) does not match required v18 (libnode.so.109)."
  exit 1
fi

echo "=== Nuclear Cleanup ==="
rm -rf node_modules package-lock.json
npm cache clean --force

echo "=== Installing Dependencies ==="
npm install --production

echo "=== Rebuilding native modules ==="
npm rebuild better-sqlite3

echo "=== Build complete ==="
