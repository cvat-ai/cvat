#!/bin/bash

# This script removes the SAM2 model function from the CVAT.

if [ -z "$CVAT_ACCESS_TOKEN" ]; then
    echo "Error: CVAT_ACCESS_TOKEN environment variable must be set."
    exit 1
fi

if [ -z "$CVAT_BASE_URL" ]; then
    echo "Error: CVAT_BASE_URL environment variable is missing, using https://app.cvat.ai as default."
    CVAT_BASE_URL="https://app.cvat.ai"
fi

# Compose way to share FUNCTION_ID between containers
if [ -f /shared/FUNCTION_ID ]; then
    FUNCTION_ID="$(cat /shared/FUNCTION_ID)"
else
    echo -e "Warning: FUNCTION_ID file not found at /shared/FUNCTION_ID. If this is docker-compose run, something went wrong with function registration.\nOtherwise, if this is local run, please ensure FUNCTION_ID environment variable is set or /shared/FUNCTION_ID file is created with the function id of the function you want to remove."
fi

# ENSURE FUNCTION_ID is set
if [ -z "$FUNCTION_ID" ]; then
    echo -e "Error: FUNCTION_ID environment variable must be set to remove function from CVAT.\nPlease consider manual removal using cvat-cli --server-host $CVAT_BASE_URL function delete FUNCTION_ID"
    exit 1
fi

if result=$(cvat-cli --server-host "$CVAT_BASE_URL" function delete "$FUNCTION_ID"); then
  echo "Function with ID: $FUNCTION_ID has been removed successfully."
else
  echo "cvat-cli function delete failed."
  echo "$result"
  exit 1
fi
