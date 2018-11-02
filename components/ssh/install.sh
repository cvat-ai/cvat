#!/bin/bash
#
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
#

set -e

rm ${HOME}/.ssh -fr
mkdir ${HOME}/.ssh -p
mv /tmp/components/ssh/keys/* ${HOME}/.ssh/
