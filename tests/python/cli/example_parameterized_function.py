# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from types import SimpleNamespace as namespace

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models
import PIL.Image


def create(s: str, i: int, f: float, b: bool) -> cvataa.DetectionFunction:
    assert s == "string"
    assert i == 123
    assert f == 5.5
    assert b is False

    spec = cvataa.DetectionFunctionSpec(
        labels=[
            cvataa.label_spec("car", 0),
        ],
    )

    def detect(
        context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[models.LabeledShapeRequest]:
        return [
            cvataa.rectangle(0, [1, 2, 3, 4]),
        ]

    return namespace(spec=spec, detect=detect)
