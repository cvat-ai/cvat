# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class IntervalMatchingConfig:
    iou_threshold: float = 0.3
    low_overlap_threshold: float = 0.5
    boundary_tolerance_ms: float = 200.0  # boundary-F1 timestamp tolerance


@dataclass
class QualitySettings:
    interval_matching: IntervalMatchingConfig = field(default_factory=IntervalMatchingConfig)
