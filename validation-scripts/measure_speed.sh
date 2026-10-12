#!/usr/bin/env bash
# Times the class-counts endpoint: 1 warm-up request, then 5 timed runs.
# Usage: CVAT_USER=... CVAT_PASS=... validation-scripts/measure_speed.sh <task_id>

set -euo pipefail

TASK_ID="${1:?usage: measure_speed.sh <task_id>}"
HOST="${CVAT_HOST:-http://localhost:8080}"
URL="$HOST/api/tasks/$TASK_ID/class-counts"

BODY=$(python3 -c 'import json, os; print(json.dumps({"username": os.environ["CVAT_USER"], "password": os.environ["CVAT_PASS"]}))')
TOKEN=$(curl -s -H 'Content-Type: application/json' -d "$BODY" "$HOST/api/auth/login" |
    python3 -c 'import json, sys; print(json.load(sys.stdin).get("key", ""))')
if [ -z "$TOKEN" ]; then
    echo "login failed" >&2
    exit 1
fi

run() {
    curl -s -o /dev/null -H "Authorization: Token $TOKEN" -w '%{http_code} %{time_total}' "$URL"
}

read -r STATUS _ <<<"$(run)"
if [ "$STATUS" != 200 ]; then
    echo "warm-up request answered HTTP $STATUS, not measuring" >&2
    exit 1
fi

echo "GET $URL"
TIMES=()
for i in 1 2 3 4 5; do
    read -r STATUS SECONDS_TAKEN <<<"$(run)"
    MS=$(awk -v s="$SECONDS_TAKEN" 'BEGIN { printf "%.1f", s * 1000 }')
    echo "run $i: HTTP $STATUS  $MS ms"
    TIMES+=("$MS")
done

printf '%s\n' "${TIMES[@]}" | sort -n | awk '
    { t[NR] = $1 }
    END { printf "median: %.1f ms\nspread: %.1f to %.1f ms (range %.1f ms)\n", t[3], t[1], t[5], t[5] - t[1] }'
