# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import unittest
from typing import cast

import datumaro as dm
import numpy as np

from cvat.apps.quality_control.backends.datumaro import Datumaro2DBackend
from cvat.apps.quality_control.backends.datumaro.matching import (
    AttributeMatchingResult,
    Comparator,
    ComparisonParameters,
    DistanceComparator,
)
from cvat.apps.quality_control.matching import PairwiseComparison, match_segments
from cvat.apps.quality_control.models import (
    PointSizeBase,
    QualityRequirement,
    QualityRequirementAnnotationType,
    ShapeSimilarityMetricType,
)
from cvat.apps.quality_control.quality_handlers import (
    EffectiveQualityRequirement,
    resolve_effective_requirement,
)


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
    def test_zero_iou_is_not_matched_at_a_zero_threshold(self):
        matches, mismatches, missing, extra = match_segments(
            [0],
            [0],
            distance=lambda a, b: 0,
            dist_thresh=lambda a: 0,
            label_matcher=lambda a, b: True,
        )
        self.assertEqual((matches, mismatches, missing, extra), ([], [], [0], [0]))

    def test_individual_thresholds_are_applied_before_assignment(self):
        similarities = [[0.89, 0.6], [0.91, 0.89]]
        matches, mismatches, missing, extra = match_segments(
            [0, 1],
            [0, 1],
            distance=lambda a, b: similarities[a][b],
            dist_thresh=lambda a: [0.4, 0.9][a],
            label_matcher=lambda a, b: True,
        )
        self.assertEqual(matches, [(0, 1), (1, 0)])
        self.assertFalse(mismatches or missing or extra)

    def test_individual_thresholds_follow_gt_in_the_second_label_pass(self):
        matches, mismatches, missing, extra = match_segments(
            [0, 1],
            [0, 1],
            distance=lambda a, b: 0.6 if a == b else 0,
            dist_thresh=lambda a: [0.4, 0.9][a],
            label_matcher=lambda a, b: a == b == 1,
        )
        self.assertEqual(matches, [])
        self.assertEqual(mismatches, [(0, 0)])
        self.assertEqual(missing, [1])
        self.assertEqual(extra, [1])

    @staticmethod
    def _make_comparator() -> Comparator:
        return Comparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
            settings=ComparisonParameters(),
        )

    def test_mask_only_comparator_matches_masks(self) -> None:
        mask = np.zeros((8, 8), dtype=bool)
        mask[2:6, 2:6] = True
        settings = ComparisonParameters(
            annotation_type=dm.AnnotationType.mask, similarity_metric=ShapeSimilarityMetricType.IOU
        )

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

    def test_masks_and_polygons_are_compared_separately(self) -> None:
        mask = np.zeros((100, 100), dtype=bool)
        mask[20:60, 20:60] = True
        gt_mask = dm.Mask(np.asfortranarray(mask), label=0)
        gt_polygon = dm.Polygon([20, 20, 60, 20, 60, 60, 20, 60], label=0)
        ds_mask = dm.Mask(np.asfortranarray(mask.copy()), label=0)
        ds_polygon = dm.Polygon([20, 20, 60, 20, 60, 60, 20, 60], label=0)

        for annotation_type, gt_ann, ds_ann in [
            (dm.AnnotationType.mask, gt_mask, ds_mask),
            (dm.AnnotationType.polygon, gt_polygon, ds_polygon),
        ]:
            with self.subTest(annotation_type=annotation_type.name):
                comparator = DistanceComparator(
                    {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
                    settings=ComparisonParameters(
                        annotation_type=annotation_type,
                        similarity_metric=ShapeSimilarityMetricType.IOU,
                    ),
                    return_comparisons=True,
                )

                results = comparator.match_annotations(
                    _make_image_item(gt_mask, gt_polygon),
                    _make_image_item(ds_mask, ds_polygon),
                )
                self.assertEqual(list(results), [annotation_type])
                matches, mismatches, gt_unmatched, ds_unmatched, _ = results[annotation_type]

                self.assertEqual(matches, [(gt_ann, ds_ann)])
                self.assertFalse(mismatches)
                self.assertFalse(gt_unmatched)
                self.assertFalse(ds_unmatched)

    def test_distance_comparator_returns_pairwise_comparisons(self) -> None:
        gt_ann = dm.Bbox(10, 10, 20, 20, label=0)
        ds_ann = dm.Bbox(10, 10, 20, 20, label=0)
        comparator = DistanceComparator(
            {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])},
            settings=ComparisonParameters(
                annotation_type=dm.AnnotationType.bbox,
                similarity_metric=ShapeSimilarityMetricType.IOU,
            ),
            return_comparisons=True,
        )

        result = comparator.match_boxes(
            _make_image_item(gt_ann),
            _make_image_item(ds_ann),
        )
        comparisons = cast(dict[tuple[int, int], PairwiseComparison], result[4])

        comparison = comparisons[(id(gt_ann), id(ds_ann))]
        self.assertIsInstance(comparison, PairwiseComparison)
        self.assertEqual(comparison.similarity, 1)

    def test_point_size_base_changes_grouped_point_matching(self) -> None:
        categories = {
            dm.AnnotationType.label: dm.LabelCategories.from_iterable(["first", "second"])
        }
        gt_item = _make_image_item(
            dm.Points([10, 10], label=0, group=1),
            dm.Points([20, 20], label=1, group=1),
        )
        ds_item = _make_image_item(
            dm.Points([15, 15], label=0, group=1),
            dm.Points([25, 25], label=1, group=1),
        )

        image_size_results = DistanceComparator(
            categories,
            settings=ComparisonParameters(
                annotation_type=dm.AnnotationType.points,
                similarity_metric=ShapeSimilarityMetricType.OKS,
                oks_threshold=0.4,
                oks_sigma=0.09,
                point_size_base=PointSizeBase.IMAGE_SIZE,
            ),
        ).match_points(gt_item, ds_item)
        group_bbox_results = DistanceComparator(
            categories,
            settings=ComparisonParameters(
                annotation_type=dm.AnnotationType.points,
                similarity_metric=ShapeSimilarityMetricType.OKS,
                oks_threshold=0.4,
                oks_sigma=0.09,
                point_size_base=PointSizeBase.GROUP_BBOX_SIZE,
            ),
        ).match_points(gt_item, ds_item)

        self.assertEqual(len(image_size_results[0]), 2)
        self.assertFalse(image_size_results[2])
        self.assertFalse(image_size_results[3])
        self.assertFalse(group_bbox_results[0])
        self.assertEqual(len(group_bbox_results[2]), 2)
        self.assertEqual(len(group_bbox_results[3]), 2)

    def test_attributes_affect_matching_and_pairwise_diagnostics(self) -> None:
        settings = ComparisonParameters(
            annotation_type=dm.AnnotationType.bbox, similarity_metric=ShapeSimilarityMetricType.IOU
        )
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
        settings = ComparisonParameters(
            annotation_type=dm.AnnotationType.bbox, similarity_metric=ShapeSimilarityMetricType.IOU
        )
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
        settings = ComparisonParameters(
            annotation_type=dm.AnnotationType.bbox, similarity_metric=ShapeSimilarityMetricType.IOU
        )
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
        settings = ComparisonParameters(
            annotation_type=dm.AnnotationType.bbox, similarity_metric=ShapeSimilarityMetricType.IOU
        )
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

        oriented_settings = ComparisonParameters(
            annotation_type=dm.AnnotationType.polyline,
            similarity_metric=ShapeSimilarityMetricType.IOU,
        )
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

        non_oriented_settings = ComparisonParameters(
            annotation_type=dm.AnnotationType.polyline,
            similarity_metric=ShapeSimilarityMetricType.IOU,
        )
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


