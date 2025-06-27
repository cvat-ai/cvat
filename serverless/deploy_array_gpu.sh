#!/bin/bash
# Deploy multiple Nuclio functions listed in a text file (GPU version)

set -eu

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
FUNCTIONS_LIST_FILE="$1"

if [ ! -f "$FUNCTIONS_LIST_FILE" ]; then
    echo "Error: File '$FUNCTIONS_LIST_FILE' not found!"
    exit 1
fi

# Create Nuclio project if not already exists
nuctl create project cvat --platform local || true

shopt -s globstar nullglob

while IFS= read -r func_path || [ -n "$func_path" ]; do
    # Skip empty lines and comments
    [[ -z "$func_path" || "$func_path" =~ ^# ]] && continue

    full_path="$SCRIPT_DIR/../$func_path"

    found_any=false
    for func_config in "$full_path"/**/function-gpu.yaml; do
        func_root="$(dirname "$func_config")"
        func_rel_path="$(realpath --relative-to="$SCRIPT_DIR" "$func_root")"

        found_any=true

        echo "Deploying $func_rel_path (GPU)..."
        nuctl deploy --project-name cvat --path "$func_root" \
            --file "$func_config" --platform local \
            --env CVAT_FUNCTIONS_REDIS_HOST=cvat_redis_ondisk \
            --env CVAT_FUNCTIONS_REDIS_PORT=6666 \
            --platform-config '{"attributes": {"network": "cvat_cvat"}}' \
            --volume /data:/data
    done

    if [ "$found_any" = false ]; then
        echo "⚠️  Warning: No function-gpu.yaml found in $func_path or its subfolders, skipping."
    fi

done < "$FUNCTIONS_LIST_FILE"

echo
nuctl get function --platform local
