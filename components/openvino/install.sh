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

apt update && apt install -y libpng12-dev libcairo2-dev \
    libpango1.0-dev libglib2.0-dev libgtk2.0-dev \
    libgstreamer0.10-dev libswscale-dev \
    libavcodec-dev libavformat-dev cmake libusb-1.0-0-dev cpio

# OpenCV which included into OpenVino toolkit was compiled with other version ffmpeg
# Need to install these packages for it works
apt install -y libavcodec-ffmpeg56 libavformat-ffmpeg56 libswscale-ffmpeg3

cd /tmp/components/openvino
tar -xzf `ls | grep "openvino_toolkit"`
cd `ls -d */ | grep "openvino_toolkit"`

cat ../eula.cfg >> silent.cfg
./install.sh -s silent.cfg

cd /tmp/components && rm openvino -r

echo "source /opt/intel/computer_vision_sdk/bin/setupvars.sh" >> ${HOME}/.bashrc
echo -e '\nexport IE_PLUGINS_PATH=${IE_PLUGINS_PATH}' >> /opt/intel/computer_vision_sdk/bin/setupvars.sh
