#!/bin/sh
CUSTOM_CVAT_NAME=my-cvat

# this will enable CVAT-UI to communicate with backend
# and allows proper CSRF Trusted origin. Without this you won't be able to visit admin page or use ML backend
export CVAT_HOST=stinger.ad.ujv.cz

echo "Using CVAT_HOST=$CVAT_HOST"

echo "Building CVAT with custom code"
docker build -t $CUSTOM_CVAT_NAME .

cat docker-compose.yml | sed -E "s;image: cvat/server:.*$;image: $CUSTOM_CVAT_NAME;g" | docker compose -f docker-compose.dev.yml -f /dev/stdin up -d