class TestBoundaryFComparison(unittest.TestCase):
    CATEGORIES = {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])}

    def _compare(self, annotation_type: dm.AnnotationType, gt_anns, ds_anns, **settings):
        parameters = ComparisonParameters(
            annotation_type=annotation_type,
            similarity_metric=ShapeSimilarityMetricType.BOUNDARY_F,
            **settings,
        )
        comparator = Comparator(self.CATEGORIES, settings=parameters)
        return (
            comparator,
            comparator.match_annotations(_make_image_item(*gt_anns), _make_image_item(*ds_anns))[
                "all_shape_ann_types"
            ],
        )

    def _similarity(self, comparator: Comparator, comparisons, gt_ann, ds_ann) -> float:
        return comparator.get_comparison(comparisons, gt_ann, ds_ann).similarity

    def test_can_match_thin_objects_without_overlap(self) -> None:
        # 2px wide poles, 1px apart: no overlap, IoU can't match them
        gt_ann = dm.Bbox(20, 10, 2, 60, label=0)
        ds_ann = dm.Bbox(23, 10, 2, 60, label=0)

        iou_comparator = Comparator(
            self.CATEGORIES,
            settings=ComparisonParameters(
                annotation_type=dm.AnnotationType.bbox,
                similarity_metric=ShapeSimilarityMetricType.IOU,
            ),
        )
        matches, *_ = iou_comparator.match_annotations(
            _make_image_item(gt_ann), _make_image_item(ds_ann)
        )["all_shape_ann_types"]
        self.assertFalse(matches)

        _, (matches, mismatches, gt_unmatched, ds_unmatched, _) = self._compare(
            dm.AnnotationType.bbox, [gt_ann], [ds_ann]
        )
        self.assertEqual(matches, [(gt_ann, ds_ann)])
        self.assertFalse(mismatches or gt_unmatched or ds_unmatched)

    def test_can_match_objects_within_tolerance_with_strict_threshold(self) -> None:
        # no overlap, but the boundaries are within the tolerance: Boundary F is 1
        gt_ann = dm.Bbox(20, 10, 2, 60, label=0)
        ds_ann = dm.Bbox(23, 10, 2, 60, label=0)

        comparator, (matches, _, _, _, comparisons) = self._compare(
            dm.AnnotationType.bbox, [gt_ann], [ds_ann], boundary_f_threshold=0.99
        )
        self.assertEqual(matches, [(gt_ann, ds_ann)])
        self.assertEqual(self._similarity(comparator, comparisons, gt_ann, ds_ann), 1)


    def test_boundary_errors_beyond_tolerance_reduce_similarity(self) -> None:
        gt_ann = dm.Polygon([20, 20, 60, 20, 60, 60, 20, 60], label=0)
        ds_ann = dm.Polygon([30, 20, 70, 20, 70, 60, 30, 60], label=0)  # 10px shift

        comparator, (matches, _, _, _, comparisons) = self._compare(
            dm.AnnotationType.polygon, [gt_ann], [ds_ann]
        )
        self.assertFalse(matches)
        self.assertLess(self._similarity(comparator, comparisons, gt_ann, ds_ann), 0.8)

        comparator, (matches, _, _, _, comparisons) = self._compare(
            dm.AnnotationType.polygon, [gt_ann], [ds_ann], boundary_f_tolerance=10
        )
        self.assertEqual(matches, [(gt_ann, ds_ann)])

    def test_compares_masks_by_the_region_boundary(self) -> None:
        gt_mask = np.zeros((100, 100), dtype=bool)
        gt_mask[20:60, 20:60] = True
        gt_mask[28:52, 28:52] = False  # a 24x24 hole, 8px from the outer boundary
        ds_mask = np.zeros((100, 100), dtype=bool)
        ds_mask[21:61, 20:60] = True
        gt_ann = dm.Mask(np.asfortranarray(gt_mask), label=0)
        ds_ann = dm.Mask(np.asfortranarray(ds_mask), label=0)

        # the missed hole boundary is farther than the tolerance from the DS boundary
        comparator, (matches, _, _, _, comparisons) = self._compare(
            dm.AnnotationType.mask, [gt_ann], [ds_ann]
        )
        self.assertFalse(matches)
        self.assertLess(self._similarity(comparator, comparisons, gt_ann, ds_ann), 0.8)

        comparator, (matches, _, _, _, comparisons) = self._compare(
            dm.AnnotationType.mask, [gt_ann], [ds_ann], boundary_f_tolerance=15
        )
        self.assertEqual(matches, [(gt_ann, ds_ann)])

    def test_compares_lines_by_length(self) -> None:
        gt_ann = dm.PolyLine([10, 50, 90, 50], label=0)
        half_ann = dm.PolyLine([10, 50, 50, 50], label=0)

        comparator, (matches, _, _, _, comparisons) = self._compare(
            dm.AnnotationType.polyline, [gt_ann], [half_ann]
        )
        self.assertFalse(matches)
        # P = 1, R ~ (40 + c) / 80
        self.assertAlmostEqual(
            self._similarity(comparator, comparisons, gt_ann, half_ann), 0.72, delta=0.03
        )

    def test_checks_line_orientation_separately(self) -> None:
        gt_ann = dm.PolyLine([10, 50, 90, 50], label=0)
        reversed_ann = dm.PolyLine([90, 52, 10, 52], label=0)

        comparator, (matches, _, _, ds_unmatched, comparisons) = self._compare(
            dm.AnnotationType.polyline, [gt_ann], [reversed_ann], compare_line_orientation=True
        )
        comparison = comparator.get_comparison(comparisons, gt_ann, reversed_ann)
        self.assertFalse(matches)
        self.assertEqual(ds_unmatched, [reversed_ann])
        self.assertTrue(comparison.direction_mismatch)
        self.assertAlmostEqual(comparison.geometry_similarity, 1, places=6)

        comparator, (matches, _, _, _, comparisons) = self._compare(
            dm.AnnotationType.polyline, [gt_ann], [reversed_ann], compare_line_orientation=False
        )
        self.assertEqual(matches, [(gt_ann, reversed_ann)])
        self.assertAlmostEqual(
            self._similarity(comparator, comparisons, gt_ann, reversed_ann), 1, places=6
        )

    def test_uses_boundary_tolerance_as_line_thickness_in_orientation_check(self) -> None:
        gt_ann = dm.PolyLine([10, 50, 90, 50], label=0)
        reversed_ann = dm.PolyLine([90, 52, 10, 52], label=0)

        # with this line thickness, the line IoU would be ~0 in both directions
        comparator, (_, _, _, _, comparisons) = self._compare(
            dm.AnnotationType.polyline,
            [gt_ann],
            [reversed_ann],
            compare_line_orientation=True,
            line_thickness=1e-6,
        )
        self.assertTrue(
            comparator.get_comparison(comparisons, gt_ann, reversed_ann).direction_mismatch
        )

    def test_is_not_supported_for_points(self) -> None:
        with self.assertRaises(AssertionError):
            Comparator(
                self.CATEGORIES,
                settings=ComparisonParameters(
                    annotation_type=dm.AnnotationType.points,
                    similarity_metric=ShapeSimilarityMetricType.BOUNDARY_F,
                ),
            )


