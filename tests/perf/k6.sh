#!/bin/bash

set -euo pipefail

TEST_FILE="${1:-}"
shift || true

COMPOSE_FILE="docker-compose.yml"
MAIN_CONTAINER="cvat_server"

RED="\033[0;31m"
GREEN="\033[0;32m"
NC="\033[0m"

if [ -z "$TEST_FILE" ]; then
  echo -e "${RED}❌ Usage: ./k6.sh <test-name.js> [k6 args]${NC}"
  exit 1
fi

# Check if cluster is up (based on cvat_server)
if ! docker ps --filter "name=${MAIN_CONTAINER}" --filter "status=running" | grep -q "${MAIN_CONTAINER}"; then
  echo -e "${GREEN}🔄 Cluster not running. Starting cluster...${NC}"
  docker compose up -d

  echo -e "Wait until server is up"
  max_tries=60
  api_about_page="localhost:8080/api/server/about"
  status_code=$(curl -s -o /tmp/server_response -w "%{http_code}" ${api_about_page})
  while [[  $status_code != "200" && max_tries -gt 0 ]]
  do
      echo Number of attempts left: $max_tries
      echo Status code of response: $status_code
      sleep 5
      status_code=$(curl -s -o /tmp/server_response -w "%{http_code}" ${api_about_page})
      (( max_tries-- ))
  done
  sleep 10

  echo -e "Create default admin user"
  docker exec -i cvat_server \
        /bin/bash -c \
        "echo \"from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@localhost.company', '12qwaszx')\" | python3 ~/manage.py shell"
else
  echo -e "${GREEN}✅ Cluster already running.${NC}"
fi

# Run the test
K6_VARIABLES="-e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9190/api/v1/write -e K6_WEB_DASHBOARD=true -e K6_PROMETHEUS_RW_TREND_STATS=count,sum,min,max,avg,med,p(90),p(95),p(99)"

echo -e "${GREEN}🚀 Running test: ${TEST_FILE}${NC}"
docker compose -f "$COMPOSE_FILE" run --rm $K6_VARIABLES perf-k6 \
    run \
    --out experimental-prometheus-rw \
    --address=0.0.0.0:6565 \
    --tag testid="$TEST_FILE" \
    "$@" \
    "$TEST_FILE"
