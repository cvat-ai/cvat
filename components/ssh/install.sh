#!/bin/bash
#
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
#

set -e

apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

rm ${HOME}/.ssh -fr
mkdir ${HOME}/.ssh -p
mv /tmp/components/ssh/keys/* ${HOME}/.ssh/
