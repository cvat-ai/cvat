# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import abc
from typing import List, Protocol, Sequence

import attrs
import PIL.Image

import cvat_sdk.models as models


@attrs.frozen(kw_only=True)
class DetectionFunctionSpec:
    """
    Static information about an auto-annotation detection function.
    """

    labels: Sequence[models.PatchedLabelRequest]
    """
    Information about labels that the function supports.

    The members of the sequence must follow the same constraints as if they were being
    used to create a CVAT project, and the following additional constraints:

    * The id attribute must be set to a distinct integer.

    * The id attribute of any sublabels must be set to an integer, distinct between all
      sublabels of the same parent label.

    * There must not be any attributes (attribute support may be added in a future version).

    It's recommented to use the helper factory functions (label_spec, skeleton_label_spec,
    keypoint_spec) to create the label objects, as they are more concise than the model
    constructors and help to follow some of the constraints.
    """


class DetectionFunctionContext(metaclass=abc.ABCMeta):
    """
    Information that is supplied to an auto-annotation detection function.
    """

    @property
    @abc.abstractmethod
    def frame_name(self) -> str:
        """
        The file name of the frame that the current image corresponds to in
        the dataset.
        """
        ...


class DetectionFunction(Protocol):
    """
    The interface that an auto-annotation detection function must implement.

    A detection function is supposed to accept an image and return a list of shapes
    describing objects in that image.

    Since the same function could be used with multiple datasets, it needs some way
    to refer to labels without using dataset-specific label IDs. The way this is
    accomplished is that the function declares its own labels via the spec attribute,
    and then refers to those labels in the returned annotations. The caller then matches
    up the labels from the function's spec with the labels in the actual dataset, and
    replaces the label IDs in the returned annotations with IDs of the corresponding
    labels in the dataset.

    The matching of labels between the function and the dataset is done by name.
    Therefore, a function can be used with a dataset if they have (at least some) labels
    that have the same name.
    """

    @property
    def spec(self) -> DetectionFunctionSpec:
        """Returns the function's spec."""
        ...

    def detect(
        self, context: DetectionFunctionContext, image: PIL.Image.Image
    ) -> List[models.LabeledShapeRequest]:
        """
        Detects objects on the supplied image and returns the results.

        The supplied context will contain information about the current image.

        The returned LabeledShapeRequest objects must follow general constraints
        imposed by the data model (such as the number of points in a shape),
        as well as the following additional constraints:

        * The id attribute must not be set.

        * The source attribute must not be set.

        * The frame_id attribute must be set to 0.

        * The label_id attribute must equal one of the label IDs
          in the function spec.

        * There must not be any attributes (attribute support may be added in a
          future version).

        * The above constraints also apply to each sub-shape (element of a shape),
          except that the label_id of a sub-shape must equal one of the sublabel IDs
          of the label of its parent shape.

        It's recommented to use the helper factory functions (shape, rectangle, skeleton,
        keypoint) to create the shape objects, as they are more concise than the model
        constructors and help to follow some of the constraints.

        The function must not retain any references to the returned objects,
        so that the caller may freely modify them.
        """
        ...


# spec factories


# pylint: disable-next=redefined-builtin
def label_spec(name: str, id: int, **kwargs) -> models.PatchedLabelRequest:
    """Helper factory function for PatchedLabelRequest."""
    return models.PatchedLabelRequest(name=name, id=id, **kwargs)


# pylint: disable-next=redefined-builtin
def skeleton_label_spec(
    name: str, id: int, sublabels: Sequence[models.SublabelRequest], **kwargs
) -> models.PatchedLabelRequest:
    """Helper factory function for PatchedLabelRequest with type="skeleton"."""
    return models.PatchedLabelRequest(name=name, id=id, type="skeleton", sublabels=sublabels)


# pylint: disable-next=redefined-builtin
def keypoint_spec(name: str, id: int, **kwargs) -> models.SublabelRequest:
    """Helper factory function for SublabelRequest."""
    return models.SublabelRequest(name=name, id=id, **kwargs)


# annotation factories


def shape(label_id: int, **kwargs) -> models.LabeledShapeRequest:
    """Helper factory function for LabeledShapeRequest with frame=0."""
    return models.LabeledShapeRequest(label_id=label_id, frame=0, **kwargs)


def rectangle(label_id: int, points: Sequence[float], **kwargs) -> models.LabeledShapeRequest:
    """Helper factory function for LabeledShapeRequest with frame=0 and type="rectangle"."""
    return shape(label_id, type="rectangle", points=points, **kwargs)


def skeleton(
    label_id: int, elements: Sequence[models.SubLabeledShapeRequest], **kwargs
) -> models.LabeledShapeRequest:
    """Helper factory function for LabeledShapeRequest with frame=0 and type="skeleton"."""
    return shape(label_id, type="skeleton", elements=elements, **kwargs)


def keypoint(label_id: int, points: Sequence[float], **kwargs) -> models.SubLabeledShapeRequest:
    """Helper factory function for SubLabeledShapeRequest with frame=0 and type="points"."""
    return models.SubLabeledShapeRequest(
        label_id=label_id, frame=0, type="points", points=points, **kwargs
    )
