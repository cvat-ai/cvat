<!--
 Copyright (C) 2021 Intel Corporation

 SPDX-License-Identifier: MIT
-->

# Serverless tutorial

## Introduction

- What is automatic and semi-automatic annotation?
- When does it work? Limitations.
- The idea behind serverless functions? What is it?
- Nuclio introduction and basic links.
- How to install CVAT with serverless functions?

## User story

- Architecture of a serverless functions in CVAT (function.yaml, entry point)
- Choose a dataset which you want to annotate

- Choose a custom model which you want to integrate - DONE
- Prepare necessary files (function.yaml, main.py) - DONE

- Automatically annotate data using the prepared model
- Compare results with the ground truth using Datumaro
- Conclusion

## Advanced capabilities

- Optimize using GPU
- Testing
- Logging (docker)
- Debugging
- Troubleshooting

## Choose a DL model

In my case I will choose a popular AI library with a lot of models inside.
In your case it can be your own model. If it is based on detectron2 it
will be easy to integrate. Just follow the tutorial.

[Detectron2][detectron2-github] is Facebook AI Research's next generation
library that provides state-of-the-art detection and segmentation algorithms.
It is the successor of Detectron and maskrcnn-benchmark. It supports a number
of computer vision research projects and production applications in Facebook.

Clone the repository somewhere. I assume that all other experiments will be
run from the cloned `detectron2` directory.

```sh
git clone https://github.com/facebookresearch/detectron2
cd detectron2
```

## Run local experiments

Let's run a detection model locally. First of all need to
[install requirements][detectron2-requirements] for the library.

In my case I have Ubuntu 20.04 with python 3.8.5. I installed
[PyTorch 1.8.1][pytorch-install] for Linux with pip, python, and CPU inside
a virtual environment. Follow [opencv-python][opencv-python-github]
installation guide to get the library for demo and visualization.

```bash
python3 -m venv .detectron2
. .detectron2/bin/activate
pip install torch==1.8.1+cpu torchvision==0.9.1+cpu torchaudio==0.8.1 -f https://download.pytorch.org/whl/torch_stable.html
pip install opencv-python
```

Install the detectron2 library from your local clone.

```sh
python -m pip install -e detectron2 .
```

After the library from Facebook AI Research is installed, we can run a couple
of experiments. See the [official tutorial][detectron2-tutorial] for more
examples. I decided to experiment with [RetinaNet][retinanet-model-zoo]. First
step is to download model weights.

```sh
curl -O https://dl.fbaipublicfiles.com/detectron2/COCO-Detection/retinanet_R_101_FPN_3x/190397697/model_final_971ab9.pkl
```

To run experiments let's download an image with cats from wikipedia.

```sh
curl -O https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/1920px-Cat_poster_1.jpg
```

Finally let's run the DL model inference on CPU. If all is fine, you will see
a window with cats and bounding boxes around them with scores.

```sh
python demo/demo.py --config-file configs/COCO-Detection/retinanet_R_101_FPN_3x.yaml \
    --input 1920px-Cat_poster_1.jpg --opts MODEL.WEIGHTS model_final_971ab9.pkl MODEL.DEVICE cpu
```

![Cats detected by RetinaNet R101](images/detectron2_detected_cats.jpg)

Next step is to minimize `demo/demo.py` script and keep code which is necessary to load,
run, and interpret output of the model only. Let's hard code parameters and remove
argparse. Keep only code which is responsible for working with an image. There is
no common advice how to minimize some code.

Finally you should get something like the code below which has fixed config, read a
predefined image, initialize predictor, and run inference. As the final step it prints
all detected bounding boxes with scores and labels.

```python
from detectron2.config import get_cfg
from detectron2.data.detection_utils import read_image
from detectron2.engine.defaults import DefaultPredictor
from detectron2.data.datasets.builtin_meta import COCO_CATEGORIES

CONFIG_FILE = "configs/COCO-Detection/retinanet_R_101_FPN_3x.yaml"
CONFIG_OPTS = ["MODEL.WEIGHTS", "model_final_971ab9.pkl", "MODEL.DEVICE", "cpu"]
CONFIDENCE_THRESHOLD = 0.5

def setup_cfg():
    cfg = get_cfg()
    cfg.merge_from_file(CONFIG_FILE)
    cfg.merge_from_list(CONFIG_OPTS)
    cfg.MODEL.RETINANET.SCORE_THRESH_TEST = CONFIDENCE_THRESHOLD
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = CONFIDENCE_THRESHOLD
    cfg.MODEL.PANOPTIC_FPN.COMBINE.INSTANCES_CONFIDENCE_THRESH = CONFIDENCE_THRESHOLD
    cfg.freeze()
    return cfg


if __name__ == "__main__":
    cfg = setup_cfg()
    input = "1920px-Cat_poster_1.jpg"
    img = read_image(input, format="BGR")
    predictor = DefaultPredictor(cfg)
    predictions = predictor(img)
    instances = predictions['instances']
    pred_boxes = instances.pred_boxes
    scores = instances.scores
    pred_classes = instances.pred_classes
    for box, score, label in zip(pred_boxes, scores, pred_classes):
        label = COCO_CATEGORIES[int(label)]["name"]
        print(box.tolist(), float(score), label)
```

