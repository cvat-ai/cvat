#!/usr/bin/env bash

set -e

workspacefolder="$(dirname "$(dirname "$(realpath "$0")")")"

# Wait for postgres and redis containers to be running and available
"${workspacefolder}"/wait-for-it.sh "${CVAT_POSTGRES_HOST}:${CVAT_POSTGRES_PORT:-5432}" -t 0
"${workspacefolder}"/wait-for-it.sh "${CVAT_REDIS_INMEM_HOST}:${CVAT_REDIS_INMEM_PORT}" -t 0
"${workspacefolder}"/wait-for-it.sh "${CVAT_REDIS_ONDISK_HOST}:${CVAT_REDIS_ONDISK_PORT}" -t 0

python manage.py collectstatic --noinput
python manage.py migrate

printf "\nINFO: Done migrate\n\n"

while ! python manage.py migrate --check; do
    echo "Waiting for migrations to finish"
    sleep 10
done

python manage.py createsuperuser --no-input || true
workspace_dir
printf "\nINFO: Done createsuperuser\n\n"

python manage.py runserver 0.0.0.0:"${CVAT_PORT:-8080}"

exit 0
