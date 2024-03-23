# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
FROM cvat/server:dev

ARG CONTAINER_USER
ARG HOST_USER_UID

ENV DJANGO_CONFIGURATION="development"
ENV DJANGO_SETTINGS_MODULE cvat.settings.${DJANGO_CONFIGURATION}

USER root
RUN userdel -r django && \
    useradd --uid ${HOST_USER_UID} --create-home --shell /bin/zsh --comment "" "${CONTAINER_USER}" 2>/dev/null

COPY cvat/requirements/${DJANGO_CONFIGURATION}.txt /tmp/requirements.txt
# Install packages specific to development and ignore already installed base packages
RUN sed -i '/^-r base.txt/d' /tmp/requirements.txt && \
    python -m pip install --no-cache-dir -r /tmp/requirements.txt

USER ${CONTAINER_USER}
# ENV USER ${CONTAINER_USER}
# ENV HOME /home/${CONTAINER_USER}
WORKDIR ${HOME}/workspace

RUN mkdir -p data share keys logs static




