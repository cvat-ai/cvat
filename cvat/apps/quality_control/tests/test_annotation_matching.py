# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest

import datumaro as dm
import numpy as np

from cvat.apps.quality_control.annotation_matching import AttributeMatchingResult, Comparator
from cvat.apps.quality_control.comparison_report import ComparisonParameters


def _make_mask_item(mask: np.ndarray) -> dm.DatasetItem:
    return dm.DatasetItem(
        id="frame",
        media=dm.Image.from_numpy(data=np.zeros((*mask.shape, 3), dtype=np.uint8)),
        annotations=[dm.Mask(np.asfortranarray(mask), label=0)],
    )


def _make_image_item(*annotations: dm.Annotation) -> dm.DatasetItem:
    return dm.DatasetItem(
        id="frame",
        media=dm.Image.from_numpy(data=np.zeros((100, 100, 3), dtype=np.uint8)),
        annotations=list(annotations),
    )


def _match_attributes(
    gt_ann: dm.Annotation,
    ds_ann: dm.Annotation,
) -> AttributeMatchingResult:
    gt_attribute_names = set(gt_ann.attributes)
    ds_attribute_names = set(ds_ann.attributes)
    common_attribute_names = gt_attribute_names & ds_attribute_names

    return AttributeMatchingResult(
        matches=tuple(
            sorted(
                name
                for name in common_attribute_names
                if gt_ann.attributes[name] == ds_ann.attributes[name]
            )
        ),
        mismatches=tuple(
            sorted(
                name
                for name in common_attribute_names
                if gt_ann.attributes[name] != ds_ann.attributes[name]
            )
        ),
        a_only=tuple(sorted(gt_attribute_names - ds_attribute_names)),
        b_only=tuple(sorted(ds_attribute_names - gt_attribute_names)),
    )


