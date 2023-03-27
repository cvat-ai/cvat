#! /bin/env bash

set -e

PYTHON="${PYTHON:-python3}"
BLACK="${PYTHON} -m black"
ISORT="${PYTHON} -m isort"

[ ${BLACK} --version >/dev/null 2>&1 ] && {
    echo "black is not found, please check it is installed"; exit 1;
}
[ ${ISORT} --version >/dev/null 2>&1 ] && {
    echo "isort is not found, please check it is installed"; exit 1;
}

# The commands must be run on each module directory separately,
# otherwise tools confuse the "current" module
for paths in "cvat-sdk" "cvat-cli" "tests/python/"; do
    ${BLACK} -- ${paths}
    ${ISORT} -- ${paths}
done
