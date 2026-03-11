#!/bin/bash

# This script is used to remove function with FUNCTION_ID from CVAT.
# It is expected to be used when agent is no longer needed so the function can be safely removed.

# Checking if necessary variables are in place
source "$(dirname "$0")/check_env.sh"

common_env

# docker compose way to share FUNCTION_ID with shared volume.
if [ -z "$KUBERNETES_SERVICE_HOST" ]; then
    if [ -f /shared/FUNCTION_ID ]; then
        FUNCTION_ID="$(cat /shared/FUNCTION_ID)"
    else
        echo -e "Warning: FUNCTION_ID file not found at /shared/FUNCTION_ID."
    fi
fi

# Helm way to share FUNCTION_ID with env var.
if [ -z "$FUNCTION_ID" ]; then
    echo -e "Error: FUNCTION_ID environment variable must be set to remove function from CVAT.\nPlease consider manual removal using cvat-cli --server-host $CVAT_BASE_URL function delete FUNCTION_ID"
    echo "Or it might be that the function was not registered at all, in that case you can safely ignore this message."
    exit 0
fi

# This part will be executed only if $KUBERNETES_SERVICE_HOST is injected which means that script is running inside the pod in k8s.
if [ -n "$KUBERNETES_SERVICE_HOST" ]; then
    kubectl delete configmap "$CONFIGMAP_NAME" --namespace "$NAMESPACE"
fi

# Delete function from CVAT
exec cvat-cli --server-host "$CVAT_BASE_URL" "${ORG_SLUG_ARGS[@]}" function delete "$FUNCTION_ID"
