---
title: 'Auto-annotation API'
linkTitle: 'Auto-annotation API'
weight: 6
---

## Overview

This layer provides functionality that allows you to automatically annotate a CVAT dataset
by running a custom function on your local machine.
A function, in this context, is a Python object that implements a particular protocol
defined by this layer.
To avoid confusion with Python functions,
auto-annotation functions will be referred to as "AA functions" in the following text.
A typical AA function will be based on a machine learning model
and consist of the following basic elements:

- Code to load the ML model.

- A specification describing the annotations that the AA function can produce.

- Code to convert data from CVAT to a format the ML model can understand.

- Code to run the ML model.

- Code to convert resulting annotations to a format CVAT can understand.

The layer can be divided into several parts:

- The interface, containing the protocol that an AA function must implement.

- The driver, containing functionality to annotate a CVAT dataset using an AA function.

- The predefined AA function based on Ultralytics YOLOv8n.

The `auto-annotate` CLI command provides a way to use an AA function from the command line
rather than from a Python program.
See {{< ilink "/docs/api_sdk/cli" "the CLI documentation" >}} for details.

## Example

```python
from typing import List
import PIL.Image

import torchvision.models

from cvat_sdk import make_client
import cvat_sdk.models as models
import cvat_sdk.auto_annotation as cvataa

class TorchvisionDetectionFunction:
    def __init__(self, model_name: str, weights_name: str, **kwargs) -> None:
        # load the ML model
        weights_enum = torchvision.models.get_model_weights(model_name)
        self._weights = weights_enum[weights_name]
        self._transforms = self._weights.transforms()
        self._model = torchvision.models.get_model(model_name, weights=self._weights, **kwargs)
        self._model.eval()

    @property
    def spec(self) -> cvataa.DetectionFunctionSpec:
        # describe the annotations
        return cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.label_spec(cat, i)
                for i, cat in enumerate(self._weights.meta['categories'])
            ]
        )

    def detect(self, context, image: PIL.Image.Image) -> List[models.LabeledShapeRequest]:
        # convert the input into a form the model can understand
        transformed_image = [self._transforms(image)]

        # run the ML model
        results = self._model(transformed_image)

        # convert the results into a form CVAT can understand
        return [
            cvataa.rectangle(label.item(), [x.item() for x in box])
            for result in results
            for box, label in zip(result['boxes'], result['labels'])
        ]

# log into the CVAT server
with make_client(host="localhost", credentials=("user", "password")) as client:
    # annotate task 12345 using Faster R-CNN
    cvataa.annotate_task(client, 41617,
        TorchvisionDetectionFunction("fasterrcnn_resnet50_fpn_v2", "DEFAULT", box_score_thresh=0.5),
    )
```

## Auto-annotation interface

Currently, the only type of AA function supported by this layer is the detection function.
Therefore, all of the following information will pertain to detection functions.

A detection function accepts an image and returns a list of shapes found in that image.
When it is applied to a dataset, the AA function is run for every image,
and the resulting lists of shapes are combined and uploaded to CVAT.

A detection function must have two attributes, `spec` and `detect`.

`spec` must contain the AA function's specification,
which is an instance of `DetectionFunctionSpec`.

`DetectionFunctionSpec` must be initialized with a sequence of `PatchedLabelRequest` objects
that represent the labels that the AA function knows about.
See the docstring of `DetectionFunctionSpec` for more information on the constraints
that these objects must follow.

`detect` must be a function/method accepting two parameters:

- `context` (`DetectionFunctionContext`).
  Contains information about the current image.
  Currently `DetectionFunctionContext` only contains a single field, `frame_name`,
  which contains the file name of the frame on the CVAT server.

- `image` (`PIL.Image.Image`).
  Contains image data.

`detect` must return a list of `LabeledShapeRequest` objects,
representing shapes found in the image.
See the docstring of `DetectionFunctionSpec` for more information on the constraints
that these objects must follow.

The same AA function may be used with any dataset that contain labels with the same name
as the AA function's specification.
The way it works is that the driver matches labels between the spec and the dataset,
and replaces the label IDs in the shape objects with those defined in the dataset.

