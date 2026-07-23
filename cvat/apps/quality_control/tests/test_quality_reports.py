# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest

import datumaro as dm

from cvat.apps.dataset_manager.bindings import CommonData
from cvat.apps.engine.models import ShapeType
from cvat.apps.quality_control.quality_reports import _MemoizingAnnotationConverterFactory


class TestMemoizingAnnotationConverter(unittest.TestCase):
    def test_skeleton_keypoint_aliases_resolve_to_the_source_annotation(self) -> None:
        keypoint_source = CommonData.LabeledShape(
            type=ShapeType.POINTS,
            frame=0,
            label=2,
            points=[4, 5],
            occluded=False,
            attributes=[],
            source=None,
            id=20,
        )
        skeleton_source = CommonData.LabeledShape(
            type=ShapeType.SKELETON,
            frame=0,
            label=1,
            points=[],
            occluded=False,
            attributes=[],
            source=None,
            elements=[keypoint_source],
            id=10,
        )
        keypoint = dm.Points(
            [4, 5],
            [dm.Points.Visibility.visible],
            label=2,
        )
        skeleton = dm.Skeleton([keypoint], label=1)
        wrapped_keypoint = keypoint.wrap(attributes={"source": "manual"})
        annotation_memo = _MemoizingAnnotationConverterFactory()

        annotation_memo.remember_conversion(skeleton_source, [skeleton])
        annotation_memo.remember_annotation_alias(keypoint, wrapped_keypoint)

        self.assertEqual(annotation_memo.get_source_ann(keypoint), keypoint_source)
        self.assertEqual(annotation_memo.get_source_ann(wrapped_keypoint), keypoint_source)
