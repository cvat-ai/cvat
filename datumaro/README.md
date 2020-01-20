# Dataset Framework (Datumaro)

A framework to build, transform, and analyze datasets.

<!--lint disable fenced-code-flag-->
```
CVAT annotations  --                              ---> Annotation tool
...                  \                          /
COCO-like dataset -----> Datumaro ---> dataset ------> Model training
...                  /                          \
VOC-like dataset  --                              ---> Publication etc.
```
<!--lint enable fenced-code-flag-->

# Contents

- [Features](#features)
- [Installation](#installation)
- [Development](#development)

## Features

- Dataset format conversions:
  - COCO (`image_info`, `instances`, `person_keypoints`, `captions`, `labels`*)
    - [Format specification](http://cocodataset.org/#format-data)
    - `labels` are our extension - like `instances` with only `category_id`
  - PASCAL VOC (`classification`, `detection`, `segmentation` (class, instances), `action_classification`, `person_layout`)
    - [Format specification](http://host.robots.ox.ac.uk/pascal/VOC/voc2012/htmldoc/index.html)
  - YOLO (`bboxes`)
    - [Format specification](https://github.com/AlexeyAB/darknet#how-to-train-pascal-voc-data)
  - TF Detection API (`bboxes`, `masks`)
    - Format specifications: [bboxes](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/using_your_own_dataset.md), [masks](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/instance_segmentation.md)
  - CVAT
- Dataset building operations:
  - Merging multiple datasets into one
  - Dataset filtering with custom conditions, for instance:
    - remove all annotations except polygons of a certain class
    - remove images without a specific class
    - remove occluded annotations from images
    - keep only vertically-oriented images
    - remove small area bounding boxes from annotations
  - Annotation conversions, for instance
    - polygons to instance masks and vise-versa
    - apply a custom colormap for mask annotations
    - remap dataset labels
- Dataset comparison
- Model integration:
  - Inference (OpenVINO and custom models)
  - Explainable AI ([RISE algorithm](https://arxiv.org/abs/1806.07421))

> Check the [design document](docs/design.md) for a full list of features

## Examples

- Convert PASCAL VOC to COCO, keep only images with 'cat' class presented:
  ```bash
  datum project import -f voc -s <path/to/voc>
  datum project export -f coco -e '/item[annotation/label="cat"]'
  ```

- Convert only non-occluded annotations from a CVAT-annotated project to TFrecord:
  ```bash
  # export Datumaro dataset in CVAT UI, extract somewhere, go to the project dir
  datum project extract -a -e '/item/annotation[occluded="False"]' --remove-empty
  datum project export -f tf_detection_api -- --save-images
  ```

- Annotate COCO, extract image subset, re-annotate it in CVAT, update old dataset:
  ```bash
  datum project import -f coco -s <path/to/coco>
  datum project export -e '/image[some_condition]' -f cvat -d reannotation
  # import dataset and images to CVAT, re-annotate
  # export Datumaro project, extract to 'reannotation-upd'
  datum project project merge reannotation-upd
  datum project export -f coco
  ```

- Apply an OpenVINO detection model to some COCO-like dataset,
  then compare annotations with ground truth and visualize in TensorBoard:
  ```bash
  datum project import -f coco -s <path/to/coco>
  # create model results interpretation script
  datum model add mymodel openvino -w model.bin -d model.xml -i parse_results.py
  datum model run -m mymodel -d mymodel-inference/
  datum project diff mymodel-inference/ -f tensorboard -d diff
  ```

## Documentation

- [Quick start guide](docs/quickstart.md)

## Installation

``` bash
python -m pip install virtualenv
python -m virtualenv venv
. venv/bin/activate
pip install 'git+https://github.com/opencv/cvat#egg=datumaro&subdirectory=datumaro'
```

## Usage

There are several options available:
- [A standalone command-line tool](#standalone-tool)
- [A python module](#python-module)

### Standalone tool

<!--lint disable fenced-code-flag-->
```
    User
        |
        v
+------------------+
|       CVAT       |
+--------v---------+       +------------------+       +--------------+
| Datumaro module  | ----> | Datumaro project | <---> | Datumaro CLI | <--- User
+------------------+       +------------------+       +--------------+
```
<!--lint enable fenced-code-flag-->

### Python module

Datumaro can be used in custom scripts as a library in the following way:

``` python
from datumaro.components.project import Project # project-related things
import datumaro.components.extractor # annotations and high-level interfaces
# etc.
project = Project.load('directory')
```

## Development

### Installation

``` bash
git clone https://github.com/opencv/cvat
```

Python3.5+ is required.

To install into a virtual environment do:

``` bash
python -m pip install virtualenv
python -m virtualenv venv
. venv/bin/activate
pip install -r requirements.txt
```

### Testing

``` bash
python -m unittest discover -s tests
```
