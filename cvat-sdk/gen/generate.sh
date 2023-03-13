#!/bin/sh

# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

set -e

GENERATOR_VERSION="v6.0.1"

VERSION="2.3.0"
LIB_NAME="cvat_sdk"
LAYER1_LIB_NAME="${LIB_NAME}/api_client"
DST_DIR="$(cd "$(dirname -- "$0")/.." && pwd)"
DOCS_DIR="$DST_DIR/docs"
TEMPLATE_DIR_NAME="gen"
TEMPLATE_DIR="$DST_DIR/$TEMPLATE_DIR_NAME"
POST_PROCESS_SCRIPT="${TEMPLATE_DIR}/postprocess.py"

rm -f -r "$DOCS_DIR" "${DST_DIR}/${LAYER1_LIB_NAME}" \
    "${DST_DIR}/requirements/api_client.txt"

# Pass template dir here
# https://github.com/OpenAPITools/openapi-generator/issues/8420
docker run --rm -v "$DST_DIR:/local" -u "$(id -u)":"$(id -g)" \
    openapitools/openapi-generator-cli:${GENERATOR_VERSION} generate \
        -t "/local/${TEMPLATE_DIR_NAME}/templates/openapi-generator/" \
        -i "/local/schema/schema.yml" \
        --config "/local/${TEMPLATE_DIR_NAME}/generator-config.yml" \
        -p "packageVersion=$VERSION" \
        -p "httpUserAgent=cvat_sdk/$VERSION" \
        -g python \
        -o "/local/"

echo "VERSION = \"$VERSION\"" > "${DST_DIR}/${LIB_NAME}/version.py"
mv "${DST_DIR}/requirements.txt" "${DST_DIR}/requirements/api_client.txt"

API_DOCS_DIR="${DOCS_DIR}/apis/"
MODEL_DOCS_DIR="${DOCS_DIR}/models/"
mkdir "${API_DOCS_DIR}"
mkdir "${MODEL_DOCS_DIR}"
mv "${DOCS_DIR}/"*Api.md "${API_DOCS_DIR}"
mv "${DOCS_DIR}/"*.md "${MODEL_DOCS_DIR}"
mv "${DST_DIR}/api_summary.md" "${DOCS_DIR}"

# Do custom postprocessing for code files
"${POST_PROCESS_SCRIPT}" --schema "${DST_DIR}/schema/schema.yml" \
    --input-path "${DST_DIR}/${LIB_NAME}"

# Do custom postprocessing for docs files
"${POST_PROCESS_SCRIPT}" --schema "${DST_DIR}/schema/schema.yml" \
    --input-path "$DOCS_DIR" --file-ext '.md'

