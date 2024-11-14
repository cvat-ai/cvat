# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math

import PIL.Image
from skimage import measure
from torch import Tensor

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models
from cvat_sdk.masks import encode_mask

from ._torchvision import TorchvisionFunction


class _TorchvisionInstanceSegmentationFunction(TorchvisionFunction):
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
            for shape in self._generate_shapes(context, box, mask, label)
        ]

    def _generate_shapes(
        self, context: cvataa.DetectionFunctionContext, box: Tensor, mask: Tensor, label: Tensor
    ) -> list[models.LabeledShapeRequest]:
        LEVEL = 0.5

        if context.conv_mask_to_poly:
            # Since we treat mask values of exactly LEVEL as true, we'd like them
            # to also be considered high by find_contours. And for that, the level
            # parameter must be slightly less than LEVEL.
            contours = measure.find_contours(
                mask[0].detach().numpy(), level=math.nextafter(LEVEL, 0)
            )
            if not contours:
                return []

            contour = contours[0]
            if len(contour) < 3:
                return []

            contour = measure.approximate_polygon(contour, tolerance=2.5)

            return [
                cvataa.polygon(
                    label.item(),
                    contour[:, ::-1].ravel().tolist(),
                )
            ]
        else:
            return [
                cvataa.mask(label.item(), encode_mask((mask[0] >= LEVEL).numpy(), box.tolist()))
            ]


create = _TorchvisionInstanceSegmentationFunction
