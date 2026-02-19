#!/bin/bash

# This script registers the SAM2 model function in the CVAT.

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
    echo "Warning: ORG_SLUG environment variable not found. Function will be registered only for your user"
    echo "ORG_SLUG must be the short name of the organization; it is the name displayed under your username when you switch to the organization in the CVAT UI."
else
    echo "ORG_SLUG environment variable found. Function will be registered for the organization with slug: $ORG_SLUG"
    ORG_SLUG_ARGS=(--organization "$ORG_SLUG")
fi

if [ -z "$MODEL_ID" ]; then
    echo "Warning: MODEL_ID environment variable not found. Default is facebook/sam2.1-hiera-tiny"
    MODEL_ID="facebook/sam2.1-hiera-tiny"
else
    echo "MODEL_ID environment variable found. Using MODEL_ID: $MODEL_ID"
fi

# Hardcoded for SAM2

FUNCTION_NAME="SAM2"
FUNCTION_FILE_PATH="func.py"


# Get the username associated with the access token
USERNAME=$(curl "$CVAT_BASE_URL"/api/users/self -s --oauth2-bearer "$CVAT_ACCESS_TOKEN" | jq -r '.username')
if [ -z "$USERNAME" ]; then
    echo "Error: Unable to retrieve username from CVAT API. Check your access token."
    exit 1
else
    echo "Authenticated as user: $USERNAME"
fi

# Try to find existing function with the same name and owner
if request_function_id=$(curl --get --data-urlencode "filter={\"and\":[{\"==\":[{\"var\":\"name\"},\"${FUNCTION_NAME}\"]},{\"==\":[{\"var\":\"owner\"},\"$USERNAME\"]}]}" "$CVAT_BASE_URL"/api/functions -s -H "Authorization: Bearer "$CVAT_ACCESS_TOKEN"" | jq -r '.results[0].id') && [ "$request_function_id" != "null" ]; then
    FUNCTION_ID="$request_function_id"
    echo "Found existing function with ID: $FUNCTION_ID, new function won't be created."
    echo "$FUNCTION_ID" > /shared/FUNCTION_ID
else
    echo -e "Function with name $FUNCTION_NAME not found. Proceeding to create a new one.\nPlease have some patience, function creation might take some time..."
    # Register the SAM2 function in CVAT
    if function_id="$(cvat-cli --server-host "$CVAT_BASE_URL" "${SERVER_PORT_ARGS[@]}" "${ORG_SLUG_ARGS[@]}" function create-native "$FUNCTION_NAME" --function-file="$FUNCTION_FILE_PATH" -p model_id=str:"$MODEL_ID")"; then
      echo "Successfully created $FUNCTION_NAME function"
      FUNCTION_ID="$function_id"
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

# Path to ServiceAccount token
SERVICEACCOUNT=/var/run/secrets/kubernetes.io/serviceaccount

# Read this Pod's namespace
if [ -z "$NAMESPACE" ]; then
    NAMESPACE=$(cat "${SERVICEACCOUNT}"/namespace)
fi
# Read the ServiceAccount bearer token
TOKEN=$(cat "${SERVICEACCOUNT}"/token)

# Reference the internal certificate authority (CA)
CACERT="${SERVICEACCOUNT}"/ca.crt

# ConfigMap data
if [ -z "$CONFIGMAP_NAME" ]; then
    echo "Error: CONFIGMAP_NAME environment variable must be set for K8S deployment."
    exit 1
fi

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
     --json "${CONFIGMAP_DATA}" \
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
