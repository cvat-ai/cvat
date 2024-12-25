#! /bin/env bash

set -e

PYTHON="${PYTHON:-python3}"
BLACK="${PYTHON} -m black"
ISORT="${PYTHON} -m isort"

if ! ${BLACK} --version >/dev/null 2>&1; then
    echo "black is not found, please check it is installed"
    exit 1
fi
if ! ${ISORT} --version >/dev/null 2>&1; then
    echo "isort is not found, please check it is installed"
    exit 1
fi

${BLACK} .
${ISORT} --resolve-all-configs .
