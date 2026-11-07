# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest

from cvat.apps.quality_control.export import resolve_conflict_annotation_frame


class TestResolveConflictAnnotationFrame(unittest.TestCase):
    def test_annotation_job_keeps_honeypot_frame(self) -> None:
        # DS / honeypot job is not in the GT frame map
        self.assertEqual(
            resolve_conflict_annotation_frame(
                job_id=10,
                conflict_frame_id=5,
                gt_pool_frame_maps={20: {5: 25}},
            ),
            5,
        )

    def test_gt_job_uses_pool_frame_for_honeypot_conflict(self) -> None:
        self.assertEqual(
            resolve_conflict_annotation_frame(
                job_id=20,
                conflict_frame_id=5,
                gt_pool_frame_maps={20: {5: 25}},
            ),
            25,
        )

    def test_gt_job_falls_back_when_frame_not_mapped(self) -> None:
        self.assertEqual(
            resolve_conflict_annotation_frame(
                job_id=20,
                conflict_frame_id=7,
                gt_pool_frame_maps={20: {5: 25}},
            ),
            7,
        )

    def test_non_gt_pool_tasks_have_empty_maps(self) -> None:
        self.assertEqual(
            resolve_conflict_annotation_frame(
                job_id=20,
                conflict_frame_id=5,
                gt_pool_frame_maps={},
            ),
            5,
        )
