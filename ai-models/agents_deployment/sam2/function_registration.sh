#!/bin/bash

# This script registers the SAM2 model function in the CVAT.

if [ -z "$CVAT_BASE_URL" ] || [ -z "$CVAT_ACCESS_TOKEN" ]; then
    echo "Error: CVAT_BASE_URL and CVAT_ACCESS_TOKEN environment variables must be set."
    exit 1
fi

if [ -z "$MODEL_ID" ]; then
    echo "Warning: MODEL_ID environment variable not found. Default is sam2-hiera-large"
    export MODEL_ID="sam2-hiera-large"
fi

# Register the SAM2 function in CVAT
if function_id="$(cvat-cli --server-host "$CVAT_BASE_URL" function create-native "SAM2" --function-file=ai-models/tracker/sam2/func.py -p model_id=str:"$MODEL_ID")"; then
  echo "Registered SAM2 function with ID: $function_id"
else
  echo "cvat-cli function create-native failed."
  echo "$function_id"
  exit 1
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
CONFIGMAP_DATA=$(cat <<EOF
{
  "apiVersion": "v1",
  "kind": "ConfigMap",
  "metadata": {
    "name": "${CONFIGMAP_NAME}",
    "namespace": "${NAMESPACE}"
  },
  "data": {
    "function_id": "${function_id}"
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
