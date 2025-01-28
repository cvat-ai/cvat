# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import TypedDict

import attrs
import attrs.validators
import torch
import torch.utils.data

from cvat_sdk.datasets.common import UnsupportedDatasetError
from cvat_sdk.pytorch.common import Target


@attrs.frozen
class ExtractSingleLabelIndex:
    """
    A target transform that takes a `Target` object and produces a single label index
    based on the tag in that object, as a 0-dimensional tensor.

    This makes the dataset samples compatible with the image classification networks
    in torchvision.

    If the annotations contain no tags, or multiple tags, raises a `ValueError`.
    """

    def __call__(self, target: Target) -> int:
        tags = target.annotations.tags
        if not tags:
            raise ValueError("sample has no tags")

        if len(tags) > 1:
            raise ValueError("sample has multiple tags")

        return torch.tensor(target.label_id_to_index[tags[0].label_id], dtype=torch.long)


class LabeledBoxes(TypedDict):
    boxes: torch.Tensor
    labels: torch.Tensor


_SUPPORTED_SHAPE_TYPES = frozenset(["rectangle", "polygon", "polyline", "points", "ellipse"])


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

    include_shape_types: frozenset[str] = attrs.field(
        converter=frozenset,
        validator=attrs.validators.deep_iterable(attrs.validators.in_(_SUPPORTED_SHAPE_TYPES)),
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

            x_coords = shape.points[0::2]
            y_coords = shape.points[1::2]

            boxes.append((min(x_coords), min(y_coords), max(x_coords), max(y_coords)))
            labels.append(target.label_id_to_index[shape.label_id])

        return LabeledBoxes(
            boxes=torch.tensor(boxes, dtype=torch.float),
            labels=torch.tensor(labels, dtype=torch.long),
        )
