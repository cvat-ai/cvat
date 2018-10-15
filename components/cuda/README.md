## NVidia Cuda Component
Support of cuda technology in you CVAT container. It may be useful for accelerated running of various models.

### Requirements

* NVidia GPU with a compute capability [3.0 - 7.2]
* Latest GPU drivers

### Installation

#### Install the latest driver for your graphics card

```bash
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt-get update
sudo apt-cache search nvidia-*   # find latest nvidia driver
sudo apt-get install nvidia-*    # install the nvidia driver
sudo apt-get install mesa-common-dev
sudo apt-get install freeglut3-dev
sudo apt-get install nvidia-modprobe
```

#### Reboot your PC and verify installation by `nvidia-smi` command.

#### Install [Nvidia-Docker](https://github.com/NVIDIA/nvidia-docker)

Please be sure that installation was successful.
```bash
docker info | grep 'Runtimes'   # output should contains 'nvidia'
```

### Build docker image
```bash
docker-compose -f docker-compose.yml -f docker-compose.cuda.yml build
```

### Run container
```bash
docker-compose -f docker-compose.yml -f docker-compose.cuda.yml up -d
```

### Run containers with CUDA component

Run following command:
```bash
docker-compose -f docker-compose.yml -f docker-compose.cuda.yml up -d --build
```
