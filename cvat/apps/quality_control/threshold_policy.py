# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import math
from bisect import bisect_right
from collections.abc import Mapping
from typing import Literal

from attr import asdict, field, frozen

MAX_THRESHOLD_POINTS = 200
ADAPTIVE_IOU_TYPES = frozenset({"rectangle", "polygon", "mask"})


@frozen
class ThresholdPolicyPoint:
    x: float
    y: float


@frozen
class ThresholdPolicy:
    type: Literal["iou"] = field(default="iou", init=False)

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


@frozen
class ConstantThresholdPolicy(ThresholdPolicy):
    value: float
    mode: Literal["constant"] = field(default="constant", init=False)


@frozen
class LinearThresholdPolicy(ThresholdPolicy):
    points: tuple[ThresholdPolicyPoint, ...]
    mode: Literal["linear"] = field(default="linear", init=False)
    input: Literal["gt.shape_area"] = field(default="gt.shape_area", init=False)
    extrapolation: Literal["clamp"] = field(default="clamp", init=False)


class InvalidGroundTruthArea(ValueError):
    def __init__(self, count: int = 1):
        super().__init__("Linear IoU thresholds require a finite, positive GT shape area.")
        self.count = count


def validate_threshold_policy(policy: ConstantThresholdPolicy | LinearThresholdPolicy) -> None:
    """Validate the values of a typed policy."""

    def threshold(value: float) -> None:
        if not math.isfinite(value) or not 0 <= value <= 1:
            raise ValueError("IoU thresholds must be finite and between 0 and 1.")

    if isinstance(policy, ConstantThresholdPolicy):
        threshold(policy.value)
        return

    if not 2 <= len(policy.points) <= MAX_THRESHOLD_POINTS:
        raise ValueError(f"A linear policy requires 2 to {MAX_THRESHOLD_POINTS} points.")
    previous_x = 0.0
    for point in policy.points:
        if not math.isfinite(point.x) or point.x <= 0:
            raise ValueError("GT area must be finite and positive.")
        if point.x <= previous_x:
            raise ValueError("GT areas must be unique and sorted in ascending order.")
        threshold(point.y)
        previous_x = point.x


def parse_threshold_policy(data: object) -> ConstantThresholdPolicy | LinearThresholdPolicy:
    """Parse and validate JSON at the API or storage boundary."""
    if not isinstance(data, Mapping):
        raise ValueError("The threshold policy must be an object.")
    # Policies saved before the type discriminator was introduced describe IoU.
    if data.get("type", "iou") != "iou":
        raise ValueError("Only IoU threshold policies are supported.")

    def number(value: object) -> float:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("Policy coordinates must be finite numbers.")
        try:
            return float(value)
        except OverflowError as error:
            raise ValueError("Policy coordinates must be finite numbers.") from error

    keys = set(data) - {"type"}
    if data.get("mode") == "constant":
        if keys != {"mode", "value"}:
            raise ValueError("A constant policy requires only type, mode and value.")
        policy = ConstantThresholdPolicy(value=number(data["value"]))
        validate_threshold_policy(policy)
        return policy
    if data.get("mode") != "linear":
        raise ValueError("Threshold mode must be constant or linear.")
    if keys != {"mode", "input", "extrapolation", "points"}:
        raise ValueError("A linear policy requires type, mode, input, extrapolation and points.")
    if data["input"] != "gt.shape_area" or data["extrapolation"] != "clamp":
        raise ValueError("Use gt.shape_area with clamped endpoints.")
    points = data["points"]
    if not isinstance(points, list):
        raise ValueError("Policy points must be an array.")
    normalized: list[ThresholdPolicyPoint] = []
    for point in points:
        if not isinstance(point, Mapping) or set(point) != {"x", "y"}:
            raise ValueError("Each point requires only x and y.")
        normalized.append(ThresholdPolicyPoint(x=number(point["x"]), y=number(point["y"])))
    linear_policy = LinearThresholdPolicy(points=tuple(normalized))
    validate_threshold_policy(linear_policy)
    return linear_policy


class ThresholdPolicyEvaluator:
    """Compile a curve once, then evaluate GT areas with binary search before assignment."""

    def __init__(self, policy: ConstantThresholdPolicy | LinearThresholdPolicy):
        self.policy = policy
        self._xs = (
            [point.x for point in self.policy.points]
            if isinstance(self.policy, LinearThresholdPolicy)
            else []
        )

    def __call__(self, area: float | None = None) -> float:
        if isinstance(self.policy, ConstantThresholdPolicy):
            return self.policy.value
        if area is None or not math.isfinite(area) or area <= 0:
            raise InvalidGroundTruthArea()
        points = self.policy.points
        index = bisect_right(self._xs, area)
        if index == 0:
            return points[0].y
        if index == len(points):
            return points[-1].y
        a, b = points[index - 1], points[index]
        return a.y + (b.y - a.y) * (area - a.x) / (b.x - a.x)
