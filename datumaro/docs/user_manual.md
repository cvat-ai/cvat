# Quick start guide

## Contents

- [Installation](#installation)
- [Interfaces](#interfaces)
- [Supported dataset formats and annotations](#formats-support)
- [Command line workflow](#command-line-workflow)
  - [Create a project](#create-project)
  - [Add and remove data](#add-and-remove-data)
  - [Import a project](#import-project)
  - [Extract a subproject](#extract-subproject)
  - [Merge projects](#merge-project)
  - [Export a project](#export-project)
  - [Compare projects](#compare-projects)
  - [Get project info](#get-project-info)
  - [Register a model](#register-model)
  - [Run inference](#run-inference)
  - [Run inference explanation](#explain-inference)
- [Links](#links)

## Installation

### Prerequisites

- Python (3.5+)
- OpenVINO (optional)

### Installation steps

Optionally, set up a virtual environment:

``` bash
python -m pip install virtualenv
python -m virtualenv venv
. venv/bin/activate
```

Install Datumaro:
``` bash
pip install 'git+https://github.com/opencv/cvat#egg=datumaro&subdirectory=datumaro'
```

> You can change the installation branch with `.../cvat@<branch_name>#egg...`
> Also note `--force-reinstall` parameter in this case.

## Interfaces

As a standalone tool:

``` bash
datum --help
```

As a python module:
> The directory containing Datumaro should be in the `PYTHONPATH`
> environment variable or `cvat/datumaro/` should be the current directory.

``` bash
python -m datumaro --help
python datumaro/ --help
python datum.py --help
```

As a python library:

``` python
import datumaro
```

## Formats support

List of supported formats:
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
  - [Format specification](https://github.com/opencv/cvat/blob/develop/cvat/apps/documentation/xml_format.md)

List of supported annotation types:
- Labels
- Bounding boxes
- Polygons
- Polylines
- (Key-)Points
- Captions
- Masks

## Command line workflow

> **Note**: command invocation syntax is subject to change,
> **always refer to command --help output**

The key object is the Project. The Project is a combination of
a Project's own dataset, a number of external data sources and an environment.
An empty Project can be created by `project create` command,
an existing dataset can be imported with `project import` command.
A typical way to obtain projects is to export tasks in CVAT UI.

Available CLI commands:
![CLI design doc](images/cli_design.png)

If you want to interact with models, you need to add them to project first.

### Import project

This command creates a Project from an existing dataset.

Supported formats are listed in the command help.
In Datumaro dataset formats are supported by Extractors and Importers.
An Extractor produces a list of dataset items corresponding
to the dataset. An Importer creates a Project from the
data source location. It is possible to add a custom Extractor and Importer.
To do this, you need to put an Extractor and Importer implementation scripts to
`<project_dir>/.datumaro/extractors` and `<project_dir>/.datumaro/importers`.

Usage:

``` bash
datum project import --help

datum project import \
     -i <dataset_path> \
     -o <project_dir> \
     -f <format>
```

Example: create a project from COCO-like dataset

``` bash
datum project import \
     -i /home/coco_dir \
     -o /home/project_dir \
     -f coco
```

An _MS COCO_-like dataset should have the following directory structure:

<!--lint disable fenced-code-flag-->
```
COCO/
├── annotations/
│   ├── instances_val2017.json
│   ├── instances_train2017.json
├── images/
│   ├── val2017
│   ├── train2017
```
<!--lint enable fenced-code-flag-->

Everything after the last `_` is considered a subset name in the COCO format.

### Create project

The command creates an empty project. Once a Project is created, there are
a few options to interact with it.

Usage:

``` bash
datum project create --help

datum project create \
  -o <project_dir>
```

Example: create an empty project `my_dataset`

``` bash
datum project create -o my_dataset/
```

### Add and remove data

A Project can be attached to a number of external Data Sources. Each Source
describes a way to produce dataset items. A Project combines dataset items from
all the sources and its own dataset into one composite dataset. You can manage
project sources by commands in the `source` command line context.

Datasets come in a wide variety of formats. Each dataset
format defines its own data structure and rules on how to
interpret the data. For example, the following data structure
is used in COCO format:
<!--lint disable fenced-code-flag-->
```
/dataset/
- /images/<id>.jpg
- /annotations/
```
<!--lint enable fenced-code-flag-->

In Datumaro dataset formats are supported by Extractors.
An Extractor produces a list of dataset items corresponding
to the dataset. It is possible to add a custom Extractor.
To do this, you need to put an Extractor
definition script to `<project_dir>/.datumaro/extractors`.

Usage:

``` bash
datum source add --help
datum source remove --help

datum source add \
     path <path> \
     -p <project dir> \
     -n <name>

datum source remove \
     -p <project dir> \
     -n <name>
```

Example: create a project from a bunch of different annotations and images,
and generate TFrecord for TF Detection API for model training

``` bash
datum project create
# 'default' is the name of the subset below
datum source add path <path/to/coco/instances_default.json> -f coco_instances
datum source add path <path/to/cvat/default.xml> -f cvat
datum source add path <path/to/voc> -f voc_detection
datum source add path <path/to/datumaro/default.json> -f datumaro
datum source add path <path/to/images/dir> -f image_dir
datum project export -f tf_detection_api
```

### Extract subproject

This command allows to create a sub-Project from a Project. The new project
includes only items satisfying some condition. [XPath](https://devhints.io/xpath)
is used as query format.

There are several filtering modes available ('-m/--mode' parameter).
Supported modes:
- 'i', 'items'
- 'a', 'annotations'
- 'i+a', 'a+i', 'items+annotations', 'annotations+items'

When filtering annotations, use the 'items+annotations'
mode to point that annotation-less dataset items should be
removed. To select an annotation, write an XPath that
returns 'annotation' elements (see examples).

Usage:

``` bash
datum project extract --help

datum project extract \
     -p <project dir> \
     -o <output dir> \
     -e '<xpath filter expression>'
```

Example: extract a dataset with only images which width < height

``` bash
datum project extract \
     -p test_project \
     -o test_project-extract \
     -e '/item[image/width < image/height]'
```

Example: extract a dataset with only large annotations of class `cat` and any non-`persons`

``` bash
datum project extract \
     -p test_project \
     -o test_project-extract \
     --mode annotations -e '/item/annotation[(label="cat" and area > 999.5) or label!="person"]'
```

Example: extract a dataset with only occluded annotations, remove empty images

``` bash
datum project extract \
     -p test_project \
     -o test_project-extract \
     -m i+a -e '/item/annotation[occluded="True"]'
```

Item representations are available with `--dry-run` parameter:

``` xml
<item>
  <id>290768</id>
  <subset>minival2014</subset>
  <image>
    <width>612</width>
    <height>612</height>
    <depth>3</depth>
  </image>
  <annotation>
    <id>80154</id>
    <type>bbox</type>
    <label_id>39</label_id>
    <x>264.59</x>
    <y>150.25</y>
    <w>11.199999999999989</w>
    <h>42.31</h>
    <area>473.87199999999956</area>
  </annotation>
  <annotation>
    <id>669839</id>
    <type>bbox</type>
    <label_id>41</label_id>
    <x>163.58</x>
    <y>191.75</y>
    <w>76.98999999999998</w>
    <h>73.63</h>
    <area>5668.773699999998</area>
  </annotation>
  ...
</item>
```

### Merge projects

This command combines multiple Projects into one.

Usage:

``` bash
datum project merge --help

datum project merge \
     -p <project dir> \
     -o <output dir> \
     <other project dir>
```

Example: update annotations in the `first_project` with annotations
from the `second_project` and save the result as `merged_project`

``` bash
datum project merge \
     -p first_project \
     -o merged_project \
     second_project
```

### Export project

This command exports a Project in some format.

Supported formats are listed in the command help.
In Datumaro dataset formats are supported by Converters.
A Converter produces a dataset of a specific format
from dataset items. It is possible to add a custom Converter.
To do this, you need to put a Converter
definition script to <project_dir>/.datumaro/converters.

Usage:

``` bash
datum project export --help

datum project export \
     -p <project dir> \
     -o <output dir> \
     -f <format> \
     [-- <additional format parameters>]
```

Example: save project as VOC-like dataset, include images

``` bash
datum project export \
     -p test_project \
     -o test_project-export \
     -f voc \
     -- --save-images
```

### Get project info

This command outputs project status information.

Usage:

``` bash
datum project info --help

datum project info \
     -p <project dir>
```

Example:

``` bash
datum project info -p /test_project

Project:
  name: test_project2
  location: /test_project
Sources:
  source 'instances_minival2014':
    format: coco_instances
    url: /coco_like/annotations/instances_minival2014.json
Dataset:
  length: 5000
  categories: label
    label:
      count: 80
      labels: person, bicycle, car, motorcycle (and 76 more)
  subsets: minival2014
    subset 'minival2014':
      length: 5000
      categories: label
        label:
          count: 80
          labels: person, bicycle, car, motorcycle (and 76 more)
```

### Register model

Supported models:
- OpenVINO
- Custom models via custom `launchers`

Usage:

``` bash
datum model add --help
```

Example: register an OpenVINO model

A model consists of a graph description and weights. There is also a script
used to convert model outputs to internal data structures.

``` bash
datum project create
datum model add \
     -n <model_name> openvino \
     -d <path_to_xml> -w <path_to_bin> -i <path_to_interpretation_script>
```

Interpretation script for an OpenVINO detection model (`convert.py`):

``` python
from datumaro.components.extractor import *

max_det = 10
conf_thresh = 0.1

def process_outputs(inputs, outputs):
     # inputs = model input, array or images, shape = (N, C, H, W)
     # outputs = model output, shape = (N, 1, K, 7)
     # results = conversion result, [ [ Annotation, ... ], ... ]
     results = []
     for input, output in zip(inputs, outputs):
          input_height, input_width = input.shape[:2]
          detections = output[0]
          image_results = []
          for i, det in enumerate(detections):
               label = int(det[1])
               conf = det[2]
               if conf <= conf_thresh:
                    continue

               x = max(int(det[3] * input_width), 0)
               y = max(int(det[4] * input_height), 0)
               w = min(int(det[5] * input_width - x), input_width)
               h = min(int(det[6] * input_height - y), input_height)
               image_results.append(Bbox(x, y, w, h,
                    label=label, attributes={'score': conf} ))

               results.append(image_results[:max_det])

     return results

def get_categories():
     # Optionally, provide output categories - label map etc.
     # Example:
     label_categories = LabelCategories()
     label_categories.add('person')
     label_categories.add('car')
     return { AnnotationType.label: label_categories }
```

### Run model

This command applies model to dataset images and produces a new project.

Usage:

``` bash
datum model run --help

datum model run \
     -p <project dir> \
     -m <model_name> \
     -o <save_dir>
```

Example: launch inference on a dataset

``` bash
datum project import <...>
datum model add mymodel <...>
datum model run -m mymodel -o inference
```

### Compare projects

The command compares two datasets and saves the results in the
specified directory. The current project is considered to be
"ground truth".

``` bash
datum project diff --help

datum project diff <other_project_dir> -o <save_dir>
```

Example: compare a dataset with model inference

``` bash
datum project import <...>
datum model add mymodel <...>
datum project transform <...> -o inference
datum project diff inference -o diff
```

### Explain inference

Usage:

``` bash
datum explain --help

datum explain \
     -m <model_name> \
     -o <save_dir> \
     -t <target> \
     <method> \
     <method_params>
```

Example: run inference explanation on a single image with visualization

``` bash
datum project create <...>
datum model add mymodel <...>
datum explain \
     -m mymodel \
     -t 'image.png' \
     rise \
     -s 1000 --progressive
```

## Links
- [TensorFlow detection model zoo](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/detection_model_zoo.md)
- [How to convert model to OpenVINO format](https://docs.openvinotoolkit.org/latest/_docs_MO_DG_prepare_model_convert_model_tf_specific_Convert_Object_Detection_API_Models.html)
- [Model conversion script example](https://github.com/opencv/cvat/blob/3e09503ba6c6daa6469a6c4d275a5a8b168dfa2c/components/tf_annotation/install.sh#L23)
