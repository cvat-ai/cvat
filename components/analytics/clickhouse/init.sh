#!/bin/bash

set -e

CLICKHOUSE_DB="${CLICKHOUSE_DB:-cvat}";

# Run scripts in the directory sequentially
# Alpine/Busybox's find uses posix basic regex syntax
INIT_SCRIPTS_DIR="$(dirname "$0")"
for migration in "${INIT_SCRIPTS_DIR}"/[0-9][0-9][0-9]-*.cmf; do
    echo "Running migration file $migration"
    "$migration"
done

