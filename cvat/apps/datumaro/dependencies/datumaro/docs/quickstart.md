# Quick start guide

## Installation

### Prerequisites

- Python (3.5+)
- OpenVINO (optional)

### Installation steps

Download the project to any directory.

Set up a virtual environment:

``` bash
python -m pip install virtualenv
python -m virtualenv venv
. venv/bin/activate
while read -r p; do pip install $p; done < requirements.txt
```

## Usage

The directory containing the project should be in the
`PYTHONPATH` environment variable. The other way is to invoke
commands from that directory.

As a python module:

``` bash
python -m datumaro --help
```

As a standalone python script:

``` bash
python datum.py --help
```

As a python library:

``` python
import datumaro
```

## Workflow

> **Note**: command invocation **syntax is subject to change, refer to --help output**

The key object is the project. It can be created or imported with
`project create` and `project import` commands. The project is a combination of
dataset and environment.

If you want to interact with models, you should add them to project first.

Implemented commands ([CLI design doc](images/cli_design.png)):
- project create
- project import
- project diff
- project transform
- source add
- explain

### Create a project

Usage:

``` bash
python datum.py project create --help

python datum.py project create \
     -d <project_dir>
```

Example:

``` bash
python datum.py project create -d /home/my_dataset
```

### Import a project

This command creates a project from an existing dataset. Supported formats:
- MS COCO
- Custom formats via custom `importers` and `extractors`

Usage:

``` bash
python -m datumaro project import --help

python -m datumaro project import \
     <dataset_path> \
     -d <project_dir> \
     -t <format>
```

Example:

``` bash
python -m datumaro project import \
     /home/coco_dir \
     -d /home/project_dir \
     -t ms_coco
```

An *MS COCO*-like dataset should have the following directory structure:

```
COCO/
├── annotations/
│   ├── instances_val2017.json
│   ├── instances_train2017.json
├── images/
│   ├── val2017
│   ├── train2017
```

Everything after the last `_` is considered as a subset name.

### Register a model

Supported models:
- OpenVINO
- Custom models via custom `launchers`

Usage:

``` bash
python -m datumaro model add --help
```

Example: register OpenVINO model

A model consists of a graph description and weights. There is also a script
used to convert model outputs to internal data structures.

``` bash
python -m datumaro model add \
     <model_name> openvino \
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
               image_results.append(BboxObject(x, y, w, h,
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

### Run a model inference

This command сreates a new project from the current project. The new
one annotations are the model outputs.

Usage:

``` bash
python -m datumaro project transform --help

python -m datumaro project transform \
     -m <model_name> \
     -d <save_dir>
```

Example:

``` bash
python -m datumaro project import <...>
python -m datumaro model add mymodel <...>
python -m datumaro project transform -m mymodel -d ../mymodel_inference
```

### Compare datasets

The command compares two datasets and saves the results in the
specified directory. The current project is considered to be
"ground truth".

``` bash
python -m datumaro project diff --help

python -m datumaro project diff <other_project_dir> -d <save_dir>
```

Example: compare a dataset with model inference

``` bash
python -m datumaro project import <...>
python -m datumaro model add mymodel <...>
python -m datumaro project transform <...> -d ../inference
python -m datumaro project diff ../inference -d ../diff
```

### Run inference explanation

Usage:

``` bash
python -m datumaro explain --help

python -m datumaro explain \
     -m <model_name> \
     -d <save_dir> \
     -t <target> \
     <method> \
     <method_params>
```

Example: run inference explanation on a single image with visualization

``` bash
python -m datumaro project create <...>
python -m datumaro model add mymodel <...>
python -m datumaro explain \
     -m mymodel \
     -t 'image.png' \
     rise \
     -s 1000 --progressive
```

### Extract data subset based on filter

This command allows to create a subprject form a project, which
would include only items satisfying some condition. XPath is used as a query
format.

Usage:

``` bash
python -m datumaro project extract --help

python -m datumaro project extract \
     -p <source_project> \
     -d <destinatin dir> \
     -f '<filter expression>'
```

Example:

``` bash
python -m datumaro project extract \
     -p ../test_project \
     -d ../test_project-extract \
     -f '/item[image/width < image/height]'
```

Item representation:

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


## Links
 - [TensorFlow detection model zoo](https://github.com/tensorflow/models/blob/master/research/object_detection/g3doc/detection_model_zoo.md)
 - [How to convert model to OpenVINO format](https://docs.openvinotoolkit.org/latest/_docs_MO_DG_prepare_model_convert_model_tf_specific_Convert_Object_Detection_API_Models.html)
 - [Model convert script for this model](https://github.com/opencv/cvat/blob/3e09503ba6c6daa6469a6c4d275a5a8b168dfa2c/components/tf_annotation/install.sh#L23)
