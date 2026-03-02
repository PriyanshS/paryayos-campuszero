#!/usr/bin/env bash
# Build script for Render deployment
# Installs Node.js dependencies and Python (already available on Render)

set -e

echo "=== Installing Node.js dependencies ==="
npm install --production

echo "=== Verifying Python3 ==="
python3 --version

echo "=== Build complete ==="
