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

cd ${HOME}/.ssh/
if test `ssh-add -l | grep "DSA\|RSA\|ECDSA\|ED25519\|RSA1" | wc -l` -eq 0
then
    ssh-keygen -b 4096 -t rsa -f `pwd`/id_rsa -q -N ""
fi

