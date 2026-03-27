#!/bin/bash

# This is example of entrypoint script that runs agent for some function registered in CVAT with FUNCTION_ID

# Since we have functions that help to resolve some key variables in separate file.
source "$(dirname "$0")/check_env.sh"

# Functions from check_env.sh that we'd like to run in this script.
common_env
resolve_model_id
resolve_cuda

# This block is for docker compose only. Helm uses CM that is injected as env var.
if [ -f /shared/FUNCTION_ID ]; then
    echo "FUNCTION_ID file found. Reading FUNCTION_ID from /shared/FUNCTION_ID"
    FUNCTION_ID="$(cat /shared/FUNCTION_ID)"
fi

# This check is required. Otherwise whole script is pointless.
if [ -z "$FUNCTION_ID" ]; then
    echo "FUNCTION_ID environment variable not found. In compose it should be available in /shared/FUNCTION_ID file."
    echo "If this is Helm - something is wrong with function registration"
    echo "If this is local run - please ensure FUNCTION_ID environment variable is set or /shared/FUNCTION_ID file is created with the function id of the function you want to run."
    echo "Exiting..."
    exit 1
fi

# This should be in sync with Dockerfile. We prefer to keep both scripts in the same folder (/app by default)
FUNCTION_FILE_PATH="func.py"

# You may replace this with your function name.
echo "Running YOUR_FUNCTION_NAME_HERE function agent for FUNCTION_ID: $FUNCTION_ID with MODEL_ID: $MODEL_ID..."

#NB! for some functions it is `model_id` and for some `model`
exec cvat-cli --server-host "$CVAT_BASE_URL" "${ORG_SLUG_ARGS[@]}" function run-agent "$FUNCTION_ID" --function-file="$FUNCTION_FILE_PATH" -p model_id=str:"$MODEL_ID" "${USE_CUDA_ARGS[@]}"
