# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .driver import annotate_task
from .exceptions import BadFunctionError
from .interface import (
    DetectionFunction,
    DetectionFunctionContext,
    DetectionFunctionSpec,
    attribute_spec,
    checkbox_attribute_spec,
    keypoint,
    keypoint_spec,
    label_spec,
    mask,
    number_attribute_spec,
    polygon,
    radio_attribute_spec,
    rectangle,
    select_attribute_spec,
    shape,
    skeleton,
    skeleton_label_spec,
    text_attribute_spec,
)

__all__ = [
    "annotate_task",
    "attribute_spec",
    "BadFunctionError",
    "checkbox_attribute_spec",
    "DetectionFunction",
    "DetectionFunctionContext",
    "DetectionFunctionSpec",
    "keypoint_spec",
    "keypoint",
    "label_spec",
    "mask",
    "number_attribute_spec",
    "polygon",
    "radio_attribute_spec",
    "rectangle",
    "select_attribute_spec",
    "shape",
    "skeleton_label_spec",
    "skeleton",
    "text_attribute_spec",
]
