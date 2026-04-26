#!/usr/bin/env bash
# Convenience wrapper for the Keycloak SSO overlay.
#
#   ./sso.sh up      # start CVAT with SSO active (uses .env.sso)
#   ./sso.sh down    # stop the SSO-enabled stack
#   ./sso.sh logs    # tail oauth2-proxy + cvat_server logs
#   ./sso.sh ...     # any other docker-compose subcommand
#
# Without this script (i.e. plain CVAT, local username/password login):
#   docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE="${ENV_FILE:-.env.sso}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "$ENV_FILE not found — copy .env.sso.example to $ENV_FILE and fill it in." >&2
  exit 1
fi

FILES=(
  -f docker-compose.yml
  -f docker-compose.https.yml
  -f docker-compose.sso.yml
)
# Include dev/serverless overlays automatically if they're around so the
# command matches what the project is already running.
[[ -f docker-compose.dev.yml ]] && FILES+=(-f docker-compose.dev.yml)
[[ -f components/serverless/docker-compose.serverless.yml ]] \
  && FILES+=(-f components/serverless/docker-compose.serverless.yml)

case "${1:-}" in
  logs)
    shift
    exec docker compose --env-file "$ENV_FILE" "${FILES[@]}" logs -f --tail=200 \
      cvat_oauth2_proxy cvat_server traefik "$@"
    ;;
  *)
    exec docker compose --env-file "$ENV_FILE" "${FILES[@]}" "$@"
    ;;
esac
