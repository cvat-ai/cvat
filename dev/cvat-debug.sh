#!/usr/bin/env bash

set -euo pipefail

# Prefer Buildx Bake when available for faster Compose builds.
export COMPOSE_BAKE="${COMPOSE_BAKE:-true}"

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
Usage: ./dev/cvat-debug.sh <command> [args]

Commands:
  build-server                    Build debug image (FROM prebuilt cvat/server:dev + debugpy)
  up                              Start core stack
  up-workers                      Start worker profile services
  up-analytics                    Start analytics profile services
  createsuperuser                 Run Django createsuperuser in cvat_server
  vscode                          Start server+workers and open VS Code
  restart-server                  Restart cvat_server
  restart-worker <service>        Restart one worker service (e.g. cvat_worker_import)
  logs [service]                  Follow logs (default: cvat_server)
  ps                              Show compose services status
  clean                           Stop and remove containers
  distclean                       Stop and remove containers + volumes
  clobber                         Aggressive cleanup of leftover network/volumes/containers
  help                            Show this help

Most common workflow:
  1) First time setup:
       ./dev/cvat-debug.sh build-server
       ./dev/cvat-debug.sh up-workers
       ./dev/cvat-debug.sh createsuperuser
  2) Daily start:
       ./dev/cvat-debug.sh up-workers
  3) Debug in VS Code:
       ./dev/cvat-debug.sh vscode
       # then run "docker: attach backend debug" launch config
  4) After backend code changes:
       ./dev/cvat-debug.sh restart-server
  5) Cleanup:
       ./dev/cvat-debug.sh clean
       ./dev/cvat-debug.sh distclean
       ./dev/cvat-debug.sh clobber   # only if resources remain in use
EOF
}

cmd="${1:-help}"
shift || true

case "$cmd" in
  build-server)
    compose build cvat_server
    ;;
  up)
    compose up -d --build
    ;;
  up-workers)
    compose --profile workers up -d --build
    ;;
  up-analytics)
    compose --profile analytics up -d
    ;;
  createsuperuser)
    compose exec cvat_server python3 manage.py createsuperuser
    ;;
  vscode)
    compose --profile workers up -d --build
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
      echo "Missing worker service name. Example: ./dev/cvat-debug.sh restart-worker cvat_worker_import" >&2
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
  clean|down)
    compose down
    ;;
  distclean|down-v)
    compose down -v --remove-orphans
    ;;
  clobber|hard-clean)
    compose down -v --remove-orphans || true

    # Remove any leftovers still attached to the project network.
    dangling_containers="$(docker ps -aq --filter network=cvat_cvat || true)"
    if [[ -n "${dangling_containers}" ]]; then
      docker rm -f ${dangling_containers} || true
    fi

    # Remove common leftovers that can stay "in use" after interrupted runs.
    docker network rm cvat_cvat >/dev/null 2>&1 || true
    docker volume rm cvat_cvat_data cvat_cvat_logs cvat_cvat_keys >/dev/null 2>&1 || true
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