For example, suppose the AA function's spec defines the following labels:

| Name  | ID |
|-------|----|
| `bat` |  0 |
| `rat` |  1 |

And the dataset defines the following labels:

| Name  | ID  |
|-------|-----|
| `bat` | 100 |
| `cat` | 101 |
| `rat` | 102 |

Then suppose `detect` returns a shape with `label_id` equal to 1.
The driver will see that it refers to the `rat` label, and replace it with 102,
since that's the ID this label has in the dataset.

The same logic is used for sub-label IDs.

### Helper factory functions

The CVAT API model types used in the AA function protocol are somewhat unwieldy to work with,
so it's recommented to use the helper factory functions provided by this layer.
These helpers instantiate an object of their corresponding model type,
passing their arguments to the model constructor
and sometimes setting some attributes to fixed values.

The following helpers are available for building specifications:

| Name                  | Model type            | Fixed attributes  |
|-----------------------|-----------------------|-------------------|
| `label_spec`          | `PatchedLabelRequest` | -                 |
| `skeleton_label_spec` | `PatchedLabelRequest` | `type="skeleton"` |
| `keypoint_spec`       | `SublabelRequest`     | -                 |

The following helpers are available for use in `detect`:

| Name        | Model type               | Fixed attributes              |
|-------------|--------------------------|-------------------------------|
| `shape`     | `LabeledShapeRequest`    | `frame=0`                     |
| `rectangle` | `LabeledShapeRequest`    | `frame=0`, `type="rectangle"` |
| `skeleton`  | `LabeledShapeRequest`    | `frame=0`, `type="skeleton"`  |
| `keypoint`  | `SubLabeledShapeRequest` | `frame=0`, `type="points"`    |

## Auto-annotation driver

The `annotate_task` function uses an AA function to annotate a CVAT task.
It must be called as follows:

```python
annotate_task(<client>, <task ID>, <AA function>, <optional arguments...>)
```

The supplied client will be used to make all API calls.

By default, new annotations will be appended to the old ones.
Use `clear_existing=True` to remove old annotations instead.

If a detection function declares a label that has no matching label in the task,
then by default, `BadFunctionError` is raised, and auto-annotation is aborted.
If you use `allow_unmatched_label=True`, then such labels will be ignored,
and any shapes referring to them will be dropped.
Same logic applies to sub-label IDs.

`annotate_task` will raise a `BadFunctionError` exception
if it detects that the function violated the AA function protocol.

## Predefined AA functions

This layer includes several predefined AA functions.
You can use them as-is, or as a base on which to build your own.

Each function is implemented as a module
to allow usage via the CLI `auto-annotate` command.
Therefore, in order to use it from the SDK,
you'll need to import the corresponding module.

### `cvat_sdk.auto_annotation.functions.torchvision_detection`

This AA function uses object detection models from
the [torchvision](https://pytorch.org/vision/stable/index.html) library.
It produces rectangle annotations.

To use it, install CVAT SDK with the `pytorch` extra:

```
$ pip install "cvat-sdk[pytorch]"
```

Usage from Python:

```python
from cvat_sdk.auto_annotation.functions.torchvision_detection import create as create_torchvision
annotate_task(<client>, <task ID>, create_torchvision(<model name>, ...))
```

Usage from the CLI:

```bash
cvat-cli auto-annotate "<task ID>" --function-module cvat_sdk.auto_annotation.functions.torchvision_detection \
      -p model_name=str:"<model name>" ...
```

The `create` function accepts the following parameters:

- `model_name` (`str`) - the name of the model, such as `fasterrcnn_resnet50_fpn_v2`.
  This parameter is required.
- `weights_name` (`str`) - the name of a weights enum value for the model, such as `COCO_V1`.
  Defaults to `DEFAULT`.

It also accepts arbitrary additional parameters,
which are passed directly to the model constructor.

### `cvat_sdk.auto_annotation.functions.torchvision_keypoint_detection`

This AA function is analogous to `torchvision_detection`,
except it uses torchvision's keypoint detection models and produces skeleton annotations.
Keypoints which the model marks as invisible will be marked as occluded in CVAT.

Refer to the previous section for usage instructions and parameter information.
