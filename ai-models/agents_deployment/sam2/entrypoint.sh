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

if [ -z "$SERVER_PORT" ]; then
    echo "Warning: SERVER_PORT environment variable is not found. Defaulting to 443 for https or 80 for http based on CVAT_BASE_URL schema."
else
    echo "SERVER_PORT environment variable found. Using SERVER_PORT: $SERVER_PORT"
    SERVER_PORT_ARGS=(--server-port "$SERVER_PORT")
fi

if [ -z "$ORG_SLUG" ]; then
    echo "Warning: ORG_SLUG environment variable not found. Agents will be running for function, registered only for your user"
    echo "ORG_SLUG must be the short name of the organization; it is the name displayed under your username when you switch to the organization in the CVAT UI."
else
    echo "ORG_SLUG environment variable found. Function will be registered for the organization with slug: $ORG_SLUG"
    ORG_SLUG_ARGS=(--organization "$ORG_SLUG")
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
    echo "FUNCTION_ID environment variable not found. In compose it should be available in /shared/FUNCTION_ID file."
    echo "If this is Helm - something is wrong with function registration"
    echo "If this is local run - please ensure FUNCTION_ID environment variable is set or /shared/FUNCTION_ID file is created with the function id of the function you want to run."
    echo "Exiting..."
    exit 1
fi

FUNCTION_FILE_PATH="func.py"

echo "Running SAM2 function agent for FUNCTION_ID: $FUNCTION_ID with MODEL_ID: $MODEL_ID..."

exec cvat-cli --server-host "$CVAT_BASE_URL" "${SERVER_PORT_ARGS[@]}" "${ORG_SLUG_ARGS[@]}" function run-agent "$FUNCTION_ID" --function-file="$FUNCTION_FILE_PATH" -p model_id=str:"$MODEL_ID"
