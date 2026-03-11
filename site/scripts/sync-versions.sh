#!/bin/bash

set -x

NUCLIO_VERSION=$(grep -o --perl-regexp 'nuclio/dashboard:\K[0-9.]+' components/serverless/docker-compose.serverless.yml)
cat > site/data/versions.yaml << EOF
nuclio:
  version: "${NUCLIO_VERSION}"
  url: "https://github.com/nuclio/nuclio/releases/tag"
EOF