class TestSimilarityMetricSelection(unittest.TestCase):
    CATEGORIES = {dm.AnnotationType.label: dm.LabelCategories.from_iterable(["car"])}

    def test_rejects_unsupported_metrics(self) -> None:
        for annotation_type, metric in [
            (dm.AnnotationType.points, ShapeSimilarityMetricType.IOU),
            (dm.AnnotationType.skeleton, ShapeSimilarityMetricType.BOUNDARY_F),
            (dm.AnnotationType.bbox, ShapeSimilarityMetricType.OKS),
            (dm.AnnotationType.bbox, ShapeSimilarityMetricType.EQUALITY),
            (dm.AnnotationType.label, ShapeSimilarityMetricType.IOU),
        ]:
            with self.subTest(annotation_type=annotation_type.name, metric=metric):
                with self.assertRaises(AssertionError):
                    DistanceComparator(
                        self.CATEGORIES,
                        settings=ComparisonParameters(
                            annotation_type=annotation_type, similarity_metric=metric
                        ),
                    )

    def test_points_use_the_oks_threshold(self) -> None:
        gt_ann = dm.Points([20, 20, 60, 60], label=0)
        ds_ann = dm.Points([22, 21, 61, 62], label=0)

        def match(**settings):
            comparator = DistanceComparator(
                self.CATEGORIES,
                settings=ComparisonParameters(
                    annotation_type=dm.AnnotationType.points,
                    similarity_metric=ShapeSimilarityMetricType.OKS,
                    **settings,
                ),
                return_comparisons=True,
            )
            matches, _, _, _, comparisons = comparator.match_points(
                _make_image_item(gt_ann), _make_image_item(ds_ann)
            )
            return matches, comparisons[(id(gt_ann), id(ds_ann))].similarity

        matches, similarity = match(oks_threshold=0.1, iou_threshold=0.99)
        self.assertEqual(matches, [(gt_ann, ds_ann)])

        matches, _ = match(oks_threshold=min(1, similarity + 0.01), iou_threshold=0.01)
        self.assertFalse(matches)

    @staticmethod
    def _effective_requirement(annotation_type, **overrides) -> EffectiveQualityRequirement:
        "A base requirement with the default settings for the annotation type"
        return resolve_effective_requirement(
            QualityRequirement(
                **{
                    **QualityRequirement.get_base_defaults(annotation_type),
                    "name": "base",
                    "annotation_type": annotation_type,
                    "enabled": True,
                    **overrides,
                }
            )
        )

    def test_default_similarity_metric_depends_on_the_requirement_type(self) -> None:
        for annotation_type, expected_metric in [
            (QualityRequirementAnnotationType.TAG, ShapeSimilarityMetricType.EQUALITY),
            (QualityRequirementAnnotationType.POINTS, ShapeSimilarityMetricType.OKS),
            (QualityRequirementAnnotationType.SKELETON, ShapeSimilarityMetricType.OKS),
            (QualityRequirementAnnotationType.SKELETON_KEYPOINT, ShapeSimilarityMetricType.OKS),
            (QualityRequirementAnnotationType.RECTANGLE, ShapeSimilarityMetricType.IOU),
            (QualityRequirementAnnotationType.POLYGON, ShapeSimilarityMetricType.IOU),
            (QualityRequirementAnnotationType.MASK, ShapeSimilarityMetricType.IOU),
            (QualityRequirementAnnotationType.POLYLINE, ShapeSimilarityMetricType.IOU),
            (QualityRequirementAnnotationType.ELLIPSE, ShapeSimilarityMetricType.IOU),
        ]:
            with self.subTest(annotation_type=annotation_type):
                self.assertEqual(
                    QualityRequirement.get_base_defaults(annotation_type)["similarity_metric"],
                    expected_metric,
                )

                requirement = self._effective_requirement(annotation_type)
                self.assertEqual(requirement.similarity_metric, expected_metric)

    def test_root_requirement_must_define_the_similarity_metric(self) -> None:
        with self.assertRaisesRegex(ValueError, "similarity_metric"):
            self._effective_requirement(
                QualityRequirementAnnotationType.RECTANGLE, similarity_metric=None
            )

    def test_backend_compares_tags_by_equality(self) -> None:
        requirement = self._effective_requirement(QualityRequirementAnnotationType.TAG)
        settings = Datumaro2DBackend._comparison_parameters(requirement)
        self.assertEqual(settings.annotation_type, dm.AnnotationType.label)
        self.assertEqual(settings.similarity_metric, ShapeSimilarityMetricType.EQUALITY)

        comparator = Comparator(self.CATEGORIES, settings=settings)
        matches, *_ = comparator.match_annotations(
            _make_image_item(dm.Label(0)), _make_image_item(dm.Label(0))
        )["all_ann_types"]
        self.assertEqual(len(matches), 1)

    def test_backend_compares_points_by_oks(self) -> None:
        for annotation_type, expected_type in [
            (QualityRequirementAnnotationType.POINTS, dm.AnnotationType.points),
            (QualityRequirementAnnotationType.SKELETON, dm.AnnotationType.skeleton),
        ]:
            with self.subTest(annotation_type=annotation_type):
                requirement = self._effective_requirement(
                    annotation_type, oks_threshold=0.6, iou_threshold=0.3
                )
                settings = Datumaro2DBackend._comparison_parameters(requirement)
                self.assertEqual(settings.annotation_type, expected_type)
                self.assertEqual(settings.similarity_metric, ShapeSimilarityMetricType.OKS)
                self.assertEqual(settings.oks_threshold, 0.6)

    def test_backend_uses_the_requirement_metric(self) -> None:
        requirement = self._effective_requirement(
            QualityRequirementAnnotationType.RECTANGLE,
            similarity_metric=ShapeSimilarityMetricType.BOUNDARY_F,
        )
        settings = Datumaro2DBackend._comparison_parameters(requirement)
        self.assertEqual(settings.similarity_metric, ShapeSimilarityMetricType.BOUNDARY_F)
