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
- Choose a custom model which you want to integrate
- Prepare necessary files (function.yaml, main.py)
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
In you case it can be your own model. If it is based on detectron2 it
will be easy to integrate.

[Detectron2][detectron2-github] is Facebook AI Research's next generation
library that provides state-of-the-art detection and segmentation algorithms.
It is the successor of Detectron and maskrcnn-benchmark. It supports a number
of computer vision research projects and production applications in Facebook.

Clone the repository somewhere. I assume that all other experiments will be
run from `detectron2` directory.

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
function as an example and try adapting it to our case. First of all let's
invent an unique name for the new function: `pth-retinanet-R101`.
Section `annotations` describes our function for CVAT serverless subsystem:

- `annotations.name` is a display name
- `annotations.type` is a type of the serverless function. It can have
  several different values. Basically it affects input and output of the function.
  In our case it has `detector` type and it means that the integrated DL model can
  generate shapes with labels for an image.
- `annotations.framework` is used for information only and can have arbitrary
  value.
- `annotations.spec` describes the list of labels which the model supports. In
  the case the DL model was trained on MS COCO dataset and the list of labels
  correspond to the dataset.
- `spec.description` will be used to provide basic information for the model.

All other parameters are described in [nuclio documentation][nuclio-doc].

- `spec.handler` is the entry point to your function.
- `spec.runtime` is the name of the language runtime.
- `spec.eventTimeout` is the global event timeout.

```yaml
metadata:
  name: pth-retinanet-R101
  namespace: cvat
  annotations:
    name: RetinaNet R101
    type: detector
    framework: pytorch
    spec: |
      [
        { "id": 1, "name": "person" },
        { "id": 2, "name": "bicycle" },
        { "id": 3, "name": "car" },
        { "id": 4, "name": "motorcycle" },
        { "id": 5, "name": "airplane" },
        { "id": 6, "name": "bus" },
        { "id": 7, "name": "train" },
        { "id": 8, "name": "truck" },
        { "id": 9, "name": "boat" },
        { "id":10, "name": "traffic_light" },
        { "id":11, "name": "fire_hydrant" },
        { "id":13, "name": "stop_sign" },
        { "id":14, "name": "parking_meter" },
        { "id":15, "name": "bench" },
        { "id":16, "name": "bird" },
        { "id":17, "name": "cat" },
        { "id":18, "name": "dog" },
        { "id":19, "name": "horse" },
        { "id":20, "name": "sheep" },
        { "id":21, "name": "cow" },
        { "id":22, "name": "elephant" },
        { "id":23, "name": "bear" },
        { "id":24, "name": "zebra" },
        { "id":25, "name": "giraffe" },
        { "id":27, "name": "backpack" },
        { "id":28, "name": "umbrella" },
        { "id":31, "name": "handbag" },
        { "id":32, "name": "tie" },
        { "id":33, "name": "suitcase" },
        { "id":34, "name": "frisbee" },
        { "id":35, "name": "skis" },
        { "id":36, "name": "snowboard" },
        { "id":37, "name": "sports_ball" },
        { "id":38, "name": "kite" },
        { "id":39, "name": "baseball_bat" },
        { "id":40, "name": "baseball_glove" },
        { "id":41, "name": "skateboard" },
        { "id":42, "name": "surfboard" },
        { "id":43, "name": "tennis_racket" },
        { "id":44, "name": "bottle" },
        { "id":46, "name": "wine_glass" },
        { "id":47, "name": "cup" },
        { "id":48, "name": "fork" },
        { "id":49, "name": "knife" },
        { "id":50, "name": "spoon" },
        { "id":51, "name": "bowl" },
        { "id":52, "name": "banana" },
        { "id":53, "name": "apple" },
        { "id":54, "name": "sandwich" },
        { "id":55, "name": "orange" },
        { "id":56, "name": "broccoli" },
        { "id":57, "name": "carrot" },
        { "id":58, "name": "hot_dog" },
        { "id":59, "name": "pizza" },
        { "id":60, "name": "donut" },
        { "id":61, "name": "cake" },
        { "id":62, "name": "chair" },
        { "id":63, "name": "couch" },
        { "id":64, "name": "potted_plant" },
        { "id":65, "name": "bed" },
        { "id":67, "name": "dining_table" },
        { "id":70, "name": "toilet" },
        { "id":72, "name": "tv" },
        { "id":73, "name": "laptop" },
        { "id":74, "name": "mouse" },
        { "id":75, "name": "remote" },
        { "id":76, "name": "keyboard" },
        { "id":77, "name": "cell_phone" },
        { "id":78, "name": "microwave" },
        { "id":79, "name": "oven" },
        { "id":80, "name": "toaster" },
        { "id":81, "name": "sink" },
        { "id":83, "name": "refrigerator" },
        { "id":84, "name": "book" },
        { "id":85, "name": "clock" },
        { "id":86, "name": "vase" },
        { "id":87, "name": "scissors" },
        { "id":88, "name": "teddy_bear" },
        { "id":89, "name": "hair_drier" },
        { "id":90, "name": "toothbrush" }
      ]

spec:
  description: RetinaNet R101 from Detectron2
  runtime: 'python:3.8'
  handler: main:handler
  eventTimeout: 30s

  build:
    image: cvat/pth.detectron2.retinanet-R101
    baseImage: ubuntu:20.04

    directives:
      preCopy:
        - kind: ENV
          value: DEBIAN_FRONTEND=noninteractive
        - kind: RUN
          value: apt-get update && apt-get install curl git python3 python3-pip
        - kind: WORKDIR
          value: /opt/nuclio
        - kind: RUN
          value: pip3 install torch==1.8.1+cpu torchvision==0.9.1+cpu torchaudio==0.8.1 -f https://download.pytorch.org/whl/torch_stable.html
        - kind: RUN
          value: git clone https://github.com/facebookresearch/detectron2
        - kind: WORKDIR
          value: /opt/nuclio/detectron2
        - kind: RUN
          value: pip3 install -e detectron2
        - kind: RUN
          value: curl -O https://dl.fbaipublicfiles.com/detectron2/COCO-Detection/retinanet_R_101_FPN_3x/190397697/model_final_971ab9.pkl

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

[detectron2-github]: https://github.com/facebookresearch/detectron2
[detectron2-requirements]: https://detectron2.readthedocs.io/en/latest/tutorials/install.html
[pytorch-install]: https://pytorch.org/get-started/locally/
[opencv-python-github]: https://github.com/opencv/opencv-python
[detectron2-tutorial]: https://detectron2.readthedocs.io/en/latest/tutorials/getting_started.html
[retinanet-model-zoo]: https://github.com/facebookresearch/detectron2/blob/master/MODEL_ZOO.md#retinanet
[faster-rcnn-function]: https://raw.githubusercontent.com/openvinotoolkit/cvat/38b774046d41d604ed85a521587e4bacce61b69c/serverless/tensorflow/faster_rcnn_inception_v2_coco/nuclio/function.yaml
[nuclio-doc]: https://nuclio.io/docs/latest/reference/function-configuration/function-configuration-reference/
