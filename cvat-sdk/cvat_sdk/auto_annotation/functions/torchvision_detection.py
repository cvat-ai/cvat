# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import PIL.Image

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models

from ._torchvision import TorchvisionFunction


class _TorchvisionDetectionFunction(TorchvisionFunction):
    _label_type = "rectangle"

    def detect(
        self, context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[models.LabeledShapeRequest]:
        conf_threshold = context.conf_threshold or 0
        results = self._model([self._transforms(image)])

        return [
            cvataa.rectangle(label.item(), [x.item() for x in box])
            for result in results
            for box, label, score in zip(result["boxes"], result["labels"], result["scores"])
            if score >= conf_threshold
        ]


create = _TorchvisionDetectionFunction
