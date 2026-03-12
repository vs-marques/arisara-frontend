#!/bin/sh
set -e

echo "[$(date)] Starting Railway entrypoint"
echo "Node: $(node -v)"
echo "NPM: $(npm -v)"
echo "Working directory: $(pwd)"
echo "Environment PORT: ${PORT}"

echo "[$(date)] Installing dependencies (including dev)"
npm ci --prefer-offline --no-audit --progress=false

echo "[$(date)] Running build:hmg"
npm run build:hmg

echo "[$(date)] dist contents:"
ls -al dist || true

echo "[$(date)] Launching static server on port ${PORT}"
npx serve -s dist -l tcp://0.0.0.0:${PORT} --no-clipboard


