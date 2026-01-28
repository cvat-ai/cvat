#!/bin/bash

# This script registers the SAM2 model function in the CVAT.

if [ -z "$CVAT_BASE_URL" ] || [ -z "$CVAT_ACCESS_TOKEN" ]; then
    echo "Error: CVAT_ADDRESS and CVAT_TOKEN environment variables must be set."
    exit 1
fi

if [ -z "$MODEL_ID" ]; then
    echo "Error: MODEL_ID environment variable not found. Default is sam2-hiera-large"
    export MODEL_ID="sam2-hiera-large"
fi

if [ -z "$FUNCTION_ID" ]; then
    echo -e "Error: FUNCTION_ID environment variable must be set to run agent for this function"
    exit 1
fi

echo -e "Running SAM2 function agent for FUNCTION_ID: $FUNCTION_ID with MODEL_ID: $MODEL_ID\n..."
cvat-cli --server-host "$CVAT_BASE_URL" function run-agent "$FUNCTION_ID" --function-file=ai-models/tracker/sam2/func.py -p model_id=str:"$MODEL_ID"