## DL model as a serverless function

When we know how to run the DL model locally, we can prepare a serverless
function which can be used by CVAT to annotate data. Let's see how function.yaml
will look like...

Let's look at [faster_rcnn_inception_v2_coco][faster-rcnn-function] serverless
function configuration as an example and try adapting it to our case.
First of all let's invent an unique name for the new function:
`pth.facebookresearch.detectron2.retinanet_r101`. Section `annotations`
describes our function for CVAT serverless subsystem:

- `annotations.name` is a display name
- `annotations.type` is a type of the serverless function. It can have
  several different values. Basically it affects input and output of the function.
  In our case it has `detector` type and it means that the integrated DL model can
  generate shapes with labels for an image.
- `annotations.framework` is used for information only and can have arbitrary
  value. Usually it has values like OpenVINO, PyTorch, TensorFlow, etc.
- `annotations.spec` describes the list of labels which the model supports. In
  the case the DL model was trained on MS COCO dataset and the list of labels
  correspond to the dataset.
- `spec.description` is used to provide basic information for the model.

All other parameters are described in [nuclio documentation][nuclio-doc].

- `spec.handler` is the entry point to your function.
- `spec.runtime` is the name of the language runtime.
- `spec.eventTimeout` is the global event timeout

Next step is to describe how to build our serverless function:

- `spec.build.image` is the name of your docker image
- `spec.build.baseImage` is the name of a base container image from which to build the function
- `spec.build.directives` are commands to build your docker image

In our case we start from Ubuntu 20.04 base image, install `curl` to download
weights for our model, `git` to clone detectron2 project from GitHub, and
`python` together with `pip`. Repeat installation steps which we used to setup
the DL model locally with minor modifications.

For Nuclio platform we have to specify a couple of more parameters:

- `spec.triggers.myHttpTrigger` describes [HTTP trigger][nuclio-http-trigger-doc]
  to handle incoming HTTP requests.
- `spec.platform` describes some important parameters to run your functions like
  `restartPolicy` and `mountMode`. Read nuclio documentation for more details.

```yaml
metadata:
  name: pth.facebookresearch.detectron2.retinanet_r101
  namespace: cvat
  annotations:
    name: RetinaNet R101
    type: detector
    framework: pytorch
    spec: |
      [
        { "id": 1, "name": "person" },
        { "id": 2, "name": "bicycle" },

        ...

        { "id":89, "name": "hair_drier" },
        { "id":90, "name": "toothbrush" }
      ]

spec:
  description: RetinaNet R101 from Detectron2
  runtime: 'python:3.8'
  handler: main:handler
  eventTimeout: 30s

  build:
    image: cvat/pth.facebookresearch.detectron2.retinanet_r101
    baseImage: ubuntu:20.04

    directives:
      preCopy:
        - kind: ENV
          value: DEBIAN_FRONTEND=noninteractive
        - kind: RUN
          value: apt-get update && apt-get -y install curl git python3 python3-pip
        - kind: WORKDIR
          value: /opt/nuclio
        - kind: RUN
          value: pip3 install torch==1.8.1+cpu torchvision==0.9.1+cpu torchaudio==0.8.1 -f https://download.pytorch.org/whl/torch_stable.html
        - kind: RUN
          value: git clone https://github.com/facebookresearch/detectron2
        - kind: RUN
          value: pip3 install -e detectron2
        - kind: RUN
          value: curl -O https://dl.fbaipublicfiles.com/detectron2/COCO-Detection/retinanet_R_101_FPN_3x/190397697/model_final_971ab9.pkl
        - kind: RUN
          value: ln -s /usr/bin/pip3 /usr/local/bin/pip

  triggers:
    myHttpTrigger:
      maxWorkers: 2
      kind: 'http'
      workerAvailabilityTimeoutMilliseconds: 10000
      attributes:
        maxRequestBodySize: 33554432 # 32MB

  platform:
    attributes:
      restartPolicy:
        name: always
        maximumRetryCount: 3
      mountMode: volume
```

