# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import PIL.Image

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models

from ._torchvision import TorchvisionFunction


class _TorchvisionClassificationFunction(TorchvisionFunction):
    _label_type = "tag"

    def detect(
        self, context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[models.LabeledImageRequest]:
        conf_threshold = context.conf_threshold or 0
        results = self._model(self._transforms(image).unsqueeze(0))

        scores = results[0].softmax(0)
        label = scores.argmax().item()

        if scores[label] >= conf_threshold:
            return [cvataa.tag(label)]

        return []


create = _TorchvisionClassificationFunction
