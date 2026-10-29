# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math
import unittest

from cvat.apps.quality_control.threshold_policy import (
    ConstantThresholdPolicy,
    LinearThresholdPolicy,
    ThresholdPolicyEvaluator,
    ThresholdPolicyPoint,
    parse_threshold_policy,
)

LINEAR_POLICY = {
    "type": "iou",
    "mode": "linear",
    "input": "gt.shape_area",
    "extrapolation": "clamp",
    "points": [{"x": 100, "y": 0.4}, {"x": 1000, "y": 0.9}],
}


class TestThresholdPolicy(unittest.TestCase):
    def test_interpolation_and_clamping(self):
        evaluator = ThresholdPolicyEvaluator(parse_threshold_policy(LINEAR_POLICY))
        for area, expected in [
            (0, 0.4),
            (50, 0.4),
            (100, 0.4),
            (550, 0.65),
            (1000, 0.9),
            (2000, 0.9),
        ]:
            with self.subTest(area=area):
                self.assertAlmostEqual(evaluator(area), expected)

    def test_decreasing_and_multiple_segments(self):
        evaluator = ThresholdPolicyEvaluator(
            LinearThresholdPolicy(
                points=(
                    ThresholdPolicyPoint(10, 1),
                    ThresholdPolicyPoint(20, 0),
                    ThresholdPolicyPoint(40, 0.5),
                )
            )
        )
        self.assertEqual(evaluator(15), 0.5)
        self.assertEqual(evaluator(30), 0.25)
        self.assertEqual(evaluator(100), 0.5)

    def test_constant_does_not_require_an_area(self):
        evaluator = ThresholdPolicyEvaluator(ConstantThresholdPolicy(value=0.7))
        self.assertEqual(evaluator(), 0.7)
        self.assertEqual(evaluator(math.nan), 0.7)

    def test_invalid_areas_are_distinct_from_zero(self):
        evaluator = ThresholdPolicyEvaluator(parse_threshold_policy(LINEAR_POLICY))
        for area in [None, -1, math.nan, math.inf, -math.inf]:
            with (
                self.subTest(area=area),
                self.assertRaisesRegex(ValueError, "finite, nonnegative GT shape area"),
            ):
                evaluator(area)

    def test_policy_rejects_nonfinite_numbers(self):
        for value in [math.nan, math.inf, -math.inf]:
            policies = [
                {"mode": "constant", "value": value},
                {**LINEAR_POLICY, "points": [{"x": value, "y": 0.4}, {"x": 1000, "y": 0.9}]},
                {**LINEAR_POLICY, "points": [{"x": 100, "y": value}, {"x": 1000, "y": 0.9}]},
            ]
            for policy in policies:
                with self.subTest(policy=policy), self.assertRaises(ValueError):
                    parse_threshold_policy(policy)
