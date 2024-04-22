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
    rectangle,
    shape,
    skeleton,
    skeleton_label_spec,
)
