#!/usr/bin/env bash
# Build script for Render deployment
# Installs Node.js dependencies and Python (already available on Render)

set -e

echo "=== Cleaning node_modules cache ==="
rm -rf node_modules

echo "=== Installing Node.js dependencies ==="
npm install --production

echo "=== Rebuilding native modules ==="
npm rebuild better-sqlite3

echo "=== Verifying Python3 ==="
python3 --version

echo "=== Build complete ==="
