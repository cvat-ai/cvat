# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
FROM cvat/server:dev

ENV DJANGO_CONFIGURATION="development"
ENV DJANGO_SETTINGS_MODULE cvat.settings.${DJANGO_CONFIGURATION}

USER root

# Uncomment the following lines to add ubuntu packages required specifically for
# development

# RUN apt-get update && \
#     DEBIAN_FRONTEND=noninteractive apt-get --no-install-recommends install -qy \
#         # <package>=<version> \
#     && rm -rf /var/lib/apt/lists/*

COPY cvat/requirements/${DJANGO_CONFIGURATION}.txt /tmp/requirements.txt
# Install packages specific to development and ignore already installed base packages
RUN sed -i '/^-r base.txt/d' /tmp/requirements.txt && \
    python -m pip install --no-cache-dir -r /tmp/requirements.txt

WORKDIR /home/root/workspaces

RUN mkdir -p data keys logs static node_modules




