#!/usr/bin/env bash
# Post-create setup for the CVAT Fusion dev container.
# Runs once after the container is built.

set -euo pipefail

echo "==> Installing Yarn via corepack..."
corepack enable
corepack prepare yarn@4.9.2 --activate

echo "==> Installing JS dependencies (yarn --immutable)..."
cd /workspace
DISABLE_HUSKY=1 yarn install --immutable

echo "==> Building workspace packages..."
yarn run build:cvat-data
yarn run build:cvat-core
yarn run build:cvat-canvas
yarn run build:cvat-canvas3d

echo "==> Installing Python SDK (editable)..."
pip install -e /workspace/cvat-sdk -e /workspace/cvat-cli 2>/dev/null || \
    pip install --user -e /workspace/cvat-sdk -e /workspace/cvat-cli

echo ""
echo "============================================"
echo "  Dev container ready!"
echo ""
echo "  Start the UI dev server:"
echo "    yarn workspace cvat-ui run start"
echo ""
echo "  Run fusion export:"
echo "    python utils/fusion_export.py --help"
echo ""
echo "  CVAT backend is available at:"
echo "    http://cvat_server:8080  (from container)"
echo "    http://localhost:8080    (from host)"
echo "============================================"
