#!/usr/bin/env bash

set -eu

echo_bold() {
    bold=$(tput bold)
    normal=$(tput sgr0)
    text="${1}"
    echo "${bold}${text}${normal}"
}

error_handler() {
    local error_code=${?}
    local error_command="${BASH_COMMAND}"
    local error_line="${BASH_LINENO}"

    echo_bold "ERROR: ${0}: Error occurred on line ${error_line}: ${error_command} (exit code: ${error_code})" >&2
    exit 1
}

db_operations() {
    # Wait for postgres and redis containers to be running and available
    ./wait-for-it.sh "${CVAT_POSTGRES_HOST}:${CVAT_POSTGRES_PORT:-5432}" -t 0
    ./wait-for-it.sh "${CVAT_REDIS_INMEM_HOST}:${CVAT_REDIS_INMEM_PORT}" -t 0
    ./wait-for-it.sh "${CVAT_REDIS_ONDISK_HOST}:${CVAT_REDIS_ONDISK_PORT}" -t 0

    python manage.py migrate
    while ! python manage.py migrate --check; do
        echo_bold "Waiting for migrations to finish"
        sleep 10
    done
    python manage.py createsuperuser --no-input >/dev/null 2>&1
    echo_bold "INFO: Done database migrate and create superuser"
}

collect_static() {
    python manage.py collectstatic --noinput
    echo_bold "INFO: Done collect static files"
}

trap error_handler ERR
workspacefolder="$(dirname "$(dirname "$(realpath "$0")")")"
cd "${workspacefolder}"
source /opt/venv/bin/activate
echo_bold "INFO: Start operations"
export -f echo_bold && export -f db_operations && export -f collect_static
parallel --jobs 2 --ungroup --halt now,fail=1 ::: db_operations collect_static
echo_bold "INFO: Done operations"
echo_bold "INFO: Run django server to serve the OPA client"
python manage.py runserver 0.0.0.0:"${CVAT_PORT:-8080}"
exit 0
