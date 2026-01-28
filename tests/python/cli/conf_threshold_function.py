# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models
import PIL.Image

spec = cvataa.DetectionFunctionSpec(
    labels=[
        cvataa.label_spec("car", 0),
    ],
)


def detect(
    context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
) -> list[models.LabeledShapeRequest]:
    return [
        cvataa.rectangle(0, [context.conf_threshold, 1, 1, 1]),
    ]
