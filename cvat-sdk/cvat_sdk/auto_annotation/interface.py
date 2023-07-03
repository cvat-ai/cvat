# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import List, Sequence

import attrs
import PIL.Image
from typing_extensions import Protocol

import cvat_sdk.models as models


@attrs.frozen(kw_only=True)
class DetectionFunctionSpec:
    labels: Sequence[models.PatchedLabelRequest]


class DetectionFunctionContext:
    # This class exists so that the SDK can provide additional information
    # to the function in a backwards-compatible way. There's nothing here for now.
    pass


class DetectionFunction(Protocol):
    @property
    def spec(self) -> DetectionFunctionSpec:
        ...

    def detect(
        self, context: DetectionFunctionContext, image: PIL.Image.Image
    ) -> List[models.LabeledShapeRequest]:
        ...
