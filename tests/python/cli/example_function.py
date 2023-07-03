# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import List

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.models as models
import PIL.Image

spec = cvataa.DetectionFunctionSpec(
    labels=[
        models.PatchedLabelRequest(name="car", id=0),
    ]
)


def detect(
    context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
) -> List[models.LabeledShapeRequest]:
    return [
        models.LabeledShapeRequest(type="rectangle", frame=0, label_id=0, points=[1, 2, 3, 4]),
    ]
