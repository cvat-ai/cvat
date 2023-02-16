---
title: 'PyTorch adapter'
linkTitle: 'PyTorch adapter'
weight: 5
---

## Overview

This layer provides functionality
that enables you to treat CVAT projects and tasks as PyTorch datasets.

The code of this layer is located in the `cvat_sdk.pytorch` package.
To use it, you must install the `cvat_sdk` distribution with the `pytorch` extra.

## Example

```python
import torch
import torchvision.models

from cvat_sdk import make_client
from cvat_sdk.pytorch import ProjectVisionDataset, ExtractSingleLabelIndex

# create a PyTorch model
model = torchvision.models.resnet34(
    weights=torchvision.models.ResNet34_Weights.IMAGENET1K_V1)
model.eval()

# log into the CVAT server
with make_client(host="localhost", credentials=('user', 'password')) as client:
    # get the dataset comprising all tasks for the Validation subset of project 12345
    dataset = ProjectVisionDataset(client, project_id=12345,
        include_subsets=['Validation'],
        # use transforms that fit our neural network
        transform=torchvision.models.ResNet34_Weights.IMAGENET1K_V1.transforms(),
        target_transform=ExtractSingleLabelIndex())

    # print the number of images in the dataset (in other words, the number of frames
    # in the included tasks)
    print(len(dataset))

    # get a sample from the dataset
    image, target = dataset[0]

    # evaluate the network on the sample and compare the output to the target
    output = model(image)
    if torch.equal(output, target):
        print("correct prediction")
    else:
        print("incorrect prediction")
```

## Datasets

The key components of this layer are the dataset classes,
`ProjectVisionDataset` and `TaskVisionDataset`,
representing data & annotations contained in a CVAT project or task, respectively.
Both of them are subclasses of the [`torch.utils.data.Dataset`][Dataset] abstract class.

[Dataset]: https://pytorch.org/docs/stable/data.html#torch.utils.data.Dataset

The interface of `Dataset` is essentially that of a sequence
whose elements are samples from the dataset.
In the case of `TaskVisionDataset`, each sample represents a frame from the task
and its associated annotations.
The order of the samples is the same as the order of frames in the task.
Deleted frames are omitted.

