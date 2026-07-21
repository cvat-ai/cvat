# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
from unittest.mock import patch

import datumaro as dm
import django
import numpy as np
from django.apps import apps

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cvat.settings.testing")
if not apps.ready:
    django.setup()

from cvat.apps.dataset_manager.bindings import CommonData
from cvat.apps.engine.models import ShapeType
from cvat.apps.quality_control import models
from cvat.apps.quality_control.annotation_matching import Comparator
from cvat.apps.quality_control.comparison_report import (
    ComparisonParameters,
    ComparisonReportAnnotationsSummary,
)
from cvat.apps.quality_control.quality_handlers import (
    build_requirement_comparison_summary,
    build_requirement_report,
    build_requirements_summary,
)
from cvat.apps.quality_control.quality_reports import _MemoizingAnnotationConverterFactory
from cvat.apps.quality_control.serializers import QualityRequirementSerializer


def test_empty_frames_are_annotated_by_default() -> None:
    serializer_defaults = {}
    QualityRequirementSerializer._apply_root_defaults(serializer_defaults)

    assert ComparisonParameters().empty_is_annotated is True
    assert models.QualityRequirement().empty_is_annotated is True
    assert serializer_defaults["empty_is_annotated"] is True


def test_enabled_requirement_with_zero_total_annotations_is_completed() -> None:
    requirement = models.QualityRequirement(
        id=1,
        name="empty-filter-result",
        enabled=True,
        target_metric=models.QualityTargetMetricType.ACCURACY,
        target_metric_threshold=1.0,
    )
    group_report = build_requirement_report(requirement=requirement, frame_results={})

    requirements_summary = build_requirements_summary(
        [requirement],
        {requirement.name: group_report},
    )

    assert group_report.comparison_summary.score == 1.0
    assert group_report.comparison_summary.score_components.valid_count == 0
    assert requirements_summary.completed == 1
    assert requirements_summary.items[0].score == 1.0


def test_nonempty_requirement_with_zero_valid_annotations_is_not_completed() -> None:
    requirement = models.QualityRequirement(
        id=1,
        name="mismatched-labels",
        enabled=True,
        target_metric=models.QualityTargetMetricType.ACCURACY,
        target_metric_threshold=1.0,
    )
    annotations = ComparisonReportAnnotationsSummary(
        valid_count=0,
        missing_count=0,
        extra_count=0,
        total_count=1,
        ds_count=1,
        gt_count=1,
        confusion_matrix=None,
    )

    comparison_summary = build_requirement_comparison_summary(
        requirement=requirement,
        annotations=annotations,
        conflicts=[],
    )

    assert comparison_summary.score == 0.0


def _make_mask_item(mask: np.ndarray) -> dm.DatasetItem:
    return dm.DatasetItem(
        id="frame",
        media=dm.Image.from_numpy(data=np.zeros((*mask.shape, 3), dtype=np.uint8)),
        annotations=[dm.Mask(np.asfortranarray(mask), label=0)],
    )


def test_mask_only_comparator_matches_masks() -> None:
    mask = np.zeros((8, 8), dtype=bool)
    mask[2:6, 2:6] = True
    settings = ComparisonParameters()
    settings.included_annotation_types = [dm.AnnotationType.mask]

    comparator = Comparator(
        {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
        settings=settings,
    )

    matches, mismatches, gt_unmatched, ds_unmatched, _ = comparator.match_annotations(
        _make_mask_item(mask),
        _make_mask_item(mask.copy()),
    )["all_ann_types"]

    assert len(matches) == 1
    assert not mismatches
    assert not gt_unmatched
    assert not ds_unmatched


def test_memoizing_converter_maps_skeleton_keypoint_aliases() -> None:
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

    assert annotation_memo.get_source_ann(keypoint) == keypoint_source
    assert annotation_memo.get_source_ann(wrapped_keypoint) == keypoint_source


def test_requirement_serializer_update_clears_root_values_when_parent_is_set() -> None:
    settings = models.QualitySettings(id=1)
    parent = models.QualityRequirement(
        id=1,
        settings=settings,
        annotation_type=models.QualityRequirementAnnotationType.RECTANGLE,
        iou_threshold=0.25,
        oks_sigma=0.1,
        compare_groups=True,
    )
    requirement = models.QualityRequirement(
        id=2,
        settings=settings,
        annotation_type=models.QualityRequirementAnnotationType.RECTANGLE,
        iou_threshold=0.9,
        oks_sigma=0.7,
        compare_groups=False,
    )

    serializer = QualityRequirementSerializer(context={"touch_settings": False})
    with patch.object(models.QualityRequirement, "save", lambda self, *args, **kwargs: None):
        serializer.update(requirement, {"parent": parent, "annotation_type": None})

    assert requirement.parent == parent
    assert requirement.annotation_type is None
    assert requirement.iou_threshold is None
    assert requirement.oks_sigma is None
    assert requirement.compare_groups is None


def test_requirement_serializer_update_applies_root_defaults_when_parent_is_cleared() -> None:
    settings = models.QualitySettings(id=1)
    parent = models.QualityRequirement(
        id=1,
        settings=settings,
        annotation_type=models.QualityRequirementAnnotationType.RECTANGLE,
    )
    requirement = models.QualityRequirement(
        id=2,
        settings=settings,
        parent=parent,
        annotation_type=None,
        iou_threshold=None,
        oks_sigma=None,
        compare_groups=None,
    )

    serializer = QualityRequirementSerializer(context={"touch_settings": False})
    with patch.object(models.QualityRequirement, "save", lambda self, *args, **kwargs: None):
        serializer.update(
            requirement,
            {
                "parent": None,
                "annotation_type": models.QualityRequirementAnnotationType.RECTANGLE,
            },
        )

    assert requirement.parent is None
    assert requirement.annotation_type == models.QualityRequirementAnnotationType.RECTANGLE
    assert requirement.target_metric == models.QualityTargetMetricType.ACCURACY
    assert requirement.target_metric_threshold == 0.7
    assert requirement.iou_threshold == 0.4
    assert requirement.oks_sigma == 0.09
    assert requirement.compare_groups is True
    assert requirement.empty_is_annotated is True
