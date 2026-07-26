# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Sequence
from typing import TypedDict

import attrs
import attrs.validators
import torch
import torch.utils.data
from torch import Tensor

from cvat_sdk.datasets.common import UnsupportedDatasetError
from cvat_sdk.pytorch._utils import draw_mask, shape_bbox
from cvat_sdk.pytorch.common import Target


class LabeledBoxes(TypedDict):
    boxes: torch.Tensor
    labels: torch.Tensor


class LabeledMasks(TypedDict):
    boxes: torch.Tensor
    labels: torch.Tensor
    masks: torch.Tensor


@attrs.frozen
class ExtractSingleLabelIndex:
    """
    A target transform that takes a `Target` object and produces a single label index
    based on the tag in that object, as a 0-dimensional tensor.

    This makes the dataset samples compatible with the image classification networks
    in torchvision.

    If the annotations contain no tags, or multiple tags, raises a `ValueError`.
    """

    def __call__(self, target: Target) -> Tensor:
        tags = target.annotations.tags
        if not tags:
            raise ValueError("sample has no tags")

        if len(tags) > 1:
            raise ValueError("sample has multiple tags")

        return torch.tensor(target.label_id_to_index[tags[0].label_id], dtype=torch.long)


@attrs.frozen
class ExtractBoundingBoxes:
    """
    A target transform that takes a `Target` object and returns a dictionary compatible
    with the object detection networks in torchvision.

    The dictionary contains the following entries:

    "boxes": a tensor with shape [N, 4], where each row represents a bounding box of a shape
    in the annotations in the (xmin, ymin, xmax, ymax) format.
    "labels": a tensor with shape [N] containing corresponding label indices.

    Limitations:

    * Only the following shape types are supported: rectangle, polygon, polyline,
      points, ellipse.
    * Rotated shapes are not supported.
    """

    SUPPORTED_SHAPE_TYPES = frozenset(["rectangle", "polygon", "polyline", "points", "ellipse"])

    include_shape_types: frozenset[str] = attrs.field(
        converter=frozenset,
        validator=attrs.validators.deep_iterable(attrs.validators.in_(SUPPORTED_SHAPE_TYPES)),
        kw_only=True,
    )
    """Shapes whose type is not in this set will be ignored."""

    def __call__(self, target: Target) -> LabeledBoxes:
        boxes = []
        labels = []

        for shape in target.annotations.shapes:
            if shape.type.value not in self.include_shape_types:
                continue

            if shape.rotation != 0:
                raise UnsupportedDatasetError("Rotated shapes are not supported")

            boxes.append(shape_bbox(shape=shape))
            labels.append(target.label_id_to_index[shape.label_id])

        return LabeledBoxes(
            boxes=(
                torch.tensor(boxes, dtype=torch.float)
                if boxes
                else torch.empty((0, 4), dtype=torch.float)
            ),
            labels=torch.tensor(labels, dtype=torch.long),
        )


@attrs.frozen
class ExtractInstanceMasks:
    """
    A target transform that takes a `Target` object and returns a dictionary compatible
    with the instance segmentation networks in torchvision.

    The dictionary contains the following entries:

    "boxes": a tensor with shape [N, 4], where each row represents a bounding box of a shape
    in the annotations in the (xmin, ymin, xmax, ymax) format.
    "labels": a tensor with shape [N] containing corresponding label indices.
    "masks": a uint8 tensor with shape [N, H, W] containing binary instance masks.

    Limitations:

    * Only the following shape types are supported: polygon, mask.
    * Rotated shapes are not supported.
    """

    SUPPORTED_SHAPE_TYPES = frozenset(["polygon", "mask"])

    include_shape_types: frozenset[str] = attrs.field(
        converter=frozenset,
        validator=attrs.validators.deep_iterable(attrs.validators.in_(SUPPORTED_SHAPE_TYPES)),
        kw_only=True,
    )
    """Shapes whose type is not in this set will be ignored."""

    def __call__(self, target: Target) -> LabeledMasks:
        boxes: list[Sequence[float]] = []
        labels: list[int] = []
        masks: list[torch.Tensor] = []

        for shape in target.annotations.shapes:
            if shape.type.value not in self.include_shape_types:
                continue

            if shape.rotation != 0:
                raise UnsupportedDatasetError("Rotated shapes are not supported")

            boxes.append(shape_bbox(shape=shape))
            labels.append(target.label_id_to_index[shape.label_id])
            masks.append(
                torch.as_tensor(
                    draw_mask(shape=shape, image_size=target.image_size), dtype=torch.uint8
                )
            )

        return LabeledMasks(
            boxes=(
                torch.tensor(boxes, dtype=torch.float)
                if boxes
                else torch.empty((0, 4), dtype=torch.float)
            ),
            labels=torch.tensor(labels, dtype=torch.long),
            masks=(
                torch.stack(masks)
                if masks
                else torch.empty((0, target.image_size[1], target.image_size[0]), dtype=torch.uint8)
            ),
        )
