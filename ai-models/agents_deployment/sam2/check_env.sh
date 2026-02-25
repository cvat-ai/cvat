#!/bin/bash

validate_access_token() {
    if [ -z "$CVAT_ACCESS_TOKEN" ]; then
        echo "Error: CVAT_ACCESS_TOKEN environment variable must be set."
        exit 1
    fi
}

resolve_base_url() {
    if [ -z "$CVAT_BASE_URL" ]; then
        echo "Warning: CVAT_BASE_URL environment variable is missing, using https://app.cvat.ai as default."
        CVAT_BASE_URL="https://app.cvat.ai"
    fi
}

resolve_org_slug() {
    ORG_SLUG_ARGS=()
    if [ -z "$ORG_SLUG" ]; then
        echo "Warning: ORG_SLUG environment variable not found. Function will be registered only for your user."
        echo "ORG_SLUG must be the short name of the organization; it is the name displayed under your username when you switch to the organization in the CVAT UI."
    else
        echo "Using organization: $ORG_SLUG"
        ORG_SLUG_ARGS=(--organization "$ORG_SLUG")
    fi
}

resolve_org_slug_curl() {
    ORG_CURL_ARGS=()
    if [ -n "$ORG_SLUG" ]; then
        ORG_CURL_ARGS=(--data-urlencode "org=$ORG_SLUG")
    else
        # That means "search ONLY outside of organizations, i.e. for the user"
        ORG_CURL_ARGS=(--data-urlencode "org=")
    fi
}

resolve_model_id() {
    if [ -z "$MODEL_ID" ]; then
        echo "Warning: MODEL_ID environment variable not found. Default is facebook/sam2.1-hiera-tiny"
        MODEL_ID="facebook/sam2.1-hiera-tiny"
    else
        echo "Using MODEL_ID: $MODEL_ID"
    fi
}

resolve_cuda() {
    if [ "$USE_CUDA" = "true" ]; then
        echo "Using CUDA! Please ensure that you are using proper image with CUDA support"
        USE_CUDA_ARGS=(-p device=str:cuda)
    else
        echo "Info: USE_CUDA environment variable not found. Model will run on CPU."
    fi
}

common_env() {
    validate_access_token
    resolve_base_url
    resolve_org_slug
}
