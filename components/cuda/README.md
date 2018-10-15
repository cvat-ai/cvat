## NVidia Cuda Component

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
docker-compose -f docker-compose.yml -f docker-compose.nvidia.yml build
```

### Run container
```bash
docker-compose -f docker-compose.yml -f docker-compose.nvidia.yml up -d
```


### Run containers with tf_annotation app

If you would like to enable tf_annotation app first of all be sure that nvidia-driver, nvidia-docker and docker-compose>=1.19.0 are installed properly (see instructions above) and `docker info | grep 'Runtimes'` output contains `nvidia`.

Run following command:
```bash
docker-compose -f docker-compose.yml -f docker-compose.nvidia.yml up -d --build
```
