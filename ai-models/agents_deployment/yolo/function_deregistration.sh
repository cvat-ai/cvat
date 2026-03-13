#!/bin/bash

# This script removes the YOLO model function from the CVAT.

source "$(dirname "$0")/check_env.sh"

common_env


if [ -z "$KUBERNETES_SERVICE_HOST" ]; then
    if [ -f /shared/FUNCTION_ID ]; then
        FUNCTION_ID="$(cat /shared/FUNCTION_ID)"
    else
        echo -e "Warning: FUNCTION_ID file not found at /shared/FUNCTION_ID."
    fi
fi


if [ -z "$FUNCTION_ID" ]; then
    echo -e "Error: FUNCTION_ID environment variable must be set to remove function from CVAT.\nPlease consider manual removal using cvat-cli --server-host $CVAT_BASE_URL function delete FUNCTION_ID"
    echo "Or it might be that the function was not registered at all, in that case you can safely ignore this message."
    exit 0
fi

if [ -n "$KUBERNETES_SERVICE_HOST" ]; then
    kubectl delete configmap "$CONFIGMAP_NAME" --namespace "$NAMESPACE"
fi

exec cvat-cli --server-host "$CVAT_BASE_URL" "${ORG_SLUG_ARGS[@]}" function delete "$FUNCTION_ID"
