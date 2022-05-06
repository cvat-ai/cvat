#!/usr/bin/env bash

if [ -z $VERSION ]; then
  VERSION=$1
fi
if [ -z $VERSION ]; then
  VERSION=latest
fi

OPA_VERSION=0.34.2-rootless  # fixed, rarely changes
docker build -f rebotics/Dockerfile.opa --build-arg OPA_VERSION=${OPA_VERSION} -t retechlabs/rebotics-cvat-opa:${VERSION} .
docker build -f rebotics/Dockerfile -t retechlabs/rebotics-cvat:${VERSION} .