In the case of `ProjectVisionDataset`,
each sample is a sample from one of the project's tasks,
as if obtained from a `TaskVisionDataset` instance created for that task.
The full sequence of samples is built by concatenating the sequences of samples
from all included tasks in an unspecified order
that is guaranteed to be consistent between executions.
For details on what tasks are included, see [Task filtering](#task-filtering).

### Construction

Both dataset classes are instantiated by passing in an instance of `cvat_sdk.Client`
and the ID of the project or task:

```python
dataset = ProjectVisionDataset(client, 123)
dataset = TaskVisionDataset(client, 456)
```

The referenced project or task must contain image data.
Video data is currently not supported.

The constructors of these classes also support several keyword-only parameters:

- `transforms`, `transform`, `target_transform`:
    see [Transform support](#transform-support).

- `label_name_to_index`:
    see [Label index assignment](#label-index-assignment).

- `task_filter`, `include_subsets` (`ProjectVisionDataset` only):
    see [Task filtering](#task-filtering).

- `update_policy`:
    see [Caching](#caching).

During construction,
the dataset objects either populate or validate the local data cache
(see [Caching](#caching) for details).
Any necessary requests to the CVAT server are performed at this time.
After construction, the objects make no more network requests.

### Sample format

Indexing a dataset produces a sample.
A sample has the form of a tuple with the following components:

- `sample[0]` ([`PIL.Image.Image`][Image]): the image.
- `sample[1]` (`cvat_sdk.pytorch.Target`): the annotations and auxiliary data.

[Image]: https://pillow.readthedocs.io/en/stable/reference/Image.html#PIL.Image.Image

The target object contains the following attributes:

- `target.annotations.tags` (`list[cvat_sdk.models.LabeledImage]`):
    tag annotations associated with the current frame.
- `target.annotations.shapes` (`list[cvat_sdk.models.LabeledShape]`):
    shape annotations associated with the current frame.
- `target.label_id_to_index` (`Mapping[int, int]`):
    see [Label index assignment](#label-index-assignment).

Note that track annotations are currently inaccessible.

### Transform support

The dataset classes support torchvision-like transforms
that you can supply to preprocess each sample before it's returned.
You can use this to convert the samples to a more convenient format
or to preprocess the data.
The transforms are supplied via the following constructor parameters:

- `transforms`: a callable that accepts two arguments (the image and the target)
    and returns a tuple with two elements.
- `transform`: a callable that accepts an image.
- `target_transform`: a callable that accepts a target.

Let the sample value prior to any transformations be `(image, target)`.
Here is what indexing the dataset will return for various combinations of
supplied transforms:

- `transforms`: `transforms(image, target)`.
- `transform`: `(transform(image), target)`.
- `target_transform`: `(image, target_transform(target))`.
- `transform` and `target_transform`:
    `(transform(image), target_transform(target))`.

`transforms` cannot be supplied at the same time
as either `transform` or `target_transform`.

The `cvat_sdk.pytorch` module contains some target transform classes
that are intended for common use cases.
See [Transforms](#transforms).

### Label index assignment

The annotation model classes (`LabeledImage` and `LabeledShape`)
reference labels by their IDs on the CVAT server.
This is usually not very useful for machine learning code,
since those IDs are unpredictable and will be different between different projects,
even if semantically the set of labels is the same.

Therefore, the dataset classes assign to each label a unique index that
is intended to be a project-independent identifier.
These indices are accessible via the `label_id_to_index` attribute
on each sample's target.
This attribute maps IDs on the server to the assigned index.
The mapping is the same for every sample.

By default, the dataset classes arrange all label IDs in an unspecified order
that remains consistent across executions,
and assign them sequential indices, starting with 0.

You can override this behavior and specify your own label indices
with the `label_name_to_index` constructor parameter.
This parameter accepts a mapping from label name to index.
The mapping must contain a key for each label in the project/task.
When this parameter is specified, label indices are assigned
by looking up each label's name in the provided mapping and using the result.

### Task filtering

Note: this section applies only to `ProjectVisionDataset`.

By default, a `ProjectVisionDataset` includes samples
from every task belonging to the project.
You can change this using the following constructor parameters:

- `task_filter` (`Callable[[models.ITaskRead], bool]`):
    if set, the callable will be called for every task,
    with an instance of `ITaskRead` corresponding to that task
    passed as the argument.
    Only tasks for which `True` is returned will be included.

- `include_subsets` (`Container[str]`):
    if set, only tasks whose subset is a member of the container
    will be included.

Both parameters can be set,
in which case tasks must fulfull both criteria to be included.

### Caching

The images and annotations of a dataset can be substantial in size,
so they are not downloaded from the server every time a dataset object is created.
Instead, they are loaded from a cache on the local file system,
which is maintained during dataset object construction
according to the policy set by the `update_policy` constructor parameter.

The available policies are:

- `UpdatePolicy.IF_MISSING_OR_STALE`:
    If some data is already cached,
    query the server to determine if it is out of date.
    If so, discard it.
    Then, download all necessary data that is missing from the cache and cache it.

  This is the default policy.

- `UpdatePolicy.NEVER`:
    If some necessary data is missing from the cache,
    raise an exception.
    Don't make any network requests.

  Note that this policy permits the use of stale data.

By default, the cache is located in a platform-specific per-user directory.
You can change this location with the `cache_dir` setting in the `Client` configuration.

## Transforms

The layer provides some classes whose instances are callables
suitable for usage with the `target_transform` dataset constructor parameter
that are intended to simplify working with CVAT datasets in common scenarios.

### `ExtractBoundingBoxes`

Intended for object detection tasks.

Constructor parameters:

- `include_shape_types` (`Iterable[str]`).
  The values must be from the following list:

  - `"ellipse"`
  - `"points"`
  - `"polygon"`
  - `"polyline"`
  - `"rectangle"`

Effect: Gathers all shape annotations from the input target object
whose types are contained in the value of `include_shape_types`.
Then returns a dictionary with the following string keys
(where `N` is the number of gathered shapes):

- `"boxes"` (a floating-point tensor of shape `N`x`4`).
    Each row represents the bounding box the corresponding shape
    in the following format: `[x_min, y_min, x_max, y_max]`.

- `"labels"` (an integer tensor of shape `N`).
    Each element is the index of the label of the corresponding shape.

Example:

```python
ExtractBoundingBoxes(include_shape_types=['rectangle', 'ellipse'])
```

### `ExtractSingleLabelIndex`

Intended for image classification tasks.

Constructor parameters: None.

Effect: If the input target object contains no tag annotations
or more than one tag annotation, raises `ValueError`.
Otherwise, returns the index of the label in the solitary tag annotation
as a zero-dimensional tensor.

Example:

```python
ExtractSingleLabelIndex()
```
