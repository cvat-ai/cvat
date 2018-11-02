#!/bin/bash
#
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
#

set -e

pip3 install --no-cache-dir GitPython==2.1.11
apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
