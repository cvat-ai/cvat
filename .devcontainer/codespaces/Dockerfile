# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
FROM cvat/server:dev

ARG NUCLIO_VERSION

ENV DJANGO_CONFIGURATION="development"
ENV DJANGO_SETTINGS_MODULE cvat.settings.${DJANGO_CONFIGURATION}

USER root

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -qy \
        parallel=20210822+ds-2 \
        wget=1.21.2-2ubuntu1

RUN curl -s https://api.github.com/repos/nuclio/nuclio/releases/tags/${NUCLIO_VERSION} \
        | grep -i "browser_download_url.*nuctl.*linux" \
        | cut -d : -f 2,3 \
        | tr -d \" \
        | wget -O /usr/local/bin/nuctl -qi - && chmod +x /usr/local/bin/nuctl

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

WORKDIR /home/root/workspaces

RUN mkdir -p data keys logs static node_modules




