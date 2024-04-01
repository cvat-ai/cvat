# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
FROM cvat/server:dev

ARG HOST_USER_UID
ARG HOST_USER_GID

ENV DJANGO_CONFIGURATION="development"
ENV DJANGO_SETTINGS_MODULE cvat.settings.${DJANGO_CONFIGURATION}

USER root

# It is needed that the host user uid matches with the container user uid, else \
# permission error occur on the bind volume mounts
# So original django user is replaced by devcontainer with host uid value
RUN userdel -r django 2>/dev/null \
    && groupadd --gid ${HOST_USER_GID} devcontainer \
    && useradd --uid ${HOST_USER_UID} --gid ${HOST_USER_GID} \
    --create-home --shell /bin/zsh --comment "" "devcontainer"

# Uncomment the following lines to add ubuntu packages required specifically for
# development

# RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
#     --mount=type=cache,target=/var/lib/apt,sharing=locked \
#     apt-get update \
#     && DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -qy \
#         # <package>=<version>

COPY cvat/requirements /tmp/requirements
# Install packages specific to development and testing and ignore already installed
# base packages
RUN sed -i '/^-r base.txt/d' /tmp/requirements/development.txt \
    && sed -i '/^-r development.txt/d' /tmp/requirements/testing.txt

RUN --mount=type=cache,target=/root/.cache/pip/http \
    python -m pip install \
        -r /tmp/requirements/development.txt \
        -r /tmp/requirements/testing.txt \
    && rm -rf /tmp/requirements

COPY tests/python/requirements.txt /tmp
RUN /usr/bin/python3 -m venv /opt/venv-test
RUN --mount=type=cache,target=/root/.cache/pip/http \
    /opt/venv-test/bin/python -m pip install \
        -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt

RUN chown -R devcontainer /opt/venv /opt/venv-test

# If the volume mounted directories does not exist then they shall be created
# automatically during and they shall be owned by the root user and shall be
# inaccessible by the container user. Therefore, create these directories as the
# container user during build
USER devcontainer
WORKDIR /home/devcontainer/workspace

RUN mkdir -p data keys logs static node_modules




