# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .driver import annotate_task
from .exceptions import BadFunctionError
from .interface import (
    DetectionFunction,
    DetectionFunctionContext,
    DetectionFunctionSpec,
    keypoint,
    keypoint_spec,
    label_spec,
    mask,
    polygon,
    rectangle,
    shape,
    skeleton,
    skeleton_label_spec,
)

__all__ = [
    "annotate_task",
    "BadFunctionError",
    "DetectionFunction",
    "DetectionFunctionContext",
    "DetectionFunctionSpec",
    "keypoint_spec",
    "keypoint",
    "label_spec",
    "mask",
    "polygon",
    "rectangle",
    "shape",
    "skeleton_label_spec",
    "skeleton",
]
