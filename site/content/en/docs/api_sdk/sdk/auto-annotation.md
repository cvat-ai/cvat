---
title: 'Auto-annotation API'
linkTitle: 'Auto-annotation API'
weight: 6
---

## Overview

This layer provides functionality
that allows you to automate the process of annotating a CVAT dataset
by delegating this process (or parts of it) to a program running on a machine under your control.

To make use of this delegation, you must implement an "auto-annotation function",
or "AA function" for short.
This is a Python object that implements one of the protocols defined by this layer.
The particular protocol implemented defines
which part of the annotation process the AA function will be able to automate.

An AA function may be used in one of the following modes:

- Immediate mode.
  This involves annotating a specific CVAT task by passing the AA function to a driver,
  along with the identifier of the task and optional additional parameters.
  This may be done either:

  - programmatically (consult the "Auto-annotation driver" section (TODO)); or

  - via the CVAT CLI (consult the description of the `task auto-annotate` command
    in {{< ilink "/docs/api_sdk/cli" "the CLI documentation" >}}).

- Agent mode.
  This involves registering the AA function with the CVAT server
  (creating a resource on the server known as a "native function")
  and then running one or more agent processes.

  This makes the AA function usable from the CVAT UI.
  CVAT users can choose to use the native function as the model when using CVAT's AI tools.
  When they do, the agents detect this, and process their requests by calling appropriate
  methods on the corresponding AA function.

  Depending on how you create the native function, it'll be accessible to only you,
  or your organization.

  For more details, consult the descriptions of the `function create-native`
  and `function run-agent` commands in {{< ilink "/docs/api_sdk/cli" "the CLI documentation" >}}.

This SDK layer can be divided into several parts:

