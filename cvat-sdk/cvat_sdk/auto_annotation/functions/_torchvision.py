# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from functools import cached_property

import torchvision.models

import cvat_sdk.auto_annotation as cvataa


class TorchvisionFunction:
    _label_type = "any"

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
                cvataa.label_spec(cat, i, type=self._label_type)
                for i, cat in enumerate(self._weights.meta["categories"])
                if cat != "N/A"
            ]
        )
