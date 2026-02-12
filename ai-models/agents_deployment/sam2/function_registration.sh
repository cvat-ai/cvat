#!/bin/bash

# This script registers the SAM2 model function in the CVAT.

if [ -z "$CVAT_ACCESS_TOKEN" ]; then
    echo "Error: CVAT_ACCESS_TOKEN environment variable must be set."
    exit 1
fi

if [ -z "$CVAT_BASE_URL" ]; then
    echo "Warning: CVAT_BASE_URL environment variable is missing, using https://app.cvat.ai as default."
    export CVAT_BASE_URL="https://app.cvat.ai"
fi

if [ -z "$MODEL_ID" ]; then
    echo "Warning: MODEL_ID environment variable not found. Default is facebook/sam2.1-hiera-tiny"
    export MODEL_ID="facebook/sam2.1-hiera-tiny"
fi

# Compose will create this dir, local docker won't so need to create it sometimes.
if [ ! -d /shared ]; then
    mkdir /shared
fi

# Hardcoded for SAM2

FUNCTION_NAME="SAM2"
## Local run from cvat/ai-models/agents_deployment/sam2
#FUNCTION_FILE_PATH="../../tracker/sam2/func.py"
## Docker container run
FUNCTION_FILE_PATH="func.py"


# Get the username associated with the access token
USERNAME=$(curl "$CVAT_BASE_URL"/api/users/self -s -H "Authorization: Bearer $CVAT_ACCESS_TOKEN" | jq -r '.username')
if [ -z "$USERNAME" ]; then
    echo "Error: Unable to retrieve username from CVAT API. Check your access token."
    exit 1
else
    echo "Authenticated as user: $USERNAME"
fi

# Try to find existing function with the same name and owner
if request_function_id=$(curl ""$CVAT_BASE_URL"/api/functions?filter=%7B%0A%20%20%22and%22%3A%20%5B%0A%7B%22%3D%3D%22%3A%20%5B%7B%22var%22%3A%20%22name%22%7D%2C%20%22"$FUNCTION_NAME"%22%5D%7D%2C%0A%7B%22%3D%3D%22%3A%5B%7B%22var%22%3A%20%22owner%22%7D%2C%22"$USERNAME"%22%5D%7D%0A%20%20%5D%0A%7D" -s -H "Authorization: Bearer "$CVAT_ACCESS_TOKEN"" | jq -r '.results[0].id') && [ "$request_function_id" != "null" ]; then
    export FUNCTION_ID="$request_function_id"
    echo "Found existing function with ID: $FUNCTION_ID, new function won't be created."
    echo "$FUNCTION_ID" > /shared/FUNCTION_ID
else
    echo -e "Function with name $FUNCTION_NAME not found. Proceeding to create a new one.\nPlease have some patience, function creation might take some time..."
    # Register the SAM2 function in CVAT
    if function_id="$(cvat-cli --server-host "$CVAT_BASE_URL" function create-native "$FUNCTION_NAME" --function-file="$FUNCTION_FILE_PATH" -p model_id=str:"$MODEL_ID")"; then
      echo "Successfully created $FUNCTION_NAME function"
      echo "$function_id" > /shared/FUNCTION_ID
    else
      echo "cvat-cli function create-native failed."
      exit 1
    fi
fi


# Create configmap with FUNCTION_ID
if [ -z "$K8S_DEPLOY" ]; then
    echo "This is not a Kubernetes deployment. Skipping creation of ConfigMap."
    echo "Function registration complete!"
    exit 0
fi

## https://kubernetes.io/docs/tasks/run-application/access-api-from-pod/
# Point to the internal API server hostname
APISERVER=https://kubernetes.default.svc
#TODO add environment variable check for Helm

# Path to ServiceAccount token
SERVICEACCOUNT=/var/run/secrets/kubernetes.io/serviceaccount

# Read this Pod's namespace
NAMESPACE=$(cat "${SERVICEACCOUNT}"/namespace)

# Read the ServiceAccount bearer token
TOKEN=$(cat "${SERVICEACCOUNT}"/token)

# Reference the internal certificate authority (CA)
CACERT="${SERVICEACCOUNT}"/ca.crt

# ConfigMap data
CONFIGMAP_NAME="sam2-function-id"
#TODO add variable check for Helm

CONFIGMAP_DATA=$(cat <<EOF
{
  "apiVersion": "v1",
  "kind": "ConfigMap",
  "metadata": {
    "name": "${CONFIGMAP_NAME}",
    "namespace": "${NAMESPACE}"
  },
  "data": {
    "FUNCTION_ID": "${FUNCTION_ID}"
  }
}
EOF
)

# Create ConfigMap
response=$(curl -s -w "\n%{http_code}" --cacert ${CACERT} \
     --header "Authorization: Bearer ${TOKEN}" \
     --header "Content-Type: application/json" \
     -X POST \
     -d "${CONFIGMAP_DATA}" \
     "${APISERVER}"/api/v1/namespaces/"${NAMESPACE}"/configmaps)

http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "ConfigMap created successfully"
    echo "$body"
else
    echo "Error: Failed to create ConfigMap (HTTP $http_code)"
    echo "$body"
    exit 1
fi

echo "Function registration complete!"
