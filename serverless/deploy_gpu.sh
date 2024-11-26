#!/bin/bash
# Sample commands to deploy nuclio functions on GPU

set -eu

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
FUNCTIONS_DIR=${1:-$SCRIPT_DIR}

nuctl create project cvat --platform local

shopt -s globstar

for func_config in "$FUNCTIONS_DIR"/**/function-gpu.yaml
do
    func_root="$(dirname "$func_config")"
    func_rel_path="$(realpath --relative-to="$SCRIPT_DIR" "$(dirname "$func_root")")"

    echo "Deploying $func_rel_path function..."
    nuctl deploy --project-name cvat --path "$func_root" \
        --file "$func_config" --platform local \
        --env CVAT_REDIS_HOST=$(echo ${CVAT_REDIS_INMEM_HOST:-cvat_redis_ondisk}) \
        --env CVAT_REDIS_PORT=$(echo ${CVAT_REDIS_INMEM_PORT:-6666}) \
        --env CVAT_REDIS_PASSWORD=$(echo ${CVAT_REDIS_INMEM_PASSWORD})
done

nuctl get function --platform local
