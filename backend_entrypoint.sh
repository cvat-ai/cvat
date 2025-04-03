#!/usr/bin/env bash

set -eu

fail() {
    printf >&2 "%s: %s\n" "$0" "$1"
    exit 1
}

wait_for_db() {
    wait-for-it "${CVAT_POSTGRES_HOST}:${CVAT_POSTGRES_PORT:-5432}" -t 0
}

wait_for_redis_inmem() {
    wait-for-it "${CVAT_REDIS_INMEM_HOST}:${CVAT_REDIS_INMEM_PORT:-6379}" -t 0
}

cmd_bash() {
    exec bash "$@"
}

cmd_init() {
    wait_for_db
    ~/manage.py migrate

    wait_for_redis_inmem
    ~/manage.py migrateredis
    ~/manage.py syncperiodicjobs
}

_get_worker_list() {
    workers=""
    for arg in "$@"; do
        if [[ "$arg" != include=* ]]; then
            workers+=" $arg"
        fi
    done
    echo $workers
}

_get_worker_includes() {
    declare -A worker_merged_config
    for config in ~/backend_entrypoint.d/*.conf; do
        declare -A worker_conf=$(cat $config)
        for key in "${!worker_conf[@]}"; do
            if [ -v worker_merged_config[$key] ]; then
                fail "Duplicated worker definition: $key"
            fi
            worker_merged_config[$key]=${worker_conf[$key]}
        done
    done

    extra_configs=()
    for worker in "$@"; do
        if [ ! -v worker_merged_config[$worker] ]; then
            fail "Unexpected worker: $worker"
        fi

        for include in ${worker_merged_config["$worker"]}; do
            if ! [[ ${extra_configs[@]} =~ $include ]] && \
                ( ! [[ "$include" == "clamav" ]] || ( [[ -v CLAM_AV ]] && [[ "$CLAM_AV" == "yes" ]] )); then
                extra_configs+=("$include")
            fi
        done
    done

    if [ ${#extra_configs[@]} -gt 0 ]; then
        printf 'reusable/%s.conf ' "${extra_configs[@]}"
    fi
}

cmd_run() {
    if [ "$#" -eq 0 ]; then
        fail "run: at least 1 argument is expected"
    fi

    component="$1"

    if [ "$component" = "server" ]; then
        ~/manage.py collectstatic --no-input
    fi

    wait_for_db

    echo "waiting for migrations to complete..."
    while ! ~/manage.py migrate --check; do
        sleep 10
    done

    wait_for_redis_inmem
    echo "waiting for Redis migrations to complete..."
    while ! ~/manage.py migrateredis --check; do
        sleep 10
    done

    supervisord_includes=""
    postgres_app_name="cvat:$component"

    if [ "$component" = "worker"  ]; then
        if [ "$#" -eq 1 ]; then
            fail "run worker: expected at least 1 worker name"
        fi

        worker_list=$(_get_worker_list "${@:2}")
        echo "Workers to run: $worker_list"
        export CVAT_WORKERS=$worker_list

        postgres_app_name+=":${worker_list// /+}"

        supervisord_includes=$(_get_worker_includes "${@:2}")
        echo "Additional components: $supervisord_includes"
    fi

    export CVAT_POSTGRES_APPLICATION_NAME=$postgres_app_name
    export CVAT_SUPERVISORD_INCLUDES=$supervisord_includes

    exec supervisord -c "supervisord/$component.conf"
}

if [ $# -eq 0 ]; then
    echo >&2 "$0: at least one subcommand required"
    echo >&2 ""
    echo >&2 "available subcommands:"
    echo >&2 "    bash <bash args...>"
    echo >&2 "    init"
    echo >&2 "    run server"
    echo >&2 "    run worker <list of workers> <list of optional services in the format include=config, e.g. include=smokescreen>"
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
