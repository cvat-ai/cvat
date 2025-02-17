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
    if context.conv_mask_to_poly:
        return [cvataa.polygon(0, [0, 0, 0, 1, 1, 1])]
    else:
        return [cvataa.mask(0, [1, 0, 0, 0, 0])]
