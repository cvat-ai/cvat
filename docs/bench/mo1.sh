#!/usr/bin/env bash
# MO-1: client-side latency of GET /api/annotation-stats/<task_id>.
# One run = 1 discarded warm-up + 20 timed requests; a run's result is the p95 (19th of 20 sorted).
# Prints every raw time, each run's p95, then the median and spread of the 5 run-p95s.
# Usage: docs/bench/mo1.sh <task_id> <username> <password> [base_url]
set -euo pipefail

TASK_ID=$1 USERNAME=$2 PASSWORD=$3 BASE=${4:-http://localhost:8080}
RUNS=5 REQUESTS=20

TOKEN=$(curl -sf -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" | sed -E 's/.*"key":"([^"]+)".*/\1/')

fetch_ms() {
    curl -s -o /dev/null -w '%{http_code} %{time_total}\n' -H "Authorization: Token $TOKEN" \
        "$BASE/api/annotation-stats/$TASK_ID" | awk '{ if ($1 != 200) exit 1; printf "%.1f\n", $2 * 1000 }'
}

run_p95s=()
for run in $(seq 1 $RUNS); do
    fetch_ms > /dev/null
    times=()
    for _ in $(seq 1 $REQUESTS); do times+=("$(fetch_ms)"); done
    p95=$(printf '%s\n' "${times[@]}" | sort -n | sed -n "$((REQUESTS * 95 / 100))p")
    echo "run $run raw_ms: ${times[*]}"
    echo "run $run p95_ms: $p95"
    run_p95s+=("$p95")
done

printf '%s\n' "${run_p95s[@]}" | sort -n | awk '{ v[NR] = $1 } END {
    printf "median of run p95s: %.1f ms   spread: %.1f .. %.1f ms\n", v[3], v[1], v[5] }'
