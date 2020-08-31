# Dataset Management Framework (Datumaro)

A framework to build, transform, and analyze datasets.

<!--lint disable fenced-code-flag-->
```
CVAT annotations  --                              ---> Annotation tool
                     \                          /
COCO-like dataset -----> Datumaro ---> dataset ------> Model training
                     /                          \
VOC-like dataset  --                              ---> Publication etc.
```
<!--lint enable fenced-code-flag-->

## Contents

- [Documentation](#documentation)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Examples](#examples)
- [Contributing](#contributing)

## Documentation

- [User manual](docs/user_manual.md)
- [Design document](docs/design.md)
- [Contributing](CONTRIBUTING.md)

## Features

- Dataset format conversions:
  - COCO (`image_info`, `instances`, `person_keypoints`, `captions`, `labels`*)
    - [Format specification](http://cocodataset.org/#format-data)
    - [Dataset example](tests/assets/coco_dataset)
    - `labels` are our extension - like `instances` with only `category_id`
  - PASCAL VOC (`classification`, `detection`, `segmentation` (class, instances), `action_classification`, `person_layout`)
    - [Format specification](http://host.robots.ox.ac.uk/pascal/VOC/voc2012/htmldoc/index.html)
    - [Dataset example](tests/assets/voc_dataset)
  - YOLO (`bboxes`)
    - [Format specification](https://github.com/AlexeyAB/darknet#how-to-train-pascal-voc-data)
    - [Dataset example](tests/assets/yolo_dataset)
  - TF Detection API (`bboxes`, `masks`)
    - Format specifications: [bboxes](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/using_your_own_dataset.md), [masks](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/instance_segmentation.md)
    - [Dataset example](tests/assets/tf_detection_api_dataset)
  - MOT sequences
    - [Format specification](https://arxiv.org/pdf/1906.04567.pdf)
    - [Dataset example](tests/assets/mot_dataset)
  - CVAT
    - [Format specification](https://github.com/opencv/cvat/blob/develop/cvat/apps/documentation/xml_format.md)
    - [Dataset example](tests/assets/cvat_dataset)
  - LabelMe
    - [Format specification](http://labelme.csail.mit.edu/Release3.0)
    - [Dataset example](tests/assets/labelme_dataset)
- Dataset building operations:
  - Merging multiple datasets into one
  - Dataset filtering with custom conditions, for instance:
    - remove polygons of a certain class
    - remove images without a specific class
    - remove `occluded` annotations from images
    - keep only vertically-oriented images
    - remove small area bounding boxes from annotations
  - Annotation conversions, for instance:
    - polygons to instance masks and vise-versa
    - apply a custom colormap for mask annotations
    - rename or remove dataset labels
- Dataset comparison
- Model integration:
  - Inference (OpenVINO and custom models)
  - Explainable AI ([RISE algorithm](https://arxiv.org/abs/1806.07421))

> Check the [design document](docs/design.md) for a full list of features

## Installation

Optionally, create a virtual environment:

``` bash
python -m pip install virtualenv
python -m virtualenv venv
. venv/bin/activate
```

Install Datumaro package:

``` bash
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

``` bash
datum --help
python -m datumaro --help
```

### Python module

Datumaro can be used in custom scripts as a library in the following way:

``` python
from datumaro.components.project import Project # project-related things
import datumaro.components.extractor # annotations and high-level interfaces
# etc.
project = Project.load('directory')
```

## Examples

<!--lint disable list-item-indent-->
<!--lint disable list-item-bullet-indent-->

- Convert [PASCAL VOC](http://host.robots.ox.ac.uk/pascal/VOC/voc2012/index.html#data) to COCO, keep only images with `cat` class presented:
  ```bash
  # Download VOC dataset:
  # http://host.robots.ox.ac.uk/pascal/VOC/voc2012/VOCtrainval_11-May-2012.tar
  datum convert --input-format voc --input-path <path/to/voc> \
                --output-format coco --filter '/item[annotation/label="cat"]'
  ```

- Convert only non-occluded annotations from a CVAT-annotated project to TFrecord:
  ```bash
  # export Datumaro dataset in CVAT UI, extract somewhere, go to the project dir
  datum project extract --filter '/item/annotation[occluded="False"]' \
    --mode items+anno --output-dir not_occluded
  datum project export --project not_occluded \
    --format tf_detection_api -- --save-images
  ```

- Annotate COCO, extract image subset, re-annotate it in CVAT, update old dataset:
  ```bash
  # Download COCO dataset http://cocodataset.org/#download
  # Put images to coco/images/ and annotations to coco/annotations/
  datum project import --format coco --input-path <path/to/coco>
  datum project export --filter '/image[images_I_dont_like]' --format cvat \
    --output-dir reannotation
  # import dataset and images to CVAT, re-annotate
  # export Datumaro project, extract to 'reannotation-upd'
  datum project project merge reannotation-upd
  datum project export --format coco
  ```

- Annotate instance polygons in CVAT, export as masks in COCO:
  ```bash
  datum convert --input-format cvat --input-path <path/to/cvat.xml> \
                --output-format coco -- --segmentation-mode masks
  ```

- Apply an OpenVINO detection model to some COCO-like dataset,
  then compare annotations with ground truth and visualize in TensorBoard:
  ```bash
  datum project import --format coco --input-path <path/to/coco>
  # create model results interpretation script
  datum model add mymodel openvino \
    --weights model.bin --description model.xml \
    --interpretation-script parse_results.py
  datum model run --model mymodel --output-dir mymodel_inference/
  datum project diff mymodel_inference/ --format tensorboard --output-dir diff
  ```

- Change colors in PASCAL VOC-like `.png` masks:
  ```bash
  datum project import --format voc --input-path <path/to/voc/dataset>

  # Create a color map file with desired colors:
  #
  # label : color_rgb : parts : actions
  # cat:0,0,255::
  # dog:255,0,0::
  #
  # Save as mycolormap.txt

  datum project export --format voc_segmentation -- --label-map mycolormap.txt
  # add "--apply-colormap=0" to save grayscale (indexed) masks
  # check "--help" option for more info
  # use "datum --loglevel debug" for extra conversion info
  ```

<!--lint enable list-item-bullet-indent-->
<!--lint enable list-item-indent-->

## Contributing

Feel free to [open an Issue](https://github.com/opencv/cvat/issues/new) if you
think something needs to be changed. You are welcome to participate in development,
development instructions are available in our [developer manual](CONTRIBUTING.md).
