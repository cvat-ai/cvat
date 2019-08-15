#!/bin/bash
#
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT
#
set -e

NVIDIA_GPGKEY_SUM=d1be581509378368edeec8c1eb2958702feedf3bc3d17011adbf24efacce4ab5 && \
NVIDIA_GPGKEY_FPR=ae09fe4bbd223a84b2ccfce3f60f4b3d7fa2af80 && \
apt-key adv --fetch-keys http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1604/x86_64/7fa2af80.pub && \
apt-key adv --export --no-emit-version -a $NVIDIA_GPGKEY_FPR | tail -n +5 > cudasign.pub && \
echo "$NVIDIA_GPGKEY_SUM  cudasign.pub" | sha256sum -c --strict - && rm cudasign.pub && \
echo "deb http://developer.download.nvidia.com/compute/cuda/repos/ubuntu1604/x86_64 /" > /etc/apt/sources.list.d/cuda.list && \
echo "deb http://developer.download.nvidia.com/compute/machine-learning/repos/ubuntu1604/x86_64 /" > /etc/apt/sources.list.d/nvidia-ml.list

CUDA_VERSION=9.0.176
NCCL_VERSION=2.1.15
CUDNN_VERSION=7.6.2.24
CUDA_PKG_VERSION="9-0=${CUDA_VERSION}-1"
echo 'export PATH=/usr/local/nvidia/bin:/usr/local/cuda/bin:${PATH}' >> ${HOME}/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/nvidia/lib:/usr/local/nvidia/lib64:${LD_LIBRARY_PATH}' >> ${HOME}/.bashrc

apt-get update && apt-get install -y --no-install-recommends --allow-unauthenticated \
    libprotobuf-dev \
    libprotoc-dev \
    protobuf-compiler \
    cuda-cudart-$CUDA_PKG_VERSION \
    cuda-libraries-$CUDA_PKG_VERSION \
    libnccl2=$NCCL_VERSION-1+cuda9.0 \
    libcudnn7=$CUDNN_VERSION-1+cuda9.0 && \
    ln -s cuda-9.0 /usr/local/cuda && \
rm -rf /var/lib/apt/lists/* \
    /etc/apt/sources.list.d/nvidia-ml.list /etc/apt/sources.list.d/cuda.list

pip3 uninstall -y tensorflow
pip3 install --no-cache-dir tensorflow-gpu==1.12.3
