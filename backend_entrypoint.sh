#!/usr/bin/env bash

set -eu

fail() {
    printf >&2 "%s: %s\n" "$0" "$1"
    exit 1
}

wait_for_db() {
    ~/wait-for-it.sh "${CVAT_POSTGRES_HOST}:${CVAT_POSTGRES_PORT:-5432}" -t 0
}

cmd_bash() {
    exec bash "$@"
}

cmd_init() {
    wait_for_db
    ~/manage.py migrate
}

cmd_run() {
    if [ "$#" -ne 1 ]; then
        fail "run: expected 1 argument"
    fi

    if [ "$1" = "server" ]; then
        ~/manage.py collectstatic --no-input
    fi

    wait_for_db

    echo "waiting for migrations to complete..."
    while ! ~/manage.py migrate --check; do
        sleep 10
    done

    exec supervisord -c "supervisord/$1.conf"
}

if [ $# -eq 0 ]; then
    echo >&2 "$0: at least one subcommand required"
    echo >&2 ""
    echo >&2 "available subcommands:"
    echo >&2 "    bash <bash args...>"
    echo >&2 "    init"
    echo >&2 "    run <config name>"
    exit 1
fi

for init_script in /etc/cvat/init.d/*; do
    if [ -r "$init_script" ]; then
        . "$init_script"
    fi
done

while [ $# -ne 0 ]; do
    if [ "$(type -t "cmd_$1")" != "function" ]; then
        fail "unknown subcommand: $1"
    fi

    cmd_name="$1"

    shift

    "cmd_$cmd_name" "$@"
done
