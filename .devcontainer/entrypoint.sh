#!/usr/bin/env bash

set -e

echo entrypoint.sh


function run_as_container_user {
    chroot --userspec "${CONTAINER_USER}" / "${1}"
}

useradd --uid "${HOST_USER_UID}" --create-home --shell /bin/zsh --comment "" "${CONTAINER_USER}" || true

export HOME=/home/"${CONTAINER_USER}"
export USER="${CONTAINER_USER}"

cat /etc/passwd

run_as_container_user "cd \"/home/${CONTAINER_USER}/workspace\" && mkdir -p data share keys logs static"

run_as_container_user "$@"



