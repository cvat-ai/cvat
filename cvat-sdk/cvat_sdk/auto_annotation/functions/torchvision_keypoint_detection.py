# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from functools import cached_property

import PIL.Image

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models

from ._torchvision import TorchvisionFunction


class _TorchvisionKeypointDetectionFunction(TorchvisionFunction):
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

    def detect(
        self, context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[models.LabeledShapeRequest]:
        conf_threshold = context.conf_threshold or 0
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
            for keypoints, label, score in zip(
                result["keypoints"], result["labels"], result["scores"]
            )
            if score >= conf_threshold
        ]


create = _TorchvisionKeypointDetectionFunction
