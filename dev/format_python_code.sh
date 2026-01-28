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

# isort is slow at skipping large Git-ignored directories when invoked as `isort .`,
# so pass it an explicit list of files instead.

# isort will only skip files listed in the config file corresponding to the first file
# on the command line, which would normally be cvat-cli/pyproject.toml. Force the first
# file to be manage.py, so that it uses `pyproject.toml` instead.
git ls-files -z --exclude-standard --deduplicate --cached --others '*.py' \
    | xargs -0 ${ISORT} --resolve-all-configs --filter-files manage.py
