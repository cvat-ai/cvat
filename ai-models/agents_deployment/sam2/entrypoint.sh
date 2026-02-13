#!/bin/bash

# This script runs SAM2 model agent in the CVAT.

if [ -z "$CVAT_ACCESS_TOKEN" ]; then
    echo "Error: CVAT_ACCESS_TOKEN environment variable must be set."
    exit 1
fi

if [ -z "$CVAT_BASE_URL" ]; then
    echo "Warning: CVAT_BASE_URL environment variable is missing, using https://app.cvat.ai as default."
    CVAT_BASE_URL="https://app.cvat.ai"
fi

if [ -z "$MODEL_ID" ]; then
    echo "Error: MODEL_ID environment variable not found. Default is facebook/sam2.1-hiera-tiny"
    MODEL_ID="facebook/sam2.1-hiera-tiny"
fi


if [ -f /shared/FUNCTION_ID ]; then
    echo "FUNCTION_ID file found. Reading FUNCTION_ID from /shared/FUNCTION_ID"
    FUNCTION_ID="$(cat /shared/FUNCTION_ID)"
fi


if [ -z "$FUNCTION_ID" ]; then
    echo -e "FUNCTION_ID environment variable not found. In compose it should be available in /shared/FUNCTION_ID file.\nIf this is Helm - something is wrong with function registration\nIf this is local run - please ensure FUNCTION_ID environment variable is set or /shared/FUNCTION_ID file is created with the function id of the function you want to run.\nExiting..."
    exit 1
fi

FUNCTION_FILE_PATH="func.py"

echo -e "Running SAM2 function agent for FUNCTION_ID: $FUNCTION_ID with MODEL_ID: $MODEL_ID\n..."

exec cvat-cli --server-host "$CVAT_BASE_URL" function run-agent "$FUNCTION_ID" --function-file="$FUNCTION_FILE_PATH" -p model_id=str:"$MODEL_ID"
