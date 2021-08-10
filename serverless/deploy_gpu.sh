#!/bin/bash
# Sample commands to deploy nuclio functions on GPU

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
FUNCTIONS_DIR=${1:-$SCRIPT_DIR}

nuctl create project cvat

shopt -s globstar

for func_config in "$FUNCTIONS_DIR"/**/function-gpu.yaml
do
    func_root=$(dirname "$func_config")
    echo "Deploying $(dirname "$func_root") function..."
    nuctl deploy --project-name cvat --path "$func_root" \
        --volume "$SCRIPT_DIR/common:/opt/nuclio/common" \
        --file "$func_config" --platform local
done

nuctl get function
