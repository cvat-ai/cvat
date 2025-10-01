#!/bin/bash

set -x

docker exec cvat_db dropdb --if-exists cvat
docker exec cvat_db createdb cvat
docker exec cvat_server python manage.py migrate > /dev/null
