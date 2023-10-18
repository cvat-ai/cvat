#!/bin/sh

# This script takes the release notes for the most recent release
# and reformats them for use in GitHub.

# In GitHub PR and release descriptions, a single line break is
# equivalent to <br>, so we pipe the text through pandoc to unwrap all lines.

set -eu

repo_root="$(dirname "$0")/.."

awk '/^## / { hn += 1; next } hn == 1 && !/^</' "$repo_root/CHANGELOG.md" \
  | pandoc -f gfm -t gfm --wrap=none
