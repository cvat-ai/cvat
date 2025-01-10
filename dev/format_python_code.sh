#! /bin/env bash

set -e

REPO_ROOT="$(dirname "$0")/.."
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

cd -- "${REPO_ROOT}"
${BLACK} .
${ISORT} --resolve-all-configs .
