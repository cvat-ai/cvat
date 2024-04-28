# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
FROM cvat/server:dev

ARG HOST_USER_UID
ARG HOST_USER_GID
ARG NUCLIO_VERSION
ARG OPA_VERSION

ENV DJANGO_CONFIGURATION="development"
ENV DJANGO_SETTINGS_MODULE cvat.settings.${DJANGO_CONFIGURATION}

USER root

# Save commit hash of datumaro git repository for using it while updating virtal environment in
# postcreate.sh script
RUN mkdir -p /cvat/metadata \
    && sed --quiet 's|^datumaro @ git+https://github.com/cvat-ai/datumaro.git@\([0-9a-f]\{40\}\)$|\1|p' \
    /home/django/cvat/requirements/base.txt > /cvat/metadata/datumaro_commit.txt

# It is needed that the host user uid matches with the container user uid, else \
# permission error occur on the bind volume mounts
# So original django user is replaced by devcontainer with host uid value
RUN userdel -r django 2>/dev/null \
    && groupadd --gid ${HOST_USER_GID} devcontainer \
    && useradd --uid ${HOST_USER_UID} --gid ${HOST_USER_GID} \
    --create-home --shell /bin/bash --comment "" "devcontainer"

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -qy \
        parallel=20210822+ds-2 \
        wget=1.21.2-2ubuntu1

RUN curl --silent "https://api.github.com/repos/nuclio/nuclio/releases/tags/${NUCLIO_VERSION}" \
        | sed --silent 's/"browser_download_url": "\(.*nuctl.*linux.*amd64\)"/\1/Ip' \
        | wget --tries 3 --output-document /usr/local/bin/nuctl --quiet --input-file - \
    && chmod +x /usr/local/bin/nuctl

RUN curl --silent "https://api.github.com/repos/open-policy-agent/opa/releases/tags/v${OPA_VERSION}" \
        | sed --silent 's/"browser_download_url": "\(.*opa.*linux.*amd64.*static\)"/\1/Ip' \
        | wget --tries 3 --output-document /usr/local/bin/opa --quiet --input-file - \
    && chmod +x /usr/local/bin/opa

RUN /usr/bin/python3 -m venv /opt/venv-test
ENV PATH="/opt/venv-test/bin:${PATH}"

# This command shall the slow in linux docker host running old kernel as it shall do
# regular copy instead of metadata only copy for chown operation.
# Tracking this issue at https://github.com/docker/for-linux/issues/388#issuecomment-1108689413
RUN chown -R devcontainer /opt/venv /opt/venv-test

# If the volume mounted directories does not exist then they shall be created
# automatically during and they shall be owned by the root user and shall be
# inaccessible by the container user. Therefore, create these directories as the
# container user during build
USER devcontainer
WORKDIR /home/devcontainer/workspaces

RUN mkdir -p /home/devcontainer/workspaces/data /home/devcontainer/workspaces/keys \
    /home/devcontainer/workspaces/logs /home/devcontainer/workspaces/static \
    /home/devcontainer/workspaces/node_modules /home/devcontainer/.cache/pip \
    /home/devcontainer/.vscode-server-insiders /home/devcontainer/.vscode-server \
    /home/devcontainer/.ssh
