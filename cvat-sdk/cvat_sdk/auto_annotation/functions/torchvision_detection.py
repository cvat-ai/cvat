# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from functools import cached_property

import PIL.Image
import torchvision.models

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models


class _TorchvisionDetectionFunction:
    def __init__(self, model_name: str, weights_name: str = "DEFAULT", **kwargs) -> None:
        weights_enum = torchvision.models.get_model_weights(model_name)
        self._weights = weights_enum[weights_name]
        self._transforms = self._weights.transforms()
        self._model = torchvision.models.get_model(model_name, weights=self._weights, **kwargs)
        self._model.eval()

    @cached_property
    def spec(self) -> cvataa.DetectionFunctionSpec:
        return cvataa.DetectionFunctionSpec(
            labels=[
                cvataa.label_spec(cat, i) for i, cat in enumerate(self._weights.meta["categories"])
            ]
        )

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
