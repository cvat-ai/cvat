# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .driver import BadFunctionError, annotate_task
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
