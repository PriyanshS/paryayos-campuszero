#!/usr/bin/env bash
# Build script for Render deployment
# Installs Node.js dependencies and Python (already available on Render)

set -e

echo "=== Environment Info ==="
node -v
npm -v
python3 --version

echo "=== Cleaning node_modules cache ==="
rm -rf node_modules package-lock.json

echo "=== Installing dependencies (forcing source build) ==="
# Force build-from-source for better-sqlite3
npm install --production --build-from-source

echo "=== Verifying native modules ==="
npm rebuild better-sqlite3

echo "=== Build complete ==="
