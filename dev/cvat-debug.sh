#!/usr/bin/env bash

set -euo pipefail

# Prefer Buildx Bake when available for faster Compose builds.
export COMPOSE_BAKE="${COMPOSE_BAKE:-true}"

compose() {
  if [[ "${1:-}" == "--base" ]]; then
    shift
    docker compose -f docker-compose.yml -f docker-compose.dev.yml "$@"
  else
    docker compose -f docker-compose.yml -f docker-compose.dev.yml -f dev/docker-compose.debug.yml "$@"
  fi
}

usage() {
  cat <<'EOF'
Usage: ./dev/cvat-debug.sh <command> [args]

Commands:
  build-debug                     Build debug image (FROM prebuilt cvat/server:dev + debugpy)
  build-all                       Rebuild local cvat/server:dev and refresh debug image
  doctor                          Check required/optional local tooling
  up                              Start core stack
  up-workers                      Start worker profile services
  up-analytics                    Start analytics profile services
  createsuperuser                 Run Django createsuperuser in cvat_server
  vscode                          Start server+workers and open VS Code
  restart-server                  Fast restart of API process (uvicorn) inside cvat_server
  restart-server-full             Full container restart of cvat_server
  restart-worker <service>        Restart one worker service (e.g. cvat_worker_import)
  logs [service]                  Follow logs (default: cvat_server)
  ps                              Show compose services status
  clean                           Stop and remove containers
  distclean                       Stop and remove containers + volumes
  clobber                         Aggressive cleanup of leftover network/volumes/containers
  help                            Show this help

Most common workflow:
  1) First time setup:
       ./dev/cvat-debug.sh build-debug
       ./dev/cvat-debug.sh up-workers
       ./dev/cvat-debug.sh createsuperuser
  2) Daily start:
       ./dev/cvat-debug.sh up-workers
  3) Debug in VS Code:
       ./dev/cvat-debug.sh vscode
       # then run "docker: attach backend debug" launch config
  4) After backend code changes:
       ./dev/cvat-debug.sh restart-server
       # use restart-server-full when env/supervisord/nginx/image-level changes require full re-init
  5) Cleanup:
       ./dev/cvat-debug.sh clean
       ./dev/cvat-debug.sh distclean
       ./dev/cvat-debug.sh clobber   # only if resources remain in use
EOF
}

cmd="${1:-help}"
shift || true

timer_source="seconds"
timer_start="0"

if [[ -n "${EPOCHREALTIME:-}" ]]; then
  timer_source="epochrealtime"
  timer_start="$EPOCHREALTIME"
elif command -v python3 >/dev/null 2>&1; then
  timer_source="python3"
  timer_start="$(python3 -c 'import time; print(f"{time.time():.6f}")')"
else
  SECONDS=0
fi

report_timing() {
  case "$timer_source" in
    epochrealtime)
      # Pure bash math for portability: avoid requiring awk/python/perl.
      local end start_s start_us end_s end_us start_ms end_ms elapsed_ms
      end="${EPOCHREALTIME:-$timer_start}"
      start_s="${timer_start%.*}"
      start_us="${timer_start#*.}"
      end_s="${end%.*}"
      end_us="${end#*.}"
      start_ms=$((10#$start_s * 1000 + 10#${start_us:0:3}))
      end_ms=$((10#$end_s * 1000 + 10#${end_us:0:3}))
      elapsed_ms=$((end_ms - start_ms))
      if (( elapsed_ms < 0 )); then
        elapsed_ms=0
      fi
      printf '[cvat-debug][%s] elapsed real time: %d.%03ds\n' "$cmd" $((elapsed_ms / 1000)) $((elapsed_ms % 1000)) >&2
      ;;
    python3)
      python3 - "$timer_start" "$cmd" <<'PY'
import sys
import time

start = float(sys.argv[1])
cmd = sys.argv[2]
print(f"[cvat-debug][{cmd}] elapsed real time: {time.time() - start:.3f}s", file=sys.stderr)
PY
      ;;
    *)
      printf '[cvat-debug][%s] elapsed real time: %ss\n' "$cmd" "$SECONDS" >&2
      ;;
  esac
}
trap report_timing EXIT

case "$cmd" in
  doctor)
    missing=0
    for tool in docker; do
      if ! command -v "$tool" >/dev/null 2>&1; then
        echo "missing required tool: $tool" >&2
        missing=1
      fi
    done

    if ! docker compose version >/dev/null 2>&1; then
      echo "missing required feature: docker compose plugin" >&2
      missing=1
    fi

    if command -v code >/dev/null 2>&1; then
      echo "optional tool detected: code (VS Code CLI)"
    else
      echo "optional tool missing: code (needed only for 'vscode' command)"
    fi

    if command -v python3 >/dev/null 2>&1; then
      echo "optional tool detected: python3 (used for timer fallback)"
    else
      echo "optional tool missing: python3 (timer falls back to 1s granularity)"
    fi

    if (( missing != 0 )); then
      exit 1
    fi
    ;;
  build-debug|build-server)
    compose build cvat_server
    ;;
  build-all|rebuild-server-local)
    compose --base build cvat_server
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
    # Fast path: restart only ASGI process under supervisord, avoid full container init path.
    if ! compose exec cvat_server supervisorctl -s unix:///tmp/supervisord/supervisor.sock restart "uvicorn:*" >/dev/null 2>&1; then
      echo "Fast restart failed; falling back to full container restart..." >&2
      compose restart cvat_server
    fi
    ;;
  restart-server-full)
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
    # Workers are started via optional profiles. Without --remove-orphans,
    # profile-created containers can stay running and keep project resources in use.
    compose down --remove-orphans
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
