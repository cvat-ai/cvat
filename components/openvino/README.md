## [Intel OpenVINO toolkit](https://software.intel.com/en-us/openvino-toolkit)

### Requirements

* Intel Core with 6th generation and higher or Intel Xeon CPUs.

### Preparation

* Download latest [OpenVINO toolkit](https://software.intel.com/en-us/openvino-toolkit) installer (offline or online) for Linux platform. It should be .tgz archive. Minimum required version is 2018 R3.
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
