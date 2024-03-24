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
        sed -i "/^## init.sh END$/i ${key}=${value}" "${env_file}"
    fi
}

if [ ! -f "${env_file}" ]; then
    echo "ERROR: .env file not present in the workspace directory. Use dist.env file as a template for your.env file."
    exit 1
else :
    if ! grep -q "^## init.sh BEGIN$" "${env_file}" || ! grep -q "^## init.sh END$" "${env_file}"; then
        echo "ERROR: .env file is not managed by init.sh. Please use dist.env file as a template for your.env file."
    exit 1
    fi
fi

git_branch=$(git branch --show-current)
host_user_id=$(id -u)

git_branch_isolation=$(grep -oP "^GIT_BRANCH_ISOLATION=\K\S+" "${env_file}") || git_branch_isolation=false

if [ "${git_branch_isolation}" == true ]; then
    update_env_var GIT_BRANCH "${git_branch}"
    echo "INFO: GIT_BRANCH_ISOLATION is set to true. set GIT_BRANCH=${git_branch}"
fi

update_env_var HOST_USER_UID "${host_user_id}"
echo "INFO: set HOST_USER_UID=${host_user_id}"

echo "INFO: done export env vars"

# The container volumes are parameterized with git branch values in .devcontainer/docker-compose-yml.
# The volumes get created automatically, however they do not automatically get mounted upon the container restart
# The containers need to be removed and created again with the new volume mount
# Tracking this issue at https://github.com/docker/compose/issues/11642
if [ "${git_branch_isolation}" == true ]; then
    docker compose -f "${workspace_dir}"/docker-compose.yml \
                -f "${workspace_dir}"/docker-compose.dev.yml \
                -f "${devcontainer_dir}"/docker-compose.yml down cvat_db cvat_opa cvat_redis_inmem cvat_redis_ondisk
    echo "INFO: removed containers for enabling git branch isolation"
fi

exit 0
