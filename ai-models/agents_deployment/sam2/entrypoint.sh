#!/bin/bash

# This script runs SAM2 model agent in the CVAT.

source "$(dirname "$0")/check_env.sh"

common_env
resolve_model_id

if [ -f /shared/FUNCTION_ID ]; then
    echo "FUNCTION_ID file found. Reading FUNCTION_ID from /shared/FUNCTION_ID"
    FUNCTION_ID="$(cat /shared/FUNCTION_ID)"
fi


if [ -z "$FUNCTION_ID" ]; then
    echo "FUNCTION_ID environment variable not found. In compose it should be available in /shared/FUNCTION_ID file."
    echo "If this is Helm - something is wrong with function registration"
    echo "If this is local run - please ensure FUNCTION_ID environment variable is set or /shared/FUNCTION_ID file is created with the function id of the function you want to run."
    echo "Exiting..."
    exit 1
fi

FUNCTION_FILE_PATH="func.py"

echo "Running SAM2 function agent for FUNCTION_ID: $FUNCTION_ID with MODEL_ID: $MODEL_ID..."

exec cvat-cli --server-host "$CVAT_BASE_URL" "${ORG_SLUG_ARGS[@]}" function run-agent "$FUNCTION_ID" --function-file="$FUNCTION_FILE_PATH" -p model_id=str:"$MODEL_ID"
