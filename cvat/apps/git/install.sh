#!/bin/bash
#
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
#

set -e

apt-get update && \
    apt-get install -y git curl zip && \
    curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash && \
    apt-get install -y git-lfs && \
    git lfs install && \
    rm -rf /var/lib/apt/lists/*
