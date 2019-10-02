## [Intel OpenVINO toolkit](https://software.intel.com/en-us/openvino-toolkit)

### Requirements

* Intel Core with 6th generation and higher or Intel Xeon CPUs.

### Preparation

* Download [OpenVINO toolkit 2018R5](https://software.intel.com/en-us/openvino-toolkit) .tgz installer (offline or online) for Ubuntu platforms.
* Put downloaded file into ```components/openvino```.
* Accept EULA in the eula.cfg file.

### Build docker image
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/openvino/docker-compose.openvino.yml build
```

### Run docker container
```bash
# From project root directory
docker-compose -f docker-compose.yml -f components/openvino/docker-compose.openvino.yml up -d
```
