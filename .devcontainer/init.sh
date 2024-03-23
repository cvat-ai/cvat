#!/usr/bin/env bash

set -e

devcontainer_dir=$(dirname "$(realpath "${0}")")
workspace_dir=$(dirname "${devcontainer_dir}")
env_file="${workspace_dir}/.env"

# Update env vars in .env file in .devcontainer directory
function update_env_var {
    local key="${1}"
    local value="${2}"
    if grep -q "${key}=" "${env_file}"; then
        sed -i "s/^${key}=.*/${key}=${value}/g" "${env_file}"
    else :
        echo "${key}=${value}" >> "${env_file}"
    fi
}

git_branch=$(git branch --show-current)
host_user_id=$(id -u)

update_env_var GIT_BRANCH "${git_branch}"
update_env_var HOST_USER_UID "${host_user_id}"

docker compose -f "${workspace_dir}"/docker-compose.yml \
               -f "${workspace_dir}"/docker-compose.dev.yml \
               -f "${devcontainer_dir}/docker-compose.yml" down

exit 0
