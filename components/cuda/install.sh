#!/usr/bin/env bash
#
# cuda 10.0 base    - https://gitlab.com/nvidia/cuda/blob/ubuntu16.04/10.0/base/Dockerfile
# cuda 10.0 runtime - https://gitlab.com/nvidia/cuda/blob/ubuntu16.04/10.0/runtime/Dockerfile
# cudnn7            - https://gitlab.com/nvidia/cuda/blob/ubuntu16.04/10.0/runtime/cudnn7/Dockerfile
#
#
set -e

apt-get update && apt-get install -y --no-install-recommends ca-certificates apt-transport-https gnupg-curl && \
    rm -rf /var/lib/apt/lists/* && \
    NVIDIA_GPGKEY_SUM=d1be581509378368edeec8c1eb2958702feedf3bc3d17011adbf24efacce4ab5 && \
    NVIDIA_GPGKEY_FPR=ae09fe4bbd223a84b2ccfce3f60f4b3d7fa2af80 && \
    apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1604/x86_64/7fa2af80.pub && \
    apt-key adv --export --no-emit-version -a ${NVIDIA_GPGKEY_FPR} | tail -n +5 > cudasign.pub && \
    echo "${NVIDIA_GPGKEY_SUM}  cudasign.pub" | sha256sum -c --strict - && rm cudasign.pub && \
    echo "deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1604/x86_64 /" > /etc/apt/sources.list.d/cuda.list && \
    echo "deb https://developer.download.nvidia.com/compute/machine-learning/repos/ubuntu1604/x86_64 /" > /etc/apt/sources.list.d/nvidia-ml.list

CUDA_VERSION=10.0.130
NCCL_VERSION=2.4.2
CUDNN_VERSION=7.6.0.64
CUDA_PKG_VERSION="10-0=${CUDA_VERSION}-1"
echo "/usr/local/nvidia/lib" >> /etc/ld.so.conf.d/nvidia.conf
echo "/usr/local/nvidia/lib64" >> /etc/ld.so.conf.d/nvidia.conf
echo 'export PATH=/usr/local/nvidia/bin:/usr/local/cuda/bin:${PATH}' >> ${HOME}/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/nvidia/lib:/usr/local/nvidia/lib64:${LD_LIBRARY_PATH}' >> ${HOME}/.bashrc

# For libraries in the cuda-compat-* package: https://docs.nvidia.com/cuda/eula/index.html#attachment-a
apt-get update && apt-get install -y --no-install-recommends \
        cuda-cudart-${CUDA_PKG_VERSION} \
        cuda-compat-10-0 \
        cuda-libraries-${CUDA_PKG_VERSION} \
        cuda-nvtx-${CUDA_PKG_VERSION} \
        libnccl2=${NCCL_VERSION}-1+cuda10.0 \
        libcudnn7=${CUDNN_VERSION}-1+cuda10.0 && \
    apt-mark hold libnccl2 libcudnn7 && \
    ln -s cuda-10.0 /usr/local/cuda && \
    rm -rf /var/lib/apt/lists/* \
        /etc/apt/sources.list.d/cuda.list /etc/apt/sources.list.d/nvidia-ml.list

pip3 uninstall -y tensorflow
pip3 install --no-cache-dir tensorflow-gpu==1.14.0
