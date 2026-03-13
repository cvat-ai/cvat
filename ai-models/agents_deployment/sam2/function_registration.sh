#!/bin/bash

# This script registers the SAM2 model function in the CVAT.

source "$(dirname "$0")/check_env.sh"

common_env
resolve_model_params

# Hardcoded for SAM2

FUNCTION_NAME="SAM2"
FUNCTION_FILE_PATH="func.py"


# Get the username associated with the access token
USERNAME=$(curl "$CVAT_BASE_URL"/api/users/self -s --fail --oauth2-bearer "$CVAT_ACCESS_TOKEN" | jq -r '.username')
if [ -z "$USERNAME" ]; then
    echo "Error: Unable to retrieve username from CVAT API. Check your access token."
    exit 1
else
    echo "Authenticated as user: $USERNAME"
fi

# Try to find existing function with the same name and owner
FILTER=$(jq -nc --arg name "${FUNCTION_NAME}" --arg owner "$USERNAME" \
  '{"and":[{"==":[{"var":"name"},$name]},{"==":[{"var":"owner"},$owner]}]}')

if FUNCTION_ID=$(curl --get --fail --data-urlencode "filter=$FILTER" "${ORG_CURL_ARGS[@]}" "$CVAT_BASE_URL"/api/functions -s --oauth2-bearer "$CVAT_ACCESS_TOKEN" | jq -r '.results[0].id') && [ "$FUNCTION_ID" != "null" ]; then
    echo "Found existing function with ID: $FUNCTION_ID, new function won't be created."
    echo "$FUNCTION_ID" > /shared/FUNCTION_ID
else
    echo -e "Function with name $FUNCTION_NAME not found. Proceeding to create a new one.\nPlease have some patience, function creation might take some time..."
    # Register the SAM2 function in CVAT. $MODEL_CONFIG_PARAMS should be unquoted to be passed as separate arguments to cvat-cli.
    if FUNCTION_ID="$(cvat-cli --server-host "$CVAT_BASE_URL" "${ORG_SLUG_ARGS[@]}" function create-native "$FUNCTION_NAME" --function-file="$FUNCTION_FILE_PATH" $MODEL_CONFIG_PARAMS)"; then
      echo "Successfully created $FUNCTION_NAME function"
      echo "$FUNCTION_ID" > /shared/FUNCTION_ID
    else
      echo "cvat-cli function create-native failed."
      exit 1
    fi
fi

# Create configmap with FUNCTION_ID
if [ -z "$KUBERNETES_SERVICE_HOST" ]; then
    echo "This is not a Kubernetes deployment. Skipping creation of ConfigMap."
    echo "Function registration complete!"
    exit 0
fi


if kubectl -n "$NAMESPACE" get cm "$CONFIGMAP_NAME" > /dev/null 2>&1; then
    echo "ConfigMap $CONFIGMAP_NAME already exists. Updating it with the new FUNCTION_ID."
    kubectl -n "$NAMESPACE" patch configmap "$CONFIGMAP_NAME" \
    -p "$(jq -n --arg func_id "$FUNCTION_ID" '{"data":{"FUNCTION_ID": $func_id}}')"
    echo "Function registration complete!"
    exit 0
fi

echo "Creating ConfigMap $CONFIGMAP_NAME with FUNCTION_ID."
exec kubectl create configmap "$CONFIGMAP_NAME" \
  --namespace "$NAMESPACE" \
  --from-literal=FUNCTION_ID="$FUNCTION_ID"
