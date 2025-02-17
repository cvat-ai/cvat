---
title: 'Setup additional components in development environment'
linkTitle: 'Setup additional components in development environment'
weight: 3
description: 'Deploying a DL model as a serverless function and Cypress tests.'
---

## DL models as serverless functions

Follow this {{< ilink "/docs/administration/advanced/installation_automatic_annotation" "guide" >}} to install Nuclio:

- You have to install `nuctl` command line tool to build and deploy serverless
  functions.
- The simplest way to explore Nuclio is to run its graphical user interface (GUI)
  of the Nuclio dashboard. All you need in order to run the dashboard is Docker. See
  [nuclio documentation](https://github.com/nuclio/nuclio#quick-start-steps)
  for more details.
- Deploy a couple of functions.
  This will automatically create a `cvat` Nuclio project to contain the functions.

```bash
./serverless/deploy_cpu.sh serverless/openvino/dextr
./serverless/deploy_cpu.sh serverless/openvino/omz/public/yolo-v3-tf
```

- Display a list of running serverless functions using `nuctl` command or see them
  in nuclio dashboard:

```bash
nuctl get function
```

<details>

```
  NAMESPACE |                             NAME                              | PROJECT | STATE | NODE PORT | REPLICAS
  nuclio    | openvino-dextr                                                | cvat    | ready |     55274 | 1/1
  nuclio    | openvino-omz-public-yolo-v3-tf                                | cvat    | ready |     57308 | 1/1
```

</details>

- Test your deployed DL model as a serverless function. The command below
  should work on Linux and Mac OS.

```bash
image=$(curl https://upload.wikimedia.org/wikipedia/en/7/7d/Lenna_%28test_image%29.png --output - | base64 | tr -d '\n')
cat << EOF > /tmp/input.json
{"image": "$image"}
EOF
cat /tmp/input.json | nuctl invoke openvino-omz-public-yolo-v3-tf -c 'application/json'
```

<details>

```
23.05.11 22:14:17.275    nuctl.platform.invoker (I) Executing function {"method": "POST", "url": "http://0.0.0.0:32771", "bodyLength": 631790, "headers": {"Content-Type":["application/json"],"X-Nuclio-Log-Level":["info"],"X-Nuclio-Target":["openvino-omz-public-yolo-v3-tf"]}}
23.05.11 22:14:17.788    nuctl.platform.invoker (I) Got response {"status": "200 OK"}
23.05.11 22:14:17.789                     nuctl (I) >>> Start of function logs
23.05.11 22:14:17.789 ino-omz-public-yolo-v3-tf (I) Run yolo-v3-tf model {"worker_id": "0", "time": 1683828857301.8765}
23.05.11 22:14:17.789                     nuctl (I) <<< End of function logs

> Response headers:
Server = nuclio
Date = Thu, 11 May 2023 18:14:17 GMT
Content-Type = application/json
Content-Length = 100

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
- Install Cypress as described in the [documentation](https://docs.cypress.io/guides/getting-started/installing-cypress.html).
- Run cypress tests:
```bash
    cd <cvat_local_repository>/tests
    <cypress_installation_directory>/node_modules/.bin/cypress run --headless --browser chrome
```
For more information, see the [documentation](https://docs.cypress.io/).