- The interface, containing the protocols that an AA function must implement,
  as well as helpers for use by such functions.
  Consult [Auto-annotation interface](#auto-annotation-interface).

- The driver, containing functionality to annotate a CVAT dataset using an AA function.
  Consult [Auto-annotation driver](#auto-annotation-driver).

- Predefined AA functions based on torchvision.
  Consult [Predefined AA functions](#predefined-aa-functions).

While not part of the SDK,
there are also additional predefined AA functions in the CVAT source repository.
Consult [Additional AA functions](#additional-aa-functions).

## Example

An AA function may be implemented in any way that is appropriate for your use case.
However, a typical AA function will be based on a machine learning model
and consist of the following basic elements:

- Code to load the ML model.

- A specification defining which protocol the AA function implements,
  as well as static properties of the AA function
  (such as a description of the annotations that the AA function can produce).

- Code to convert data from SDK data structures to a format the ML model can understand.

- Code to run the ML model.

- Code to convert resulting annotations to SDK data structures.

The following code snippet shows an example AA function implementation
(specifically, a detection function),
as well as code that creates an instance of the function and uses it for auto-annotation.

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
                cvataa.label_spec(cat, i, type="rectangle")
                for i, cat in enumerate(self._weights.meta["categories"])
                if cat != "N/A"
            ]
        )

    def detect(
        self, context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[models.LabeledShapeRequest]:
        # determine the threshold for filtering results
        conf_threshold = context.conf_threshold or 0

        # convert the input into a form the model can understand
        transformed_image = [self._transforms(image)]

        # run the ML model
        results = self._model(transformed_image)

        # convert the results into the form SDK requires
        return [
            cvataa.rectangle(label.item(), [x.item() for x in box])
            for result in results
            for box, label, score in zip(result["boxes"], result["labels"], result["scores"])
            if score >= conf_threshold
        ]

# log into the CVAT server
with make_client("http://localhost", credentials=("user", "password")) as client:
    # create a function that uses Faster R-CNN
    func = TorchvisionDetectionFunction("fasterrcnn_resnet50_fpn_v2", "DEFAULT", box_score_thresh=0.5)

    # annotate task 12345 using the function
    cvataa.annotate_task(client, 12345, func)
```

## Auto-annotation interface

This part of the auto-annotation layer defines the protocols that an AA function must implement.

### Detection function protocol

A detection function is a type of AA function
that accepts an image and returns a list of shapes found in that image.

A detection function can be used in the following ways:

- In immediate mode, the AA function is run for every image in a given CVAT task,
  and the resulting lists of shapes are combined and uploaded to CVAT.

- In agent mode, the AA function can be used from the CVAT UI to either annotate a complete task
  (similar to immediate mode) or a single frame in a task.

A detection function must have two attributes, `spec` and `detect`.

`spec` must contain the AA function's specification,
which is an instance of `DetectionFunctionSpec`.

`DetectionFunctionSpec` must be initialized with a sequence of `PatchedLabelRequest` objects
that represent the labels that the AA function knows about.
See the docstring of `DetectionFunctionSpec` for more information on the constraints
that these objects must follow.
`BadFunctionError` will be raised if any constraint violations are detected.

`detect` must be a function/method accepting two parameters:

- `context` (`DetectionFunctionContext`).
  Contains invocation parameters and information about the current image.
  The following fields are available:

  - `frame_name` (`str`). The file name of the frame on the CVAT server.
  - `conf_threshold` (`float | None`). The confidence threshold that the function
    should use to filter objects. If `None`, the function may apply a default
    threshold at its discretion.

- `image` (`PIL.Image.Image`).
  Contains image data.

`detect` must return a sequence of `LabeledImageRequest` and/or `LabeledShapeRequest` objects,
representing tags/shapes found in the image.
See the docstring of `DetectionFunctionSpec` for more information on the constraints
that these objects must follow.

The same AA function may be used with any dataset that contain labels with the same name
as the AA function's specification.
The way it works is that the driver matches labels between the spec and the dataset,
and replaces the label IDs in the tag & shape objects with those defined in the dataset.

For example, suppose the AA function's spec defines the following labels:

| Name  | ID |
| ----- | -- |
| `bat` | 0  |
| `rat` | 1  |

And the dataset defines the following labels:

| Name  | ID  |
| ----- | --- |
| `bat` | 100 |
| `cat` | 101 |
| `rat` | 102 |

Then suppose `detect` returns a shape with `label_id` equal to 1.
The driver will see that it refers to the `rat` label, and replace it with 102,
since that's the ID this label has in the dataset.

The same logic is used for sublabel and attribute IDs.

#### Helper factory functions

The CVAT API model types used in the detection function protocol are somewhat unwieldy to work with,
so it's recommended to use the helper factory functions provided by this layer.
These helpers instantiate an object of their corresponding model type,
passing their arguments to the model constructor
and sometimes setting some attributes to fixed values.

The following helpers are available for building specifications:

| Name                      | Model type            | Fixed attributes                                      |
| ------------------------- | --------------------- | ----------------------------------------------------- |
| `label_spec`              | `PatchedLabelRequest` | -                                                     |
| `skeleton_label_spec`     | `PatchedLabelRequest` | `type="skeleton"`                                     |
| `keypoint_spec`           | `SublabelRequest`     | `type="points"`                                       |
| `attribute_spec`          | `AttributeRequest`    | `mutable=False`                                       |
| `checkbox_attribute_spec` | `AttributeRequest`    | `mutable=False`, `input_type="checkbox"`, `values=[]` |
| `number_attribute_spec`   | `AttributeRequest`    | `mutable=False`, `input_type="number"`                |
| `radio_attribute_spec`    | `AttributeRequest`    | `mutable=False`, `input_type="radio"`                 |
| `select_attribute_spec`   | `AttributeRequest`    | `mutable=False`, `input_type="select"`                |
| `text_attribute_spec`     | `AttributeRequest`    | `mutable=False`, `input_type="number"`, `values=[]`   |

For `number_attribute_spec`,
it's recommended to use the `cvat_sdk.attributes.number_attribute_values` function
to create the `values` argument, since this function will enforce the constraints expected
for attribute specs of this type.
For example:

```python
cvataa.number_attribute_spec("size", 1, number_attribute_values(0, 10))
```

The following helpers are available for use in `detect`:

| Name        | Model type               | Fixed attributes              |
| ----------- | ------------------------ | ----------------------------- |
| `tag`       | `LabeledImageRequest`    | `frame=0`                     |
| `shape`     | `LabeledShapeRequest`    | `frame=0`                     |
| `mask`      | `LabeledShapeRequest`    | `frame=0`, `type="mask"`      |
| `polygon`   | `LabeledShapeRequest`    | `frame=0`, `type="polygon"`   |
| `rectangle` | `LabeledShapeRequest`    | `frame=0`, `type="rectangle"` |
| `skeleton`  | `LabeledShapeRequest`    | `frame=0`, `type="skeleton"`  |
| `keypoint`  | `SubLabeledShapeRequest` | `frame=0`, `type="points"`    |

For `mask`, it is recommended to create the points list using
the `cvat_sdk.masks.encode_mask` function, which will convert a bitmap into a
list in the format that CVAT expects. For example:

```python
cvataa.mask(my_label, encode_mask(
    my_mask,  # boolean 2D array, same size as the input image
    [x1, y1, x2, y2],  # top left and bottom right coordinates of the mask
))
```

To create shapes with attributes,
it's recommended to use the `cvat_sdk.attributes.attribute_vals_from_dict` function,
which returns a list of objects that can be passed to an `attributes` argument:

```python
cvataa.rectangle(
    my_label, [x1, y2, x2, y2],
    attributes=attribute_vals_from_dict({my_attr1: val1, my_attr2: val2})
)
```

### Tracking function protocol

A tracking function is a type of AA function that analyzes an image with one or more shapes on it,
and then predicts the positions of those shapes on subsequent images.

A tracking function can only be used in agent mode.
When used with a tracking function, an agent will use it
to process requests from the AI tracking tools in the CVAT UI.

{{% alert title="Warning" color="warning" %}}
Currently, only one agent should be run for each tracking function.
If multiple agents for one tracking function are run at the same time,
CVAT users may experience intermittent "Tracking state not found" errors when using the function.
{{% /alert %}}

A tracking function must have three attributes, `spec`, `init_tracking_state`, and `track`.
It may also optionally have a `preprocess_image` attribute.

`spec` must contain the AA function's specification,
which is an instance of `TrackingFunctionSpec`.
This specification must be initialized with a single `supported_shape_types` parameter,
defining which types of shapes the AA function is able to track.
For example:

```python
spec = cvataa.TrackingFunctionSpec(supported_shape_types=["rectangle"])
```

`init_tracking_state` must be a function accepting the following parameters:

- `context` (`TrackingFunctionShapeContext`).
  An object with information about the shape being tracked. See details below.

- `pp_image` (type varies).
  A preprocessed image.
  Consult the description of `preprocess_image` for more details.

- `shape` (`TrackableShape`).
  A shape within the preprocessed image.
  `TrackableShape` is a minimal version of the `LabeledShape` SDK model,
  containing only the `type` and `points` fields.
  The shape's `type` is guaranteed to be one of the types listed
  in the `supported_shape_types` field of the spec.

`init_tracking_state` must analyze the shape and create a state object containing
any information that the AA function will need to predict its location on a subsequent image.
It must then return this object.

`init_tracking_state` must not modify either `pp_image` or `shape`.

`track` must be a function accepting the following parameters:

- `context` (`TrackingFunctionShapeContext`).
  An object with information about the shape being tracked. See details below.

- `pp_image` (type varies).
  A preprocessed image.
  Consult the description of `preprocess_image` for more details.
  This image will have the same dimensions as those of the image used to create the `state` object.

- `state` (type varies).
  The object returned by a previous call to `init_tracking_state`.

`track` must locate the shape that was used to create the `state` object
on the new preprocessed image.
If it is able to do that, it must return its prediction as a new `TrackableShape` object.
This object must have the same value of `type` as the original shape.

If `track` is unable to locate the shape, it must return `None`.

`track` may modify `state` as needed to improve prediction accuracy on subsequent frames.
It must not modify `pp_image`.

A `TrackingFunctionShapeContext` object passed to both `init_tracking_state` and `track`
will have the following field:

- `original_shape_type` (`str`).
  The type of the shape being tracked.
  In `init_tracking_state`, this is the same as `shape.type`.
  In `track`, this is the type of the shape that `state` was created from.

`preprocess_image`, if implemented, must accept the following parameters:

- `context` (`TrackingFunctionContext`).
  This is currently a dummy object and should be ignored.
  In future versions, this may contain additional information.

- `image` (`PIL.Image.Image`).
  An image that will be used to either start or continue tracking.

`preprocess_image` must perform any analysis on the image that the function can perform
independently of the shapes being tracked
and return an object representing the results of that analysis.
This object will be passed as `pp_image` to `init_tracking_state` and `track`.

If `preprocess_image` is not implemented, then the `pp_image` object will be the original image.
In other words, the default implementation is:

```python
def preprocess_image(context, image):
    return image
```

## Auto-annotation driver

The `annotate_task` function uses a detection function to annotate a CVAT task.
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
Same logic applies to sublabels and attributes.

It's possible to pass a custom confidence threshold to the function via the
`conf_threshold` parameter.

`annotate_task` will raise a `BadFunctionError` exception
if it detects that the function violated the detection function protocol.

## Predefined AA functions

This layer includes several predefined detection functions.
You can use them as-is, or as a base on which to build your own.

These AA functions use models from the
the [torchvision](https://pytorch.org/vision/stable/index.html) library.
To use them, install CVAT SDK with the `pytorch` extra:

```
$ pip install "cvat-sdk[pytorch]"
```

Each function is implemented as a dedicated module
to allow usage via the CLI `auto-annotate` command.

Usage from Python:

```python
from cvat_sdk.auto_annotation.functions.torchvision_<task> import create as create_torchvision
annotate_task(<client>, <task ID>, create_torchvision(<model name>, ...))
```

Usage from the CLI:

```bash
cvat-cli auto-annotate "<task ID>" \
      --function-module "cvat_sdk.auto_annotation.functions.torchvision_<task>" \
      -p model_name=str:"<model name>" ...
```

The `create` function in each module accepts the following parameters:

- `model_name` (`str`) - the name of the model, such as `fasterrcnn_resnet50_fpn_v2`.
  This parameter is required.
- `weights_name` (`str`) - the name of a weights enum value for the model, such as `COCO_V1`.
  Defaults to `DEFAULT`.

It also accepts arbitrary additional parameters,
which are passed directly to the model constructor.

The following section describe each available function.

### `cvat_sdk.auto_annotation.function.torchvision_classification`

This AA function uses torchvision's classification models.
It produces tag annotations.
For each frame, the function will output one tag whose label has the highest probability,
as long as that probability is greater or equal to the input confidence threshold.
If it is lower, the function will output nothing.

### `cvat_sdk.auto_annotation.functions.torchvision_detection`

This AA function uses torchvision's object detection models.
It produces rectangle annotations.

### `cvat_sdk.auto_annotation.functions.torchvision_instance_segmentation`

This AA function uses torchvision's instance segmentation models.
It produces mask or polygon annotations (depending on the value of `conv_mask_to_poly`).

### `cvat_sdk.auto_annotation.functions.torchvision_keypoint_detection`

This AA function uses torchvision's keypoint detection models.
It produces skeleton annotations.
Keypoints which the model marks as invisible will be marked as occluded in CVAT.

## Additional AA functions

The CVAT source repository contains additional predefined auto-annotation functions
that are built on top of other computer vision libraries.

The following libraries and models are currently covered:

- Hugging Face Transformers: all models that are usable with the image classification,
  object detection and image segmentation pipelines.
- Segment Anything Model 2 (SAM2).
- Ultralytics: all numbered YOLO models (YOLOv3, YOLOv5, and so on).

See the [`ai-models` directory](https://github.com/cvat-ai/cvat/tree/develop/ai-models)
for usage information.
