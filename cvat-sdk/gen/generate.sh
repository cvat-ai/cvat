#!/bin/sh

# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

set -e

GENERATOR_VERSION="v6.0.1"

VERSION="2.26.2"
LIB_NAME="cvat_sdk"
LAYER1_LIB_NAME="${LIB_NAME}/api_client"
DST_DIR="$(cd "$(dirname -- "$0")/.." && pwd)"
DOCS_DIR="$DST_DIR/docs"
GEN_DIR="${DST_DIR}/gen"
POST_PROCESS_SCRIPT="${GEN_DIR}/postprocess.py"
SCHEMA_PATH="${DST_DIR}/../cvat/schema.yml"

rm -f -r "$DOCS_DIR" "${DST_DIR}/${LAYER1_LIB_NAME}" \
    "${DST_DIR}/requirements/api_client.txt"

# Pass template dir here
# https://github.com/OpenAPITools/openapi-generator/issues/8420
docker run --rm -u "$(id -u)":"$(id -g)" \
    -v "${SCHEMA_PATH}:/mnt/schema.yml:ro" \
    -v "${GEN_DIR}:/mnt/gen:ro" \
    -v "${DST_DIR}:/mnt/dst" \
    openapitools/openapi-generator-cli:${GENERATOR_VERSION} generate \
        -t "/mnt/gen/templates/openapi-generator/" \
        -i "/mnt/schema.yml" \
        --config "/mnt/gen/generator-config.yml" \
        -p "packageVersion=$VERSION" \
        -p "httpUserAgent=cvat_sdk/$VERSION" \
        -g python \
        -o "/mnt/dst"

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
"${POST_PROCESS_SCRIPT}" --schema "${SCHEMA_PATH}" \
    --input-path "${DST_DIR}/${LIB_NAME}"

# Do custom postprocessing for docs files
"${POST_PROCESS_SCRIPT}" --schema "${SCHEMA_PATH}" \
    --input-path "$DOCS_DIR" --file-ext '.md'

