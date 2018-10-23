#!/bin/bash
#
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
#
set -e

if [[ `lscpu | grep -o "GenuineIntel"` != "GenuineIntel" ]]; then
    echo "OpenVINO supports only Intel CPUs"
    exit 1
fi

if [[ `lscpu | grep -o "sse4" | head -1` != "sse4" ]] && [[ `lscpu | grep -o "avx2" | head -1` != "avx2" ]]; then
    echo "You Intel CPU should support sse4 or avx2 instruction if you want use OpenVINO"
    exit 1
fi


cd /tmp/components/openvino

tar -xzf `ls | grep "openvino_toolkit"`
cd `ls -d */ | grep "openvino_toolkit"`

apt-get update && apt-get install -y sudo cpio && \
 ./install_cv_sdk_dependencies.sh && SUDO_FORCE_REMOVE=yes apt-get remove -y sudo

cat ../eula.cfg >> silent.cfg
./install.sh -s silent.cfg

cd /tmp/components && rm openvino -r

echo "source /opt/intel/computer_vision_sdk/bin/setupvars.sh" >> ${HOME}/.bashrc
echo -e '\nexport IE_PLUGINS_PATH=${IE_PLUGINS_PATH}' >> /opt/intel/computer_vision_sdk/bin/setupvars.sh
