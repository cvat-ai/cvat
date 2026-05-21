# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest

import datumaro as dm
import numpy as np

from cvat.apps.quality_control.quality_reports import KeypointsMatcher


# Image size used across all image-space tests: 640x480
IMG_H, IMG_W = 480, 640
IMG_SIZE = (IMG_H, IMG_W)


def _matcher(pt_a, bbox_a, pt_b, bbox_b, img_size=IMG_SIZE):
    return KeypointsMatcher(
        sigma=0.1,
        instance_map={id(pt_a): [None, bbox_a], id(pt_b): [None, bbox_b]},
        img_size=img_size,
    )


class TestKeypointsMatcher(unittest.TestCase):
    """Regression tests for issue #9957.

    Single-point and collinear skeletons produce zero-area bboxes.
    bbox_iou() always returns 0 for zero-area boxes, so the old code's
    early-exit guard blocked even identical annotations from matching.

    Fix: when both bboxes are degenerate (area == 0), skip the IoU guard
    and use image-area as the OKS scale — the same approach used by
    match_points._distance for point annotations.
    """

    # ── Degenerate bbox cases (the bug) ─────────────────────────────────────

    def test_single_point_identical_returns_one(self):
        """Identical single-point skeletons must match (OKS = 1.0)."""
        pt_a = dm.Points([100, 100], visibility=[dm.Points.Visibility.visible])
        pt_b = dm.Points([100, 100], visibility=[dm.Points.Visibility.visible])
        result = _matcher(pt_a, (100, 100, 0, 0), pt_b, (100, 100, 0, 0)).distance(pt_a, pt_b)
        self.assertAlmostEqual(result, 1.0)

    def test_single_point_slightly_off_returns_high_oks(self):
        """Slightly-offset single-point skeletons should still score high OKS."""
        # 5 px apart on a 640x480 image; scale = 307200
        # OKS = exp(-25 / (2 * 307200 * 0.04)) ≈ exp(-0.001) ≈ 0.999
        pt_a = dm.Points([100, 100], visibility=[dm.Points.Visibility.visible])
        pt_b = dm.Points([105, 100], visibility=[dm.Points.Visibility.visible])
        result = _matcher(pt_a, (100, 100, 0, 0), pt_b, (105, 100, 0, 0)).distance(pt_a, pt_b)
        self.assertGreater(result, 0.9)

    def test_single_point_far_apart_returns_low_oks(self):
        """Single-point skeletons far apart should not match."""
        pt_a = dm.Points([10, 10], visibility=[dm.Points.Visibility.visible])
        pt_b = dm.Points([500, 400], visibility=[dm.Points.Visibility.visible])
        result = _matcher(pt_a, (10, 10, 0, 0), pt_b, (500, 400, 0, 0)).distance(pt_a, pt_b)
        self.assertLess(result, 0.5)

    def test_collinear_two_point_skeleton_identical_returns_one(self):
        """Identical horizontal-line skeletons (zero-height bbox) must match."""
        vis = [dm.Points.Visibility.visible, dm.Points.Visibility.visible]
        pt_a = dm.Points([0, 0, 100, 0], visibility=vis)
        pt_b = dm.Points([0, 0, 100, 0], visibility=vis)
        result = _matcher(pt_a, (0, 0, 100, 0), pt_b, (0, 0, 100, 0)).distance(pt_a, pt_b)
        self.assertAlmostEqual(result, 1.0)

    def test_degenerate_without_image_size_returns_zero(self):
        """Without img_size we cannot scale OKS — must return 0 rather than NaN."""
        pt_a = dm.Points([10, 20], visibility=[dm.Points.Visibility.visible])
        pt_b = dm.Points([10, 20], visibility=[dm.Points.Visibility.visible])
        result = _matcher(pt_a, (10, 20, 0, 0), pt_b, (10, 20, 0, 0),
                          img_size=None).distance(pt_a, pt_b)
        self.assertEqual(result, 0.0)

    # ── Normal (non-degenerate) bbox cases — regression guard ────────────────

    def test_normal_non_overlapping_skeletons_return_zero(self):
        """Non-overlapping skeletons with valid bboxes must still return 0."""
        vis = [dm.Points.Visibility.visible] * 2
        pt_a = dm.Points([10, 10, 50, 50], visibility=vis)
        pt_b = dm.Points([200, 200, 250, 250], visibility=vis)
        result = _matcher(pt_a, (10, 10, 40, 40), pt_b, (200, 200, 50, 50)).distance(pt_a, pt_b)
        self.assertEqual(result, 0.0)

    def test_normal_overlapping_skeletons_return_nonzero(self):
        """Overlapping skeletons with valid bboxes must compute OKS > 0."""
        vis = [dm.Points.Visibility.visible] * 2
        pt_a = dm.Points([10, 10, 50, 50], visibility=vis)
        pt_b = dm.Points([12, 12, 52, 52], visibility=vis)
        result = _matcher(pt_a, (10, 10, 40, 40), pt_b, (12, 12, 40, 40)).distance(pt_a, pt_b)
        self.assertGreater(result, 0.0)
        self.assertLessEqual(result, 1.0)


if __name__ == "__main__":
    unittest.main()
