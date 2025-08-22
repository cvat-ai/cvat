#!/bin/sh

CUSTOM_CVAT_NAME=my-cvat

# this will enable CVAT-UI to communicate with backend
# and allows proper CSRF Trusted origin. Without this you won't be able to visit admin page or use ML backend
export CVAT_HOST=stinger.cvrez.cz

echo "Using CVAT_HOST=$CVAT_HOST"

echo "Building CVAT with custom code"
docker build -t $CUSTOM_CVAT_NAME .

cat docker-compose.yml | sed -E "s;image: cvat/server:.*$;image: $CUSTOM_CVAT_NAME;g" | docker compose -f docker-compose.dev.yml -f components/serverless/docker-compose.serverless.yml -f /dev/stdin up -d

echo "Deploy SAM function"
./serverless/deploy_gpu.sh serverless/pytorch/facebookresearch/sam/
