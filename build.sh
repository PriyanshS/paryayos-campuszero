#!/usr/bin/env bash
# Build script for Render deployment
# Installs Node.js dependencies and Python (already available on Render)

set -e

echo "=== Installing Dependencies ==="
npm install --production

echo "=== Build complete ==="
