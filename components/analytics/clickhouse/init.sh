#!/bin/bash

set -e

CLICKHOUSE_DB="${CLICKHOUSE_DB:-cvat}";

# Run scripts in the directory sequentially
# Alpine/Busybox's find uses posix basic regex syntax
INIT_SCRIPTS_DIR="$(dirname "$0")"
find "${INIT_SCRIPTS_DIR}/" -regex ".*/[0-9][0-9][0-9]-[^/]*\\.cmf" -type f -print0 | \
    sort -z -n -t "-" -k 1 | \
    xargs -0 -I {} bash -c "echo \"Running migration file {}\" && bash \"{}\""

