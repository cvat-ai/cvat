#!/bin/sh

set -eu

script_dir="$(dirname "$0")"

DATUMARO_HEADLESS=1 pip-compile-multi -d "$script_dir" \
    --header "$script_dir/HEADER.txt" \
    --backtracking --allow-unsafe --autoresolve --skip-constraints "$@"
