# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from functools import cached_property
from typing import List

import PIL.Image
import torchvision.models

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models


class _TorchvisionKeypointDetectionFunction:
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
                cvataa.skeleton_label_spec(
                    cat,
                    i,
                    [
                        cvataa.keypoint_spec(name, j)
                        for j, name in enumerate(self._weights.meta["keypoint_names"])
                    ],
                )
                for i, cat in enumerate(self._weights.meta["categories"])
            ]
        )

    def detect(self, context, image: PIL.Image.Image) -> List[models.LabeledShapeRequest]:
        results = self._model([self._transforms(image)])

        return [
            cvataa.skeleton(
                label.item(),
                elements=[
                    cvataa.keypoint(
                        keypoint_id,
                        [keypoint[0].item(), keypoint[1].item()],
                        occluded=not keypoint[2].item(),
                    )
                    for keypoint_id, keypoint in enumerate(keypoints)
                ],
            )
            for result in results
            for keypoints, label in zip(result["keypoints"], result["labels"])
        ]


create = _TorchvisionKeypointDetectionFunction
