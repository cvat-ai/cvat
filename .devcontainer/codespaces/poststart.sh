#! /bin/env bash

devcontainer_dir="$(dirname "$(realpath "${0}")")"
workspace_dir="$(dirname "$(dirname "${devcontainer_dir}")")"

# Mark all directories as safe as os like windows using WSL adds incorrect path when adding specific path
git config --global --add safe.directory '*'

if [[ "${CVAT_SERVERLESS}" -eq 1 ]]; then
    echo "INFO: Start nuclio dashboard"
    docker compose -f "${workspace_dir}/.devcontainer/docker-compose.nuclio.yml" up -d
fi
