#!/usr/bin/env bash

if [ -z "$DOCKER_COMPOSE_FILE" ]; then DOCKER_COMPOSE_FILE="./rebotics/docker-compose.yml"; fi

SERVICE_NAME=cvat_server
CONTAINER_ID=$(docker-compose -f $DOCKER_COMPOSE_FILE ps -q $SERVICE_NAME)

if [[ -z "$CONTAINER_ID" || -z "$(docker ps -q --no-trunc | grep "$CONTAINER_ID")" ]]; then
  docker-compose -f $DOCKER_COMPOSE_FILE run --entrypoint "python" $SERVICE_NAME manage.py "$@"
else
  docker-compose -f $DOCKER_COMPOSE_FILE exec $SERVICE_NAME python manage.py "$@"
fi
