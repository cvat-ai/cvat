## [NVIDIA CUDA Toolkit](https://developer.nvidia.com/cuda-toolkit)

### Requirements

* NVIDIA GPU with a compute capability [3.0 - 7.2]
* Latest GPU driver

### Installation

#### Install the latest driver for your graphics card

```bash
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt-get update
sudo apt-cache search nvidia-*   # find latest nvidia driver
sudo apt-get --no-install-recommends install nvidia-*    # install the nvidia driver
sudo apt-get --no-install-recommends install mesa-common-dev
sudo apt-get --no-install-recommends install freeglut3-dev
sudo apt-get --no-install-recommends install nvidia-modprobe
```

#### Reboot your PC and verify installation by `nvidia-smi` command.

#### Install [Nvidia-Docker](https://github.com/NVIDIA/nvidia-docker)

Please be sure that installation was successful.
```bash
docker info | grep 'Runtimes'   # output should contains 'nvidia'
```

### Build docker image
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/cuda/docker-compose.cuda.yml build
```

### Run docker container
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/cuda/docker-compose.cuda.yml up -d
```
