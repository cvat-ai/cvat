#!/bin/bash

# This script removes the SAM2 model function from the CVAT.

source "$(dirname "$0")/check_env.sh"

common_env

# Compose way to share FUNCTION_ID between containers
if [ -z "$KUBERNETES_SERVICE_HOST" ]; then
    if [ -f /shared/FUNCTION_ID ]; then
        FUNCTION_ID="$(cat /shared/FUNCTION_ID)"
    else
        echo -e "Warning: FUNCTION_ID file not found at /shared/FUNCTION_ID. If this is docker-compose run, something went wrong with function registration.\nOtherwise, if this is local run, please ensure FUNCTION_ID environment variable is set or /shared/FUNCTION_ID file is created with the function id of the function you want to remove."
    fi
fi

# Ensure FUNCTION_ID is set
if [ -z "$FUNCTION_ID" ]; then
    echo -e "Error: FUNCTION_ID environment variable must be set to remove function from CVAT.\nPlease consider manual removal using cvat-cli --server-host $CVAT_BASE_URL function delete FUNCTION_ID"
    exit 1
fi

exec cvat-cli --server-host "$CVAT_BASE_URL" "${ORG_SLUG_ARGS[@]}" function delete "$FUNCTION_ID"