class TestComparator(unittest.TestCase):
    @staticmethod
    def _make_comparator() -> Comparator:
        return Comparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
            settings=ComparisonParameters(),
        )

    def test_mask_only_comparator_matches_masks(self) -> None:
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

        self.assertEqual(len(matches), 1)
        self.assertFalse(mismatches)
        self.assertFalse(gt_unmatched)
        self.assertFalse(ds_unmatched)

    def test_score_is_not_compared_as_a_user_attribute(self) -> None:
        comparator = self._make_comparator()

        result = comparator.match_attrs(
            dm.Label(0, attributes={"score": 0.25}),
            dm.Label(0, attributes={"score": 0.75}),
        )

        self.assertEqual(result, AttributeMatchingResult())

    def test_attributes_affect_matching_and_pairwise_diagnostics(self) -> None:
        settings = ComparisonParameters()
        settings.included_annotation_types = [dm.AnnotationType.bbox]
        gt_ann = dm.Bbox(
            10,
            10,
            20,
            20,
            label=0,
            attributes={"color": "red", "size": "large"},
        )
        ds_ann = dm.Bbox(
            10,
            10,
            20,
            20,
            label=0,
            attributes={"color": "blue", "style": "sport"},
        )
        comparator = Comparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
            settings=settings,
            attribute_matcher=_match_attributes,
        )

        result = comparator.match_annotations(
            _make_image_item(gt_ann),
            _make_image_item(ds_ann),
        )["all_shape_ann_types"]
        matches, mismatches, gt_unmatched, ds_unmatched, comparisons = result

        self.assertFalse(matches)
        self.assertFalse(mismatches)
        self.assertEqual(gt_unmatched, [gt_ann])
        self.assertEqual(ds_unmatched, [ds_ann])
        comparison = comparator.get_comparison(comparisons, gt_ann, ds_ann)
        self.assertIsNotNone(comparison)
        self.assertEqual(comparison.geometry_similarity, 1)
        self.assertEqual(
            comparison.conflicting_attribute_names,
            ("color", "size", "style"),
        )
        self.assertEqual(comparison.similarity, 0)

    def test_disabled_attribute_comparison_preserves_geometry_matching(self) -> None:
        settings = ComparisonParameters()
        settings.included_annotation_types = [dm.AnnotationType.bbox]
        settings.compare_attributes = False
        gt_ann = dm.Bbox(10, 10, 20, 20, label=0, attributes={"color": "red"})
        ds_ann = dm.Bbox(10, 10, 20, 20, label=0, attributes={"color": "blue"})
        comparator = Comparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
            settings=settings,
            attribute_matcher=_match_attributes,
        )

        matches, mismatches, gt_unmatched, ds_unmatched, _ = comparator.match_annotations(
            _make_image_item(gt_ann),
            _make_image_item(ds_ann),
        )["all_shape_ann_types"]

        self.assertEqual(matches, [(gt_ann, ds_ann)])
        self.assertFalse(mismatches)
        self.assertFalse(gt_unmatched)
        self.assertFalse(ds_unmatched)

    def test_attributes_can_change_assignment(self) -> None:
        settings = ComparisonParameters()
        settings.included_annotation_types = [dm.AnnotationType.bbox]
        gt_red = dm.Bbox(0, 0, 10, 10, label=0, attributes={"color": "red"})
        gt_blue = dm.Bbox(2, 0, 10, 10, label=0, attributes={"color": "blue"})
        ds_blue = dm.Bbox(0, 0, 10, 10, label=0, attributes={"color": "blue"})
        ds_red = dm.Bbox(2, 0, 10, 10, label=0, attributes={"color": "red"})
        comparator = Comparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
            settings=settings,
            attribute_matcher=_match_attributes,
        )

        matches, mismatches, gt_unmatched, ds_unmatched, _ = comparator.match_annotations(
            _make_image_item(gt_red, gt_blue),
            _make_image_item(ds_blue, ds_red),
        )["all_shape_ann_types"]

        self.assertCountEqual(matches, [(gt_red, ds_red), (gt_blue, ds_blue)])
        self.assertFalse(mismatches)
        self.assertFalse(gt_unmatched)
        self.assertFalse(ds_unmatched)

    def test_label_remains_a_separate_second_matching_stage(self) -> None:
        settings = ComparisonParameters()
        settings.included_annotation_types = [dm.AnnotationType.bbox]
        gt_ann = dm.Bbox(10, 10, 20, 20, label=0, attributes={"color": "red"})
        ds_ann = dm.Bbox(10, 10, 20, 20, label=1, attributes={"color": "red"})
        comparator = Comparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car", "truck"])},
            settings=settings,
            attribute_matcher=_match_attributes,
        )

        matches, mismatches, gt_unmatched, ds_unmatched, _ = comparator.match_annotations(
            _make_image_item(gt_ann),
            _make_image_item(ds_ann),
        )["all_shape_ann_types"]

        self.assertFalse(matches)
        self.assertEqual(mismatches, [(gt_ann, ds_ann)])
        self.assertFalse(gt_unmatched)
        self.assertFalse(ds_unmatched)

    def test_direction_affects_polyline_matching(self) -> None:
        gt_ann = dm.PolyLine([10, 50, 90, 50], label=0)
        ds_ann = dm.PolyLine([90, 50, 10, 50], label=0)

        oriented_settings = ComparisonParameters()
        oriented_settings.included_annotation_types = [dm.AnnotationType.polyline]
        oriented_settings.compare_line_orientation = True
        oriented_comparator = Comparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
            settings=oriented_settings,
        )

        result = oriented_comparator.match_annotations(
            _make_image_item(gt_ann),
            _make_image_item(ds_ann),
        )["all_shape_ann_types"]
        matches, mismatches, gt_unmatched, ds_unmatched, comparisons = result
        self.assertFalse(matches)
        self.assertFalse(mismatches)
        self.assertEqual(gt_unmatched, [gt_ann])
        self.assertEqual(ds_unmatched, [ds_ann])
        comparison = oriented_comparator.get_comparison(comparisons, gt_ann, ds_ann)
        self.assertIsNotNone(comparison)
        self.assertTrue(comparison.direction_mismatch)
        self.assertEqual(comparison.similarity, 0)

        non_oriented_settings = ComparisonParameters()
        non_oriented_settings.included_annotation_types = [dm.AnnotationType.polyline]
        non_oriented_settings.compare_line_orientation = False
        non_oriented_comparator = Comparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
            settings=non_oriented_settings,
        )

        matches, mismatches, gt_unmatched, ds_unmatched, _ = (
            non_oriented_comparator.match_annotations(
                _make_image_item(gt_ann),
                _make_image_item(ds_ann),
            )["all_shape_ann_types"]
        )
        self.assertEqual(matches, [(gt_ann, ds_ann)])
        self.assertFalse(mismatches)
        self.assertFalse(gt_unmatched)
        self.assertFalse(ds_unmatched)
