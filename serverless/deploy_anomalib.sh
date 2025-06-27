#!/bin/bash
# Deploy all Anomalib-based Nuclio functions in a folder

set -eu

DEPLOY_DIR="$1"
ANOMALIB_IMAGE="cvat.pth.anomalib_aux.models"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "❌ Error: '$DEPLOY_DIR' is not a directory!"
    exit 1
fi

# Create Nuclio project if not already exists
nuctl create project cvat --platform local || true

# Find all function_*.yaml files in the given directory
find "$DEPLOY_DIR" -maxdepth 1 -type f -name "function_*.yaml" | while read -r yaml_file; do
    echo "🚀 Deploying $(basename "$yaml_file")..."
    nuctl deploy --project-name cvat \
        --path "$DEPLOY_DIR" \
        --file "$yaml_file" --platform local \
        --env CVAT_FUNCTIONS_REDIS_HOST=cvat_redis_ondisk \
        --env CVAT_FUNCTIONS_REDIS_PORT=6666 \
        --platform-config '{"attributes": {"network": "cvat_cvat"}}' \
        --run-image "$ANOMALIB_IMAGE" \
        --volume /data:/data
done

echo
nuctl get function --platform local
