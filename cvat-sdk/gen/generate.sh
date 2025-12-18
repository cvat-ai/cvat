#!/bin/sh

# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

set -e

GENERATOR_VERSION="v6.0.1"

VERSION="2.52.1"
LIB_NAME="cvat_sdk"
LAYER1_LIB_NAME="${LIB_NAME}/api_client"
DST_DIR="$(cd "$(dirname -- "$0")/.." && pwd)"
DOCS_DIR="$DST_DIR/docs"
GEN_DIR="${DST_DIR}/gen"
POST_PROCESS_SCRIPT="${GEN_DIR}/postprocess.py"
SCHEMA_PATH="${DST_DIR}/../cvat/schema.yml"

rm -f -r "$DOCS_DIR" "${DST_DIR}/${LAYER1_LIB_NAME}"

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

API_DOCS_DIR="${DOCS_DIR}/apis/"
MODEL_DOCS_DIR="${DOCS_DIR}/models/"
mkdir -p -- "${API_DOCS_DIR}" "${MODEL_DOCS_DIR}"
mv "${DST_DIR}/${LAYER1_LIB_NAME}/docs/"*Api.md "${API_DOCS_DIR}"
mv "${DST_DIR}/${LAYER1_LIB_NAME}/docs/"*.md "${MODEL_DOCS_DIR}"
mv "${DST_DIR}/api_summary.md" "${DOCS_DIR}"
rmdir "${DST_DIR}/${LAYER1_LIB_NAME}/docs"

# Do custom postprocessing for code files
"${POST_PROCESS_SCRIPT}" --schema "${SCHEMA_PATH}" \
    --input-path "${DST_DIR}/${LIB_NAME}"

# Do custom postprocessing for docs files
"${POST_PROCESS_SCRIPT}" --schema "${SCHEMA_PATH}" \
    --input-path "$DOCS_DIR" --file-ext '.md'

