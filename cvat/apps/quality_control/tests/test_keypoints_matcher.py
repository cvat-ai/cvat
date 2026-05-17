# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest

import datumaro as dm

from cvat.apps.quality_control.quality_reports import KeypointsMatcher


class TestKeypointsMatcher(unittest.TestCase):
    """Regression tests for issue #9957.

    Single-point and collinear skeletons produce zero-area bboxes.
    bbox_iou() returns 0 for zero-area boxes, which previously caused
    the early-exit guard to block even identical annotations from matching.
    """

    def _matcher(self, pt_a, bbox_a, pt_b, bbox_b):
        return KeypointsMatcher(
            sigma=0.1,
            instance_map={id(pt_a): [None, bbox_a], id(pt_b): [None, bbox_b]},
        )

    def test_single_point_identical_returns_one(self):
        """Identical single-point skeletons must match with OKS=1.0."""
        pt_a = dm.Points([10, 20], visibility=[dm.Points.Visibility.visible])
        pt_b = dm.Points([10, 20], visibility=[dm.Points.Visibility.visible])
        matcher = self._matcher(pt_a, (10, 20, 0, 0), pt_b, (10, 20, 0, 0))
        self.assertAlmostEqual(matcher.distance(pt_a, pt_b), 1.0)

    def test_collinear_two_point_skeleton_identical_returns_one(self):
        """Identical horizontal-line skeletons (zero-height bbox) must match."""
        pt_a = dm.Points([0, 0, 100, 0], visibility=[dm.Points.Visibility.visible] * 2)
        pt_b = dm.Points([0, 0, 100, 0], visibility=[dm.Points.Visibility.visible] * 2)
        matcher = self._matcher(pt_a, (0, 0, 100, 0), pt_b, (0, 0, 100, 0))
        self.assertAlmostEqual(matcher.distance(pt_a, pt_b), 1.0)

    def test_normal_non_overlapping_skeletons_return_zero(self):
        """Non-overlapping normal (non-degenerate) skeletons must not match."""
        pt_a = dm.Points([10, 10, 50, 50], visibility=[dm.Points.Visibility.visible] * 2)
        pt_b = dm.Points([200, 200, 250, 250], visibility=[dm.Points.Visibility.visible] * 2)
        matcher = self._matcher(pt_a, (10, 10, 40, 40), pt_b, (200, 200, 50, 50))
        self.assertEqual(matcher.distance(pt_a, pt_b), 0.0)

    def test_normal_overlapping_skeletons_return_nonzero(self):
        """Overlapping normal skeletons must still compute OKS correctly."""
        pt_a = dm.Points([10, 10, 50, 50], visibility=[dm.Points.Visibility.visible] * 2)
        pt_b = dm.Points([12, 12, 52, 52], visibility=[dm.Points.Visibility.visible] * 2)
        matcher = self._matcher(pt_a, (10, 10, 40, 40), pt_b, (12, 12, 40, 40))
        result = matcher.distance(pt_a, pt_b)
        self.assertGreater(result, 0.0)
        self.assertLessEqual(result, 1.0)


if __name__ == "__main__":
    unittest.main()
