#!/usr/bin/env bash

if [ -z "$VERSION" ]; then
  VERSION=$1
fi
if [ -z "$VERSION" ]; then
  VERSION=latest
fi

shift

if [ -z "$BUILD" ]; then
  BUILD=$*
fi
if [ -z "$BUILD" ]; then
  BUILD="cvat opa analytics"
fi

for service in $BUILD; do
  case $service in
    "cvat")
      docker build -f rebotics/Dockerfile -t retechlabs/rebotics-cvat:${VERSION} .
      ;;
    "opa")
      OPA_VERSION=0.34.2-rootless  # fixed, rarely changes
      docker build -f rebotics/Dockerfile.opa --build-arg OPA_VERSION=${OPA_VERSION} -t retechlabs/rebotics-cvat-opa:${VERSION} .
      ;;
    "analytics")
      ELK_VERSION=6.8.23  # fixed.
      docker build -f rebotics/components/analytics/logstash/Dockerfile --build-arg ELK_VERSION=${ELK_VERSION} -t retechlabs/rebotics-cvat-logstash:${VERSION} components/analytics/logstash
      ;;
    *)
      echo "Invalid service \"$service\". Known services are: \"cvat\", \"opa\", \"analytics\"."
      ;;
  esac
done
