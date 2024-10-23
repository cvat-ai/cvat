#!/usr/bin/env sh

set -e

devcontainer_dir="$(dirname "$(realpath "${0}")")"
workspace_dir="$(dirname "${devcontainer_dir}")"
env_file="${devcontainer_dir}/.env"
env_dist_file="${devcontainer_dir}/dist.env"

if ! [ -f "${env_file}" ]; then
    cp "${env_dist_file}" "${env_file}"
fi

# Get env var from the .env file in .devcontainer directory
get_env_var() {
    key="${1}"
    value="$(sed -n "s/^${key}=\([^[:space:]]\+\)$/\1/p" "${env_file}")"
    echo "${value}"
}

git_branch_isolation="$(get_env_var GIT_BRANCH_ISOLATION)"

if ! [ "${git_branch_isolation}" = "true" ] && ! [ "${git_branch_isolation}" = "false" ]; then
    echo "ERROR: Invalid value for GIT_BRANCH_ISOLATION. Please set it to 'true' or 'false'."
    exit 1
fi

# Echo current git branch value if git branch isolation is true
get_git_branch() {
    if [ "${git_branch_isolation}" = true ]; then
        git_branch=$(git branch --show-current)
        echo "${git_branch}"
    fi
}

# Stop and remove the container if it is tagged with old git branch label
remove_container() {
    container="${1}"
    current_git_branch="$(git branch --show-current)"
    container_git_branch="$(docker inspect --type container \
        --format '{{ index .Config.Labels "com.devcontainer.git_branch" }}' \
        "${container}" 2>/dev/null)" || true
    if [ -n "${container_git_branch}" ] && \
        ! [ "${container_git_branch}" = "${current_git_branch}" ]; then
        docker container stop "${container}" >/dev/null 2>&1
        docker container rm "${container}" >/dev/null 2>&1
        is_remove_container=true
        echo "INFO: done stop and remove ${container}"
    fi
}

# The container volumes are parameterized with git branch values in
# .devcontainer/docker-compose-yml. The volumes get created automatically,
# however they do not automatically get mounted upon the container restart
# The containers need to be removed and created again with the new volume mount
# Tracking this issue at https://github.com/docker/compose/issues/11642
# Stop and remove each container separately instead of docker compose down
# as we need to preseve the orginal network to be reused
if [ "${git_branch_isolation}" = true ]; then
    set -- cvat_db cvat_redis_inmem cvat_redis_ondisk
    is_remove_container=false

    echo "INFO: try stop and remove backing services for new volume mount"

    for service in "$@"; do
        remove_container "${service}"
    done

    if ${is_remove_container}; then
        echo "INFO: done remove containers"
    else :
        echo "INFO: no containers to remove"
    fi
fi

# VS Code Remote does not yet support merge tags for docker compose files,
# namely reset and replace tags, therefore the files need to merged and parsed manually
# Tracking this issue here https://github.com/microsoft/vscode-remote-release/issues/8734
HOST_USER_UID=$([ "$(id -u)" -ge 1000 ] && id -u) \
HOST_USER_GID=$([ "$(id -g)" -ge 1000 ] && id -g) \
GIT_BRANCH="$(get_git_branch)" \
docker compose -f "${workspace_dir}"/docker-compose.yml \
               -f "${workspace_dir}"/docker-compose.dev.yml \
               -f "${devcontainer_dir}"/docker-compose.yml config \
               > "${devcontainer_dir}"/docker-compose.rendered.yml

echo "INFO: done merge docker compose files"

exit 0
