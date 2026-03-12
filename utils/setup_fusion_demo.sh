#!/usr/bin/env bash
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
#
# ──────────────────────────────────────────────────────────────────────────
# Fusion Demo — one command to spin up CVAT with a pre-seeded fusion project
#
# Usage:
#   ./utils/setup_fusion_demo.sh          # start everything
#   ./utils/setup_fusion_demo.sh --down   # tear down
#
# What happens:
#   1. Starts CVAT via docker compose (main + fusion-demo overlay)
#   2. An init container creates an admin user, a project with 2D + 3D tasks,
#      and linked sample annotations — all automatically
#   3. Prints the Fusion Viewer URL
#
# Credentials: admin / admin  (override with CVAT_DEMO_USER / CVAT_DEMO_PASS)
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.fusion-demo.yml"

if [[ "${1:-}" == "--down" ]]; then
  echo "Tearing down fusion demo …"
  docker compose $COMPOSE_FILES down -v
  exit 0
fi

echo "Starting CVAT + Fusion Demo …"
docker compose $COMPOSE_FILES up -d

echo ""
echo "Waiting for the fusion demo init container to finish …"
echo "(this may take 1–2 minutes on first run)"
echo ""

# Follow the init container logs; it exits when done
docker compose $COMPOSE_FILES logs -f cvat_fusion_demo_init 2>&1 &
LOG_PID=$!

# Wait for the container to finish (timeout 5 min)
TIMEOUT=300
for i in $(seq 1 $TIMEOUT); do
  STATUS=$(docker inspect -f '{{.State.Status}}' cvat_fusion_demo_init 2>/dev/null || echo "unknown")
  if [[ "$STATUS" == "exited" ]]; then
    EXIT_CODE=$(docker inspect -f '{{.State.ExitCode}}' cvat_fusion_demo_init 2>/dev/null || echo "1")
    kill $LOG_PID 2>/dev/null || true
    wait $LOG_PID 2>/dev/null || true
    if [[ "$EXIT_CODE" == "0" ]]; then
      echo ""
      echo "Demo setup complete! Open http://localhost:8080 and log in with admin/admin."
      exit 0
    else
      echo ""
      echo "ERROR: Demo init failed with exit code $EXIT_CODE."
      echo "Check logs: docker compose $COMPOSE_FILES logs cvat_fusion_demo_init"
      exit 1
    fi
  fi
  sleep 1
done

kill $LOG_PID 2>/dev/null || true
echo "ERROR: Demo init timed out after ${TIMEOUT}s."
exit 1
