---
title: 'Setup additional components in development environment'
linkTitle: 'Setup additional components in development environment'
weight: 3
description: 'Deploying a DL model as a serverless function and Cypress tests.'
---

## DL models as serverless functions

Follow this [guide](/docs/administration/advanced/installation_automatic_annotation/) to install Nuclio:

- You have to install `nuctl` command line tool to build and deploy serverless
  functions.
- The simplest way to explore Nuclio is to run its graphical user interface (GUI)
  of the Nuclio dashboard. All you need in order to run the dashboard is Docker. See
  [nuclio documentation](https://github.com/nuclio/nuclio#quick-start-steps)
  for more details.
- Create `cvat` project inside nuclio dashboard where you will deploy new
  serverless functions and deploy a couple of DL models.

```bash
nuctl create project cvat
```

```bash
nuctl deploy --project-name cvat \
    --path serverless/openvino/dextr/nuclio \
    --volume `pwd`/serverless/common:/opt/nuclio/common \
    --platform local
```

<details>

```
20.07.17 12:02:23.247                     nuctl (I) Deploying function {"name": ""}
20.07.17 12:02:23.248                     nuctl (I) Building {"versionInfo": "Label: 1.4.8, Git commit: 238d4539ac7783896d6c414535d0462b5f4cbcf1, OS: darwin, Arch: amd64, Go version: go1.14.3", "name": ""}
20.07.17 12:02:23.447                     nuctl (I) Cleaning up before deployment
20.07.17 12:02:23.535                     nuctl (I) Function already exists, deleting
20.07.17 12:02:25.877                     nuctl (I) Staging files and preparing base images
20.07.17 12:02:25.891                     nuctl (I) Building processor image {"imageName": "cvat/openvino.dextr:latest"}
20.07.17 12:02:25.891     nuctl.platform.docker (I) Pulling image {"imageName": "quay.io/nuclio/handler-builder-python-onbuild:1.4.8-amd64"}
20.07.17 12:02:29.270     nuctl.platform.docker (I) Pulling image {"imageName": "quay.io/nuclio/uhttpc:0.0.1-amd64"}
20.07.17 12:02:33.208            nuctl.platform (I) Building docker image {"image": "cvat/openvino.dextr:latest"}
20.07.17 12:02:34.464            nuctl.platform (I) Pushing docker image into registry {"image": "cvat/openvino.dextr:latest", "registry": ""}
20.07.17 12:02:34.464            nuctl.platform (I) Docker image was successfully built and pushed into docker registry {"image": "cvat/openvino.dextr:latest"}
20.07.17 12:02:34.464                     nuctl (I) Build complete {"result": {"Image":"cvat/openvino.dextr:latest","UpdatedFunctionConfig":{"metadata":{"name":"openvino.dextr","namespace":"nuclio","labels":{"nuclio.io/project-name":"cvat"},"annotations":{"framework":"openvino","spec":"","type":"interactor"}},"spec":{"description":"Deep Extreme Cut","handler":"main:handler","runtime":"python:3.6","env":[{"name":"NUCLIO_PYTHON_EXE_PATH","value":"/opt/nuclio/python3"}],"resources":{},"image":"cvat/openvino.dextr:latest","targetCPU":75,"triggers":{"myHttpTrigger":{"class":"","kind":"http","name":"","maxWorkers":2,"workerAvailabilityTimeoutMilliseconds":10000,"attributes":{"maxRequestBodySize":33554432}}},"volumes":[{"volume":{"name":"volume-1","hostPath":{"path":"/Users/nmanovic/Workspace/cvat/serverless/openvino/common"}},"volumeMount":{"name":"volume-1","mountPath":"/opt/nuclio/common"}}],"build":{"image":"cvat/openvino.dextr","baseImage":"openvino/ubuntu18_runtime:2020.2","directives":{"postCopy":[{"kind":"RUN","value":"curl -O https://download.01.org/openvinotoolkit/models_contrib/cvat/dextr_model_v1.zip"},{"kind":"RUN","value":"unzip dextr_model_v1.zip"},{"kind":"RUN","value":"pip3 install Pillow"},{"kind":"USER","value":"openvino"}],"preCopy":[{"kind":"USER","value":"root"},{"kind":"WORKDIR","value":"/opt/nuclio"},{"kind":"RUN","value":"ln -s /usr/bin/pip3 /usr/bin/pip"}]},"codeEntryType":"image"},"platform":{},"readinessTimeoutSeconds":60,"eventTimeout":"30s"}}}}
20.07.17 12:02:35.012            nuctl.platform (I) Waiting for function to be ready {"timeout": 60}
20.07.17 12:02:37.448                     nuctl (I) Function deploy complete {"httpPort": 55274}
```

</details>

```bash
nuctl deploy --project-name cvat \
    --path serverless/openvino/omz/public/yolo-v3-tf/nuclio \
    --volume `pwd`/serverless/openvino/common:/opt/nuclio/common \
    --platform local
```

<details>

```
20.07.17 12:05:23.377                     nuctl (I) Deploying function {"name": ""}
20.07.17 12:05:23.378                     nuctl (I) Building {"versionInfo": "Label: 1.4.8, Git commit: 238d4539ac7783896d6c414535d0462b5f4cbcf1, OS: darwin, Arch: amd64, Go version: go1.14.3", "name": ""}
20.07.17 12:05:23.590                     nuctl (I) Cleaning up before deployment
20.07.17 12:05:23.694                     nuctl (I) Function already exists, deleting
20.07.17 12:05:24.271                     nuctl (I) Staging files and preparing base images
20.07.17 12:05:24.274                     nuctl (I) Building processor image {"imageName": "cvat/openvino.omz.public.yolo-v3-tf:latest"}
20.07.17 12:05:24.274     nuctl.platform.docker (I) Pulling image {"imageName": "quay.io/nuclio/handler-builder-python-onbuild:1.4.8-amd64"}
20.07.17 12:05:27.432     nuctl.platform.docker (I) Pulling image {"imageName": "quay.io/nuclio/uhttpc:0.0.1-amd64"}
20.07.17 12:05:31.462            nuctl.platform (I) Building docker image {"image": "cvat/openvino.omz.public.yolo-v3-tf:latest"}
20.07.17 12:05:32.798            nuctl.platform (I) Pushing docker image into registry {"image": "cvat/openvino.omz.public.yolo-v3-tf:latest", "registry": ""}
20.07.17 12:05:32.798            nuctl.platform (I) Docker image was successfully built and pushed into docker registry {"image": "cvat/openvino.omz.public.yolo-v3-tf:latest"}
20.07.17 12:05:32.798                     nuctl (I) Build complete {"result": {"Image":"cvat/openvino.omz.public.yolo-v3-tf:latest","UpdatedFunctionConfig":{"metadata":{"name":"openvino.omz.public.yolo-v3-tf","namespace":"nuclio","labels":{"nuclio.io/project-name":"cvat"},"annotations":{"framework":"openvino","name":"YOLO v3","spec":"[\n  { \"id\": 0, \"name\": \"person\" },\n  { \"id\": 1, \"name\": \"bicycle\" },\n  { \"id\": 2, \"name\": \"car\" },\n  { \"id\": 3, \"name\": \"motorbike\" },\n  { \"id\": 4, \"name\": \"aeroplane\" },\n  { \"id\": 5, \"name\": \"bus\" },\n  { \"id\": 6, \"name\": \"train\" },\n  { \"id\": 7, \"name\": \"truck\" },\n  { \"id\": 8, \"name\": \"boat\" },\n  { \"id\": 9, \"name\": \"traffic light\" },\n  { \"id\": 10, \"name\": \"fire hydrant\" },\n  { \"id\": 11, \"name\": \"stop sign\" },\n  { \"id\": 12, \"name\": \"parking meter\" },\n  { \"id\": 13, \"name\": \"bench\" },\n  { \"id\": 14, \"name\": \"bird\" },\n  { \"id\": 15, \"name\": \"cat\" },\n  { \"id\": 16, \"name\": \"dog\" },\n  { \"id\": 17, \"name\": \"horse\" },\n  { \"id\": 18, \"name\": \"sheep\" },\n  { \"id\": 19, \"name\": \"cow\" },\n  { \"id\": 20, \"name\": \"elephant\" },\n  { \"id\": 21, \"name\": \"bear\" },\n  { \"id\": 22, \"name\": \"zebra\" },\n  { \"id\": 23, \"name\": \"giraffe\" },\n  { \"id\": 24, \"name\": \"backpack\" },\n  { \"id\": 25, \"name\": \"umbrella\" },\n  { \"id\": 26, \"name\": \"handbag\" },\n  { \"id\": 27, \"name\": \"tie\" },\n  { \"id\": 28, \"name\": \"suitcase\" },\n  { \"id\": 29, \"name\": \"frisbee\" },\n  { \"id\": 30, \"name\": \"skis\" },\n  { \"id\": 31, \"name\": \"snowboard\" },\n  { \"id\": 32, \"name\": \"sports ball\" },\n  { \"id\": 33, \"name\": \"kite\" },\n  { \"id\": 34, \"name\": \"baseball bat\" },\n  { \"id\": 35, \"name\": \"baseball glove\" },\n  { \"id\": 36, \"name\": \"skateboard\" },\n  { \"id\": 37, \"name\": \"surfboard\" },\n  { \"id\": 38, \"name\": \"tennis racket\" },\n  { \"id\": 39, \"name\": \"bottle\" },\n  { \"id\": 40, \"name\": \"wine glass\" },\n  { \"id\": 41, \"name\": \"cup\" },\n  { \"id\": 42, \"name\": \"fork\" },\n  { \"id\": 43, \"name\": \"knife\" },\n  { \"id\": 44, \"name\": \"spoon\" },\n  { \"id\": 45, \"name\": \"bowl\" },\n  { \"id\": 46, \"name\": \"banana\" },\n  { \"id\": 47, \"name\": \"apple\" },\n  { \"id\": 48, \"name\": \"sandwich\" },\n  { \"id\": 49, \"name\": \"orange\" },\n  { \"id\": 50, \"name\": \"broccoli\" },\n  { \"id\": 51, \"name\": \"carrot\" },\n  { \"id\": 52, \"name\": \"hot dog\" },\n  { \"id\": 53, \"name\": \"pizza\" },\n  { \"id\": 54, \"name\": \"donut\" },\n  { \"id\": 55, \"name\": \"cake\" },\n  { \"id\": 56, \"name\": \"chair\" },\n  { \"id\": 57, \"name\": \"sofa\" },\n  { \"id\": 58, \"name\": \"pottedplant\" },\n  { \"id\": 59, \"name\": \"bed\" },\n  { \"id\": 60, \"name\": \"diningtable\" },\n  { \"id\": 61, \"name\": \"toilet\" },\n  { \"id\": 62, \"name\": \"tvmonitor\" },\n  { \"id\": 63, \"name\": \"laptop\" },\n  { \"id\": 64, \"name\": \"mouse\" },\n  { \"id\": 65, \"name\": \"remote\" },\n  { \"id\": 66, \"name\": \"keyboard\" },\n  { \"id\": 67, \"name\": \"cell phone\" },\n  { \"id\": 68, \"name\": \"microwave\" },\n  { \"id\": 69, \"name\": \"oven\" },\n  { \"id\": 70, \"name\": \"toaster\" },\n  { \"id\": 71, \"name\": \"sink\" },\n  { \"id\": 72, \"name\": \"refrigerator\" },\n  { \"id\": 73, \"name\": \"book\" },\n  { \"id\": 74, \"name\": \"clock\" },\n  { \"id\": 75, \"name\": \"vase\" },\n  { \"id\": 76, \"name\": \"scissors\" },\n  { \"id\": 77, \"name\": \"teddy bear\" },\n  { \"id\": 78, \"name\": \"hair drier\" },\n  { \"id\": 79, \"name\": \"toothbrush\" }\n]\n","type":"detector"}},"spec":{"description":"YOLO v3 via Intel OpenVINO","handler":"main:handler","runtime":"python:3.6","env":[{"name":"NUCLIO_PYTHON_EXE_PATH","value":"/opt/nuclio/common/python3"}],"resources":{},"image":"cvat/openvino.omz.public.yolo-v3-tf:latest","targetCPU":75,"triggers":{"myHttpTrigger":{"class":"","kind":"http","name":"","maxWorkers":2,"workerAvailabilityTimeoutMilliseconds":10000,"attributes":{"maxRequestBodySize":33554432}}},"volumes":[{"volume":{"name":"volume-1","hostPath":{"path":"/Users/nmanovic/Workspace/cvat/serverless/openvino/common"}},"volumeMount":{"name":"volume-1","mountPath":"/opt/nuclio/common"}}],"build":{"image":"cvat/openvino.omz.public.yolo-v3-tf","baseImage":"openvino/ubuntu18_dev:2020.2","directives":{"postCopy":[{"kind":"USER","value":"openvino"}],"preCopy":[{"kind":"USER","value":"root"},{"kind":"WORKDIR","value":"/opt/nuclio"},{"kind":"RUN","value":"ln -s /usr/bin/pip3 /usr/bin/pip"},{"kind":"RUN","value":"/opt/intel/openvino/deployment_tools/open_model_zoo/tools/downloader/downloader.py --name yolo-v3-tf -o /opt/nuclio/open_model_zoo"},{"kind":"RUN","value":"/opt/intel/openvino/deployment_tools/open_model_zoo/tools/downloader/converter.py --name yolo-v3-tf --precisions FP32 -d /opt/nuclio/open_model_zoo -o /opt/nuclio/open_model_zoo"}]},"codeEntryType":"image"},"platform":{},"readinessTimeoutSeconds":60,"eventTimeout":"30s"}}}}
20.07.17 12:05:33.285            nuctl.platform (I) Waiting for function to be ready {"timeout": 60}
20.07.17 12:05:35.452                     nuctl (I) Function deploy complete {"httpPort": 57308}
```

</details>

- Display a list of running serverless functions using `nuctl` command or see them
  in nuclio dashboard:

```bash
nuctl get function
```

<details>

```
  NAMESPACE |                             NAME                              | PROJECT | STATE | NODE PORT | REPLICAS
  nuclio    | openvino.dextr                                                | cvat    | ready |     55274 | 1/1
  nuclio    | openvino.omz.public.yolo-v3-tf                                | cvat    | ready |     57308 | 1/1
```

</details>

- Test your deployed DL model as a serverless function. The command below
  should work on Linux and Mac OS.

```bash
image=$(curl https://upload.wikimedia.org/wikipedia/en/7/7d/Lenna_%28test_image%29.png --output - | base64 | tr -d '\n')
cat << EOF > /tmp/input.json
{"image": "$image"}
EOF
cat /tmp/input.json | nuctl invoke openvino.omz.public.yolo-v3-tf -c 'application/json'
```

<details>

```
20.07.17 12:07:44.519    nuctl.platform.invoker (I) Executing function {"method": "POST", "url": "http://:57308", "headers": {"Content-Type":["application/json"],"X-Nuclio-Log-Level":["info"],"X-Nuclio-Target":["openvino.omz.public.yolo-v3-tf"]}}
20.07.17 12:07:45.275    nuctl.platform.invoker (I) Got response {"status": "200 OK"}
20.07.17 12:07:45.275                     nuctl (I) >>> Start of function logs
20.07.17 12:07:45.275 ino.omz.public.yolo-v3-tf (I) Run yolo-v3-tf model {"worker_id": "0", "time": 1594976864570.9353}
20.07.17 12:07:45.275                     nuctl (I) <<< End of function logs

> Response headers:
Date = Fri, 17 Jul 2020 09:07:45 GMT
Content-Type = application/json
Content-Length = 100
Server = nuclio

> Response body:
[
    {
        "confidence": "0.9992254",
        "label": "person",
        "points": [
            39,
            124,
            408,
            512
        ],
        "type": "rectangle"
    }
]
```

</details>

## Run Cypress tests
- Install Сypress as described in the [documentation](https://docs.cypress.io/guides/getting-started/installing-cypress.html).
- Run cypress tests:
```bash
    cd <cvat_local_repository>/tests
    <cypress_installation_directory>/node_modules/.bin/cypress run --headless --browser chrome
```
For more information, see the [documentation](https://docs.cypress.io/).
