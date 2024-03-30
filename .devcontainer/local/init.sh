#!/usr/bin/env bash

set -e

devcontainer_dir="$(dirname "$(realpath "${0}")")"
workspace_dir="$(dirname "$(dirname "${devcontainer_dir}")")"
env_file="${devcontainer_dir}/.env"

if ! [ -f "${env_file}" ]; then
    touch "${env_file}"
fi

# Get or update env var in the .env file in .devcontainer directory
function get_or_update_env_var {
    local key="${1}"
    local default_value="${2}"

    if ! grep -q "${key}=" "${env_file}"; then
        echo "${key}=${default_value}" >> "${env_file}"
        echo "${default_value}"
    else :
        current_value="$(grep -oP "^${key}=\K\S+" "${env_file}")"
        if [ -z "${current_value}" ]; then
            sed -i "s/^${key}=.*/${key}=${default_value}/g" "${env_file}"
            echo "${default_value}"
        else :
            echo "${current_value}"
        fi
    fi
}

git_branch_isolation="$(get_or_update_env_var GIT_BRANCH_ISOLATION true)"

# Echo current git branch value if git branch isolation is true
function get_git_branch {
    if [ "${git_branch_isolation}" == true ]; then
        git_branch=$(git branch --show-current)
        echo "${git_branch}"
    fi
}

# The container volumes are parameterized with git branch values in
# .devcontainer/docker-compose-yml. The volumes get created automatically,
# however they do not automatically get mounted upon the container restart
# The containers need to be removed and created again with the new volume mount
# Tracking this issue at https://github.com/docker/compose/issues/11642
# Stop and remove each container separately instead of docker compsoe down
# as we need to preseve the orginal network to be reused
if [ "${git_branch_isolation}" == true ]; then
    echo "INFO: stop and remove backing services for new volume mount"
    services=("cvat_db" "cvat_opa" "cvat_redis_inmem" "cvat_redis_ondisk")
    for service in "${services[@]}"; do
        docker container stop "${service}" >/dev/null 2>&1 && \
        docker container rm "${service}" >/dev/null 2>&1
        echo "INFO: done stop and remove ${service}"
    done
    echo "INFO: done remove containers"
fi

# VS Code Remote does not yet support merge tags for docker compose files,
# namely reset and replace tags, therefore the files need to merged and parsed manually
# Tracking this issue here https://github.com/microsoft/vscode-remote-release/issues/8734
HOST_USER_UID="$(id -u)" \
HOST_USER_GID="$(id -g)" \
GIT_BRANCH="$(get_git_branch)" \
docker compose -f "${workspace_dir}"/docker-compose.yml \
               -f "${workspace_dir}"/docker-compose.dev.yml \
               -f "${devcontainer_dir}"/docker-compose.yml config \
               > "${devcontainer_dir}"/docker-compose.rendered.yml

echo "INFO: done merge docker compose files"

exit 0
