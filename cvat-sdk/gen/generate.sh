#!/bin/sh

set -e

VERSION="2.0-alpha"
LIB_NAME="cvat_sdk"
DST_DIR="."
TEMPLATE_DIR="gen"
PYTHON_POST_PROCESS_FILE="${TEMPLATE_DIR}/postprocess.py"

mkdir -p "${DST_DIR}/"
rm -f -r "${DST_DIR}/docs/" "${DST_DIR}/${LIB_NAME}"
cp "${TEMPLATE_DIR}/templates/openapi-generator/.openapi-generator-ignore" "${DST_DIR}/"

# Pass template dir here
# https://github.com/OpenAPITools/openapi-generator/issues/8420
docker run --rm -v "$PWD":"/local" \
    openapitools/openapi-generator-cli generate \
        -t "/local/${TEMPLATE_DIR}/templates/openapi-generator/" \
        -i "/local/schema/schema.yml" \
        --config "/local/${TEMPLATE_DIR}/generator-config.yml" \
        -g python \
        -o "/local/${DST_DIR}/"
sudo chown -R "$(id -u)":"$(id -g)" "${DST_DIR}/"

sed -e "s|{{packageVersion}}|${VERSION}|g" "${TEMPLATE_DIR}/templates/version.py.template" > "${DST_DIR}/${LIB_NAME}/version.py"
cp -r "${TEMPLATE_DIR}/templates/requirements/" "${DST_DIR}/"
cp -r "${TEMPLATE_DIR}/templates/MANIFEST.in" "${DST_DIR}/"

# Do custom postprocessing
"${PYTHON_POST_PROCESS_FILE}" --schema "schema/schema.yml" --input-path "${DST_DIR}/${LIB_NAME}"
black --config pyproject.toml "${DST_DIR}/${LIB_NAME}"
isort --sp pyproject.toml "${DST_DIR}/${LIB_NAME}"
