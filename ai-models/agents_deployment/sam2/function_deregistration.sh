#!/bin/bash

# This script removes the SAM2 model function from the CVAT.

if [ -z "$CVAT_BASE_URL" ] || [ -z "$CVAT_ACCESS_TOKEN" ]; then
    echo "Error: CVAT_ADDRESS and CVAT_TOKEN environment variables must be set."
    exit 1
fi

# ENSURE FUNCTION_ID is set
if [ -z "$FUNCTION_ID" ]; then
    echo -e "Error: FUNCTION_ID environment variable must be set to remove function from CVAT.\nPlease consider manual removal using cvat-cli --server-host CVAT_ADDRESS function delete FUNCTION_ID"
    exit 1
fi

if result=$(cvat-cli --server-host "$CVAT_BASE_URL" function delete "$FUNCTION_ID"); then
  echo "Function with ID: $FUNCTION_ID has been removed successfully."
else
  echo "cvat-cli function delete failed."
  echo "$result"
  exit 1
fi
