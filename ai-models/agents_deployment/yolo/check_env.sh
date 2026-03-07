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
        ORG_CURL_ARGS=(--data-urlencode "org=")
    else
        echo "Using organization: $ORG_SLUG"
        ORG_SLUG_ARGS=(--organization "$ORG_SLUG")
        ORG_CURL_ARGS=(--data-urlencode "org=$ORG_SLUG")
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

resolve_model_params() {
    if [ -z "$MODEL_CONFIG_PARAMS" ]; then
        echo "Warning: MODEL_CONFIG_PARAMS environment variable not found. Default model will be used: yolo26s.pt"
        MODEL_CONFIG_PARAMS="-p model=str:yolo26s.pt"
        MODEL="yolo26s.pt"
    elif result=$(echo "$MODEL_CONFIG_PARAMS" | grep -oP 'model=str:\K[^ ]+'); then
        echo "Extracted MODEL from MODEL_CONFIG_PARAMS: $result"
        MODEL="$result"
    else
        echo "Warning: MODEL_CONFIG_PARAMS environment variable is set but model param is malformed. Your config will be discarded. Default values will be used."
        echo "MODEL_CONFIG_PARAMS should contain model in format -p model=str:your_model.pt"
        echo "Following params will be used for cvat-cli: -p model=str:yolo26s.pt"
        MODEL_CONFIG_PARAMS="-p model=str:yolo26s.pt"
        MODEL="yolo26s.pt"
    fi
}


common_env() {
    validate_access_token
    resolve_base_url
    resolve_org_slug
}
