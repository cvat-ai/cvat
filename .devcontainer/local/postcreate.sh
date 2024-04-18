#! /bin/env bash

set -eu

echo_bold() {
    # Echo text in bold
    bold=$(tput bold)
    normal=$(tput sgr0)
    text="${1}"
    echo "${bold}${text}${normal}"
}

devcontainer_dir="$(dirname "$(realpath "${0}")")"
workspace_dir="$(dirname "$(dirname "${devcontainer_dir}")")"

mark_git_safe() {
    # Mark all directories as safe as os like windows using WSL adds incorrect path when adding specific path
    git config --global --add safe.directory '*'
    echo_bold "INFO: Done mark all directories as git safe."
}

start_nuclio_dasboard() {
    # Start nuclio dashboard server
    if [[ "${CVAT_SERVERLESS}" -eq 1 ]]; then
        docker compose -f "${workspace_dir}/.devcontainer/docker-compose.nuclio.yml" up -d
        echo_bold "INFO: Started nuclio dashboard"
    fi
}

copy() {
    # Recursively copy and overwrite files and directories
    local src="${1}"
    local dst="${2}"
    if [[ -d "${dst}" ]]; then
        rm -r "${dst}"
    fi
    mkdir -p "$(dirname "${dst}")"
    cp -R "${src}" "${dst}"
}

is_datumro_update() {
    # Check whether datumaro packages needs update
    datumaro_commit=$(sed --quiet 's|^datumaro @ git+https://github.com/cvat-ai/datumaro.git@\([[:alnum:]]\)|\1|p'\
                    "${workspace_dir}/cvat/requirements/base.txt")
    if [[ $(head -1 /cvat/metadata/datumaro_commit.txt) == "${datumaro_commit}" ]]; then
        return 1
    else :
        return 0
    fi
}

update_venvs() {
    # Update development and testing virtual environment
    tmpdir=/home/devcontainer/tmp
    copy "${workspace_dir}/cvat/requirements/" "${tmpdir}/cvat/requirements/"
    copy "${workspace_dir}/utils/dataset_manifest/requirements.txt" "${tmpdir}/utils/dataset_manifest/requirements.txt"
    copy "${workspace_dir}/tests/python/requirements.txt" "${tmpdir}/tests/python/requirements.txt"
    sed -i '/^av==/d' "${tmpdir}/utils/dataset_manifest/requirements.txt"
    if ! is_datumro_update; then
        sed -i '/^datumaro/d' "${tmpdir}/cvat/requirements/base.txt"
    fi
    DATUMARO_HEADLESS=1 /opt/venv/bin/python -m pip install --no-deps -r "${tmpdir}/cvat/requirements/testing.txt"
    /opt/venv-test/bin/python -m pip install -r "${tmpdir}/tests/python/requirements.txt"
    rm -rf "${tmpdir}"
    echo_bold "INFO: Done update virtual environment packages"
}

update_venvs
mark_git_safe
start_nuclio_dasboard
