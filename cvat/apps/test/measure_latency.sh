#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Times the annotation counts API (MO-1 in docs/objectives.md) and, for comparison,
# the old way of getting the same numbers: downloading every annotation of the task.
#
# Usage: CVAT_USER=<user> CVAT_PASSWORD=<password> ./measure_latency.sh [task_id] [runs]

set -euo pipefail

HOST="${CVAT_URL:-http://localhost:8080}"
TASK_ID="${1:-1}"
RUNS="${2:-5}"
COOKIES="$(mktemp)"
trap 'rm -f "$COOKIES"' EXIT

# Log in once and reuse the session cookie, as the browser does
curl -sf -c "$COOKIES" -H "Content-Type: application/json" \
    -d "{\"username\": \"$CVAT_USER\", \"password\": \"$CVAT_PASSWORD\"}" \
    "$HOST/api/auth/login" > /dev/null

measure() {
    local name="$1" url="$2" times=()

    curl -sf -b "$COOKIES" -o /dev/null "$url"  # warm-up, not counted

    echo "$name: $url"
    for run in $(seq "$RUNS"); do
        times+=("$(curl -sf -b "$COOKIES" -o /dev/null -w '%{time_total}' "$url")")
        echo "  run $run: ${times[-1]} s"
    done

    printf '%s\n' "${times[@]}" | sort -n | awk '
        { ms[NR] = $1 * 1000 }
        END {
            median = (NR % 2) ? ms[(NR + 1) / 2] : (ms[NR / 2] + ms[NR / 2 + 1]) / 2
            printf "  median %.1f ms, spread %.1f ms (fastest %.1f ms, slowest %.1f ms)\n",
                median, ms[NR] - ms[1], ms[1], ms[NR]
        }'
}

date -u +"Measured at %Y-%m-%d %H:%M:%S UTC, task $TASK_ID, $RUNS runs each"
measure "Old way (download all annotations)" "$HOST/api/tasks/$TASK_ID/annotations"
measure "Annotation counts API" "$HOST/api/test/tasks/$TASK_ID/annotation-counts"