Full code can be found here: [detectron2/retinanet/nuclio/function.yaml][retinanet-function-yaml]

Next step is to adapt our source code which we implemented to run the DL model
locally to requirements of nuclio platform. First step is to load the model
into memory using `init_context(context)` function. Read more about the function
in [Best Practices and Common Pitfalls][nuclio-bkms-doc].

After that we need to accept incoming HTTP requests, run inference,
reply with detection results. For the process our entry point is resposible
which we specified in our function specification `handler(context, event)`.
Again in accordance to function specification the entry point should be
located inside `main.py`.

```python

def init_context(context):
    cfg = get_cfg()
    cfg.merge_from_file(CONFIG_FILE)
    cfg.merge_from_list(CONFIG_OPTS)
    cfg.MODEL.RETINANET.SCORE_THRESH_TEST = CONFIDENCE_THRESHOLD
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = CONFIDENCE_THRESHOLD
    cfg.MODEL.PANOPTIC_FPN.COMBINE.INSTANCES_CONFIDENCE_THRESH = CONFIDENCE_THRESHOLD
    cfg.freeze()
    predictor = DefaultPredictor(cfg)

    setattr(context.user_data, 'model_handler', predictor)
    functionconfig = yaml.safe_load(open("/opt/nuclio/function.yaml"))
    labels_spec = functionconfig['metadata']['annotations']['spec']
    labels = {item['id']: item['name'] for item in json.loads(labels_spec)}
    setattr(context.user_data, "labels", labels)

def handler(context, event):
    data = event.body
    buf = io.BytesIO(base64.b64decode(data["image"].encode('utf-8')))
    threshold = float(data.get("threshold", 0.5))
    image = convert_PIL_to_numpy(Image.open(buf), format="BGR")

    predictions = context.user_data.model_handler(image)

    instances = predictions['instances']
    pred_boxes = instances.pred_boxes
    scores = instances.scores
    pred_classes = instances.pred_classes
    results = []
    for box, score, label in zip(pred_boxes, scores, pred_classes):
        label = COCO_CATEGORIES[int(label)]["name"]
        if score >= threshold:
            results.append({
                "confidence": str(float(score)),
                "label": label,
                "points": box.tolist(),
                "type": "rectangle",
            })

    return context.Response(body=json.dumps(results), headers={},
        content_type='application/json', status_code=200)

```

Full code can be found here: [detectron2/retinanet/nuclio/main.py][retinanet-main-py]

## Deploy RetinaNet serverless function

To use the new serverless function you have to deploy it using `nuctl` command.
The actual deployment process is described in
[automatic annotation guide][cvat-auto-annotation-guide]

[detectron2-github]: https://github.com/facebookresearch/detectron2
[detectron2-requirements]: https://detectron2.readthedocs.io/en/latest/tutorials/install.html
[pytorch-install]: https://pytorch.org/get-started/locally/
[opencv-python-github]: https://github.com/opencv/opencv-python
[detectron2-tutorial]: https://detectron2.readthedocs.io/en/latest/tutorials/getting_started.html
[retinanet-model-zoo]: https://github.com/facebookresearch/detectron2/blob/master/MODEL_ZOO.md#retinanet
[faster-rcnn-function]: https://raw.githubusercontent.com/openvinotoolkit/cvat/38b774046d41d604ed85a521587e4bacce61b69c/serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio/function.yaml
[nuclio-doc]: https://nuclio.io/docs/latest/reference/function-configuration/function-configuration-reference/
[nuclio-http-trigger-doc]: https://nuclio.io/docs/latest/reference/triggers/http/
[nuclio-bkms-doc]: https://nuclio.io/docs/latest/concepts/best-practices-and-common-pitfalls/
[retinanet-function-yaml]: https://github.com/openvinotoolkit/cvat/blob/b2f616859ca64687c385e636b4a25014fbb9d17c/serverless/pytorch/facebookresearch/detectron2/retinanet/nuclio/function.yaml
[retinanet-main-py]: https://github.com/openvinotoolkit/cvat/blob/b2f616859ca64687c385e636b4a25014fbb9d17c/serverless/pytorch/facebookresearch/detectron2/retinanet/nuclio/main.py
