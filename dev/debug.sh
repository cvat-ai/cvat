#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILES=(
  -f docker-compose.yml
  -f docker-compose.dev.yml
  -f dev/docker-compose.debug.yml
)

compose() {
  docker compose "${COMPOSE_FILES[@]}" "$@"
}

usage() {
  cat <<'EOF'
Usage: ./dev/debug.sh <command> [args]

Commands:
  build-server                    Build cvat_server image (with debug tooling)
  up                              Start core stack
  up-workers                      Start worker profile services
  up-analytics                    Start analytics profile services
  createsuperuser                 Run Django createsuperuser in cvat_server
  vscode                          Start server+workers and open VS Code
  restart-server                  Restart cvat_server
  restart-worker <service>        Restart one worker service (e.g. cvat_worker_import)
  logs [service]                  Follow logs (default: cvat_server)
  ps                              Show compose services status
  down                            Stop and remove containers
  down-v                          Stop and remove containers + volumes
  help                            Show this help
EOF
}

cmd="${1:-help}"
shift || true

case "$cmd" in
  build-server)
    compose build cvat_server
    ;;
  up)
    compose up -d
    ;;
  up-workers)
    compose --profile workers up -d
    ;;
  up-analytics)
    compose --profile analytics up -d
    ;;
  createsuperuser)
    compose exec cvat_server python3 manage.py createsuperuser
    ;;
  vscode)
    compose --profile workers up -d
    if command -v code >/dev/null 2>&1; then
      code .
    else
      echo "VS Code CLI not found. Install it from VS Code: Command Palette -> 'Shell Command: Install \"code\" command in PATH'" >&2
      exit 1
    fi
    ;;
  restart-server)
    compose restart cvat_server
    ;;
  restart-worker)
    service="${1:-}"
    if [[ -z "$service" ]]; then
      echo "Missing worker service name. Example: ./dev/debug.sh restart-worker cvat_worker_import" >&2
      exit 1
    fi
    compose restart "$service"
    ;;
  logs)
    service="${1:-cvat_server}"
    compose logs -f "$service"
    ;;
  ps)
    compose ps
    ;;
  down)
    compose down
    ;;
  down-v)
    compose down -v --remove-orphans
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage
    exit 1
    ;;
esac
