#!/usr/bin/env bash

set -euo pipefail

export COMPOSE_BAKE="${COMPOSE_BAKE:-true}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd -P)"

CVAT_VERSION_VALUE="dev"
CVAT_DEBUG_WAIT_VALUE="no"
CVAT_LOCAL_UI_PORT_VALUE="3000"

usage() {
  cat <<'EOF'
Usage: ./dev/cvat-local.sh [options] <command> [args]

Options:
  --version <tag>       Use another cvat/server:<tag> as the debug image base (default: dev)
  --ui-port <port>      Expose the UI development server on another port (default: 3000)
  --wait-debugger       Make backend containers wait for a debugger on startup
  -h, --help            Show this help

Commands:
  doctor                         Check required and optional local tooling
  bootstrap                      Build local images and install UI dependencies in Docker volumes
  compose-config                 Print the effective Docker Compose config
  up                             Start the core CVAT stack
  up-workers                     Start the core stack with worker services
  up-ui                          Start the core stack with the containerized UI dev server
  up-full                        Start core, workers, and UI development services
  up-analytics                   Start analytics profile services
  down                           Stop local development containers
  createsuperuser                Run Django createsuperuser in cvat_server
  shell <server|ui>              Open a shell in a development container
  exec <service> -- <cmd...>     Execute a command in a running Compose service
  logs [service]                 Follow logs (default: cvat_server)
  ps                             Show Compose services status
  restart <server|server-full|ui|worker> [worker-service]
  check-ui                       Run the standard cvat-ui sanity checks
  clean                          Stop and remove containers
  distclean                      Stop and remove containers and volumes
  clobber                        Aggressively remove stuck local CVAT resources
  vscode                         Start workers and open VS Code
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

log() {
  echo "[cvat-local] $*" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      [[ $# -ge 2 ]] || die "--version requires a value"
      CVAT_VERSION_VALUE="$2"
      shift 2
      ;;
    --ui-port)
      [[ $# -ge 2 ]] || die "--ui-port requires a value"
      CVAT_LOCAL_UI_PORT_VALUE="$2"
      shift 2
      ;;
    --wait-debugger)
      CVAT_DEBUG_WAIT_VALUE="yes"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      die "unknown option: $1"
      ;;
    *)
      break
      ;;
  esac
done

cmd="${1:-help}"
if [[ $# -gt 0 ]]; then
  shift
fi

export CVAT_VERSION="${CVAT_VERSION_VALUE}"
export CVAT_LOCAL_SERVER_IMAGE="cvat/server:${CVAT_VERSION_VALUE}-debug"
export CVAT_LOCAL_UI_IMAGE="cvat/ui:${CVAT_VERSION_VALUE}-debug"
export CVAT_DEBUG_WAIT_CLIENT="${CVAT_DEBUG_WAIT_VALUE}"
export CVAT_LOCAL_UI_PORT="${CVAT_LOCAL_UI_PORT_VALUE}"

compose_args=(-f docker-compose.yml -f docker-compose.dev.yml -f dev/docker-compose.local.yml)

compose() {
  log "+ docker compose ${compose_args[*]} $*"
  (cd "${REPO_ROOT}" && docker compose "${compose_args[@]}" "$@")
}

run_ui() {
  prepare_ui_dirs
  local status=0
  compose --profile ui run --rm --no-deps cvat_ui_dev "$@" || status=$?
  cleanup_empty_node_modules
  return "$status"
}

prepare_ui_dirs() {
  if [[ ! -e "${REPO_ROOT}/node_modules" ]]; then
    mkdir "${REPO_ROOT}/node_modules"
  elif [[ -d "${REPO_ROOT}/node_modules" ]]; then
    rmdir "${REPO_ROOT}/node_modules" >/dev/null 2>&1 && mkdir "${REPO_ROOT}/node_modules" || true
  fi
}

cleanup_empty_node_modules() {
  rmdir "${REPO_ROOT}/node_modules" >/dev/null 2>&1 || true
}

check_command() {
  local tool="$1"
  if command -v "$tool" >/dev/null 2>&1; then
    log "found: $tool"
  else
    log "missing: $tool"
    return 1
  fi
}

check_port() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    if ss -ltn | awk '{print $4}' | grep -Eq "(^|:)${port}$"; then
      log "port ${port} is already in use"
      return 1
    fi
    log "port ${port} is available"
  else
    log "skipping port ${port} check: ss is not installed"
  fi
}

restart_server_fast() {
  if ! compose exec cvat_server supervisorctl -s unix:///tmp/supervisord/supervisor.sock restart "uvicorn:*" >/dev/null 2>&1; then
    log "fast server restart failed; falling back to full container restart"
    compose restart cvat_server
  fi
}

case "$cmd" in
  doctor)
    missing=0
    check_command docker || missing=1

    if docker compose version >/dev/null 2>&1; then
      log "found: docker compose plugin"
    else
      log "missing: docker compose plugin"
      missing=1
    fi

    if docker info >/dev/null 2>&1; then
      log "docker daemon is reachable"
    else
      log "docker daemon is not reachable"
      missing=1
    fi

    check_port 8080 || true
    check_port "${CVAT_LOCAL_UI_PORT}" || true
    for port in 9090 9091 9092 9093 9094 9095 9096 9097; do
      check_port "$port" || true
    done

    if [[ "$(id -u)" != "1000" ]]; then
      log "warning: host UID is $(id -u), but the UI container runs as node:node (1000:1000)"
      log "warning: normal UI dependency and dev-server writes use Docker volumes; files generated in the bind-mounted source tree may need chown"
    fi

    if command -v code >/dev/null 2>&1; then
      log "optional: VS Code CLI is available"
    else
      log "optional: VS Code CLI is not available"
    fi

    docker system df || true

    if (( missing != 0 )); then
      exit 1
    fi
    ;;
  bootstrap)
    log "building ${CVAT_LOCAL_SERVER_IMAGE}"
    compose build cvat_server
    log "building ${CVAT_LOCAL_UI_IMAGE}"
    compose --profile ui build cvat_ui_dev
    log "installing UI dependencies into Docker volumes"
    run_ui bash -lc 'yarn --immutable'
    ;;
  compose-config)
    compose --profile workers --profile ui --profile analytics config
    ;;
  up)
    compose up -d --build
    ;;
  up-workers)
    compose --profile workers up -d --build
    ;;
  up-ui)
    prepare_ui_dirs
    compose --profile ui up -d --build cvat_server cvat_ui_dev
    ;;
  up-full)
    prepare_ui_dirs
    compose --profile workers --profile ui up -d --build
    ;;
  up-analytics)
    compose --profile analytics up -d
    ;;
  down|clean)
    compose down --remove-orphans
    cleanup_empty_node_modules
    ;;
  distclean)
    compose down -v --remove-orphans
    cleanup_empty_node_modules
    ;;
  clobber)
    compose down -v --remove-orphans || true
    cleanup_empty_node_modules
    dangling_containers="$(docker ps -aq --filter network=cvat_cvat || true)"
    if [[ -n "${dangling_containers}" ]]; then
      docker rm -f ${dangling_containers} || true
    fi
    docker network rm cvat_cvat >/dev/null 2>&1 || true
    docker volume rm \
      cvat_cvat_data cvat_cvat_logs cvat_cvat_keys \
      cvat_cvat_node_modules cvat_cvat_yarn_cache \
      >/dev/null 2>&1 || true
    ;;
  createsuperuser)
    compose exec cvat_server python3 manage.py createsuperuser
    ;;
  shell)
    target="${1:-}"
    case "$target" in
      server)
        compose exec cvat_server bash
        ;;
      ui)
        run_ui bash
        ;;
      *)
        die "usage: ./dev/cvat-local.sh shell <server|ui>"
        ;;
    esac
    ;;
  exec)
    service="${1:-}"
    [[ -n "$service" ]] || die "usage: ./dev/cvat-local.sh exec <service> -- <cmd...>"
    shift || true
    if [[ "${1:-}" == "--" ]]; then
      shift
    fi
    [[ $# -gt 0 ]] || die "missing command for exec"
    compose exec "$service" "$@"
    ;;
  logs)
    service="${1:-cvat_server}"
    compose logs -f "$service"
    ;;
  ps)
    compose ps
    ;;
  restart)
    target="${1:-}"
    case "$target" in
      server)
        restart_server_fast
        ;;
      server-full)
        compose restart cvat_server
        ;;
      ui)
        compose --profile ui restart cvat_ui_dev
        ;;
      worker)
        worker="${2:-}"
        [[ -n "$worker" ]] || die "usage: ./dev/cvat-local.sh restart worker <worker-service>"
        compose restart "$worker"
        ;;
      *)
        die "usage: ./dev/cvat-local.sh restart <server|server-full|ui|worker>"
        ;;
    esac
    ;;
  check-ui)
    run_ui bash -lc 'yarn --immutable && export PATH=/workspace/node_modules/.bin:$PATH && yarn workspace cvat-ui run lint && yarn run build:cvat-ui'
    ;;
  vscode)
    compose --profile workers up -d --build
    if command -v code >/dev/null 2>&1; then
      (cd "${REPO_ROOT}" && code .)
    else
      die "VS Code CLI not found. Install it from VS Code: Command Palette -> Shell Command: Install 'code' command in PATH"
    fi
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    die "unknown command: $cmd"
    ;;
esac
