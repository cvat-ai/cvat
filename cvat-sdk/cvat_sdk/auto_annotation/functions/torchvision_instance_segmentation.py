# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math
from collections.abc import Iterator

import numpy as np
import PIL.Image
from skimage import measure
from torch import Tensor

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models
from cvat_sdk.masks import encode_mask

from ._torchvision import TorchvisionFunction


def _is_positively_oriented(contour: np.ndarray) -> bool:
    ys, xs = contour.T

    # This is the shoelace formula, except we only need the sign of the result,
    # so we compare instead of subtracting. Compared to the typical formula,
    # the sign is inverted, because the Y axis points downwards.
    return np.sum(xs * np.roll(ys, -1)) < np.sum(ys * np.roll(xs, -1))


def _generate_shapes(
    context: cvataa.DetectionFunctionContext, box: Tensor, mask: Tensor, label: Tensor
) -> Iterator[models.LabeledShapeRequest]:
    LEVEL = 0.5

    if context.conv_mask_to_poly:
        # Since we treat mask values of exactly LEVEL as true, we'd like them
        # to also be considered high by find_contours. And for that, the level
        # parameter must be slightly less than LEVEL.
        contours = measure.find_contours(mask[0].detach().numpy(), level=math.nextafter(LEVEL, 0))

        for contour in contours:
            if len(contour) < 3 or _is_positively_oriented(contour):
                continue

            contour = measure.approximate_polygon(contour, tolerance=2.5)

            yield cvataa.polygon(label.item(), contour[:, ::-1].ravel().tolist())

    else:
        yield cvataa.mask(label.item(), encode_mask(mask[0] >= LEVEL, box.tolist()))


class _TorchvisionInstanceSegmentationFunction(TorchvisionFunction):
    _label_type = "mask"

    def detect(
        self, context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[models.LabeledShapeRequest]:
        conf_threshold = context.conf_threshold or 0
        results = self._model([self._transforms(image)])

        return [
            shape
            for result in results
            for box, mask, label, score in zip(
                result["boxes"], result["masks"], result["labels"], result["scores"]
            )
            if score >= conf_threshold
            for shape in _generate_shapes(context, box, mask, label)
        ]


create = _TorchvisionInstanceSegmentationFunction
