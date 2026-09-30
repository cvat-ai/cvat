# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import ast
import json
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import datumaro as dm
import numpy as np
from attrs import evolve

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.dataset_manager.bindings import CommonData
from cvat.apps.dataset_manager.data_model.adapters.datumaro import adapt_annotation
from cvat.apps.engine.models import DimensionType
from cvat.apps.quality_control import data_providers, filters, models, quality_handlers
from cvat.apps.quality_control.attribute_comparison import CVAT_ATTRIBUTE_SPEC_IDS_ATTR
from cvat.apps.quality_control.backends import (
    ComparisonSample,
    FrameComparisonSample,
    QualityBackend,
    make_quality_backend,
)
from cvat.apps.quality_control.backends.datumaro import Datumaro2DBackend
from cvat.apps.quality_control.backends.datumaro.matching import Comparator
from cvat.apps.quality_control.comparison_report import ComparisonReport, ComparisonReportParameters
from cvat.apps.quality_control.data_providers import JobDataProvider
from cvat.apps.quality_control.datumaro_data_provider import (
    DatumaroJobDataProvider,
    _MemoizingAnnotationConverterFactory,
)
from cvat.apps.quality_control.matching import (
    AnnotationMatches,
    GroupComparison,
    MatchingResults,
)
from cvat.apps.quality_control.quality_handlers import (
    DatasetQualityEstimator,
    EffectiveQualityRequirement,
    RequirementHandler,
)


def make_requirement(annotation_type="rectangle", **kwargs):
    return EffectiveQualityRequirement(
        name=annotation_type,
        enabled=True,
        filter="",
        annotation_type=annotation_type,
        target_metric=models.QualityTargetMetricType.parse("accuracy"),
        target_metric_threshold=0.8,
        **kwargs,
    )


def make_item(*annotations, frame=0):
    return dm.DatasetItem(
        id=str(frame),
        annotations=annotations,
        media=dm.Image.from_numpy(data=np.zeros((50, 50, 3), dtype=np.uint8)),
    )


def make_provider(job_id, *items, labels=None):
    if labels is None:
        labels = (cdm.Label(10, "car", "any"), cdm.Label(20, "person", "any"))
    categories = dm.LabelCategories()
    for label in labels:
        categories.add(label.name, parent=label.parent)

    provider = DatumaroJobDataProvider.__new__(DatumaroJobDataProvider)
    provider.job_id = job_id
    provider._load_label_catalog = lambda: cdm.LabelCatalog(tuple(labels))
    provider.dm_dataset = dm.Dataset.from_iterable(
        items, categories={dm.AnnotationType.label: categories}
    )
    provider._annotation_memo = _MemoizingAnnotationConverterFactory()
    provider.dm_item_id_to_frame_id = lambda item: int(item.id)

    class JobData(list):
        db_instance = SimpleNamespace(
            segment=SimpleNamespace(task=SimpleNamespace(dimension=DimensionType.DIM_2D))
        )

    provider.job_data = JobData(items)

    def source(annotation):
        if annotation.type == dm.AnnotationType.label:
            return CommonData.Tag(
                frame=0, label=annotation.label, attributes=[], source=None, id=annotation.id
            )
        shape_type = {dm.AnnotationType.bbox: "rectangle"}.get(
            annotation.type, annotation.type.name
        )
        if "track_id" in annotation.attributes:
            return CommonData.TrackedShape(
                type=shape_type,
                frame=0,
                points=[],
                occluded=False,
                outside=False,
                keyframe=False,
                attributes=[],
                track_id=annotation.attributes["track_id"],
                elements=[source(a) for a in getattr(annotation, "elements", ())],
                id=annotation.id,
            )
        return CommonData.LabeledShape(
            type=shape_type,
            frame=0,
            label=annotation.label,
            points=[],
            occluded=False,
            attributes=[],
            source=None,
            id=annotation.id,
            elements=[source(a) for a in getattr(annotation, "elements", ())],
        )

    for item in items:
        for annotation in item.annotations:
            provider._annotation_memo.remember_conversion(source(annotation), [annotation])
    return provider


class TestDatumaroQualityBackend(unittest.TestCase):
    def compare(self, gt_item, ds_item, requirement=None, *, labels=None):
        requirement = requirement or make_requirement()
        gt_provider = make_provider(1, gt_item, labels=labels)
        ds_provider = make_provider(2, ds_item, labels=labels)
        backend = Datumaro2DBackend(ds_provider, gt_provider)
        iterator = backend.iter_samples()
        sample = next(iterator)
        handler = RequirementHandler.for_requirement(requirement, backend=backend)
        result = handler.match_annotations(sample)
        return result, backend, iterator, handler, sample

    def test_matching_and_pairwise_data_preserve_native_results(self):
        factories = {
            "rectangle": lambda label, id: dm.Bbox(1, 1, 10, 10, label=label, id=id),
            "polygon": lambda label, id: dm.Polygon(
                [1, 1, 11, 1, 11, 11, 1, 11], label=label, id=id
            ),
            "mask": lambda label, id: dm.Mask(
                np.ones((50, 50), dtype=bool, order="F"), label=label, id=id
            ),
            "ellipse": lambda label, id: dm.Ellipse(1, 1, 11, 11, label=label, id=id),
            "polyline": lambda label, id: dm.PolyLine([1, 1, 11, 11], label=label, id=id),
            "points": lambda label, id: dm.Points([1, 1, 11, 11], label=label, id=id),
            "tag": lambda label, id: dm.Label(label=label, id=id),
        }
        for target, factory in factories.items():
            for ds_label in (0, 1):
                with self.subTest(target=target, ds_label=ds_label):
                    gt_item = make_item(factory(0, 11))
                    ds_item = make_item(factory(ds_label, 22))
                    requirement = make_requirement(target)
                    result, backend, iterator, handler, sample = self.compare(
                        gt_item, ds_item, requirement
                    )
                    for annotation in (*sample.gt_annotations, *sample.ds_annotations):
                        self.assertIsInstance(annotation, requirement.comparison_annotation_type)
                        self.assertEqual(annotation.annotation_type, target)
                    native = Comparator(
                        backend._gt_provider.dm_dataset.categories(),
                        settings=backend._comparison_parameters(requirement),
                    ).match_annotations(gt_item, ds_item)
                    adapted = backend.compare(
                        sample, requirement=requirement, attribute_matcher=handler._match_attrs
                    )
                    for native_matches, adapted_matches in (
                        (native["all_ann_types"], adapted.all_ann_types),
                        (native["all_shape_ann_types"], adapted.all_shape_ann_types),
                    ):
                        for original, converted in zip(native_matches[:4], adapted_matches[:4]):

                            def ids(objects):
                                return [
                                    tuple(a.id for a in v) if isinstance(v, tuple) else v.id
                                    for v in objects
                                ]

                            self.assertEqual(ids(original), ids(converted))
                        self.assertEqual(
                            list(native_matches[4].values()),
                            list(adapted_matches.comparisons.values()),
                        )
                    for pair in result.matched_pairs:
                        self.assertEqual([a.reference.job_id for a in pair], [1, 2])
                        self.assertEqual([a.reference.obj_id for a in pair], [11, 22])
                    iterator.close()

    def test_conflicts_and_matrix_keep_source_identity(self):
        result, _, iterator, _, _ = self.compare(
            make_item(dm.Bbox(1, 1, 10, 10, label=0, id=11), dm.Bbox(30, 30, 5, 5, label=0, id=12)),
            make_item(dm.Bbox(1, 1, 10, 10, label=1, id=11), dm.Bbox(40, 40, 5, 5, label=1, id=23)),
        )
        conflicts = result.summary.conflicts
        self.assertEqual(
            [str(c.type) for c in conflicts],
            ["missing_annotation", "extra_annotation", "mismatching_label"],
        )
        self.assertEqual(
            [[(a.job_id, a.obj_id) for a in c.annotation_ids] for c in conflicts],
            [[(1, 12)], [(2, 23)], [(2, 11), (1, 11)]],
        )
        np.testing.assert_array_equal(
            result.summary.confusion_matrix.rows, [[0, 0, 0], [1, 0, 1], [1, 0, 0]]
        )
        iterator.close()

    def test_filters_and_attribute_rules_do_not_modify_cached_annotations(self):
        attrs_gt = {"text": "hello", "source": "manual", CVAT_ATTRIBUTE_SPEC_IDS_ATTR: {"text": 50}}
        attrs_ds = {**attrs_gt, "text": "world"}
        gt = make_item(dm.Bbox(1, 1, 10, 10, label=0, id=1, attributes=attrs_gt))
        ds = make_item(dm.Bbox(1, 1, 10, 10, label=0, id=2, attributes=attrs_ds))
        requirement = make_requirement(
            attribute_comparison={"rules": [{"spec_id": 50, "enabled": True}]}
        )
        result, backend, iterator, _, sample = self.compare(gt, ds, requirement)
        self.assertEqual(result.summary.annotation_summary.valid_count, 0)
        self.assertEqual(result.summary.annotation_summary.missing_count, 1)
        self.assertEqual(result.summary.annotation_summary.extra_count, 1)
        requirement.filter = json.dumps(
            {
                "and": [
                    {"==": [{"var": "shape.attribute.name"}, "text"]},
                    {"==": [{"var": "shape.attribute.value"}, "hello"]},
                    {"==": [{"var": "shape.source"}, "manual"]},
                    {"==": [{"var": "shape.type"}, "rectangle"]},
                    {">": [{"var": "shape.area"}, 50]},
                ]
            }
        )
        handler = RequirementHandler.for_requirement(requirement, backend=backend)
        selected, _ = handler._filter_sample(sample)
        self.assertEqual([a.id for a in selected.gt_annotations], [1])
        self.assertEqual(list(selected.ds_annotations), [])
        self.assertEqual(gt.annotations[0].attributes, attrs_gt)
        self.assertEqual(ds.annotations[0].attributes, attrs_ds)
        iterator.close()

    def test_skeleton_preparation_preserves_element_and_track_references(self):
        labels = (
            cdm.Label(10, "person", "skeleton"),
            cdm.Label(11, "head", "points", parent="person"),
        )
        for tracked in (False, True):
            with self.subTest(tracked=tracked):
                attributes = {"source": "manual", **({"track_id": 100} if tracked else {})}
                point = dm.Points(
                    [10, 10], label=1, id=20, attributes={"track_id": 200} if tracked else {}
                )
                skeleton = dm.Skeleton([point], label=0, id=10, attributes=attributes)
                provider = make_provider(1, make_item(skeleton), labels=labels)
                backend = Datumaro2DBackend(provider, provider)
                iterator = backend.iter_samples()
                original = next(iterator)
                prepared = backend.prepare_sample(
                    original,
                    requirement_type=models.QualityRequirementAnnotationType.SKELETON_KEYPOINT,
                )
                view = prepared.gt_annotations[0]
                self.assertIsInstance(view, cdm.Points)
                self.assertEqual(
                    view.reference,
                    cdm.AnnotationReference(
                        200 if tracked else 20, 1, "track" if tracked else "shape", "points"
                    ),
                )
                self.assertEqual(view.source, "manual")
                self.assertEqual(point.group, 0)
                requirement = make_requirement("skeleton_keypoint")
                requirement.filter = json.dumps({"==": [{"var": "shape.skeleton.label"}, "person"]})
                handler = RequirementHandler.for_requirement(requirement, backend=backend)
                selected, _ = handler._filter_sample(prepared)
                self.assertEqual(list(selected.gt_annotations), [view])
                iterator.close()

    def test_empty_sample_and_report_round_trip(self):
        for gt_item, ds_item in (
            (make_item(), make_item()),
            (make_item(), make_item(dm.Label(label=0, id=1))),
        ):
            with self.subTest(ds_count=len(ds_item.annotations)):
                gt = make_provider(1, gt_item)
                ds = make_provider(2, ds_item)
                report = DatasetQualityEstimator(
                    ds,
                    gt,
                    requirements=[make_requirement("tag")],
                    report_parameters=ComparisonReportParameters(),
                ).generate_report()
                restored = ComparisonReport.from_json(report.to_json())
                self.assertEqual(json.loads(report.to_json()), json.loads(restored.to_json()))
                self.assertEqual(report.comparison_summary.frames, [0])
                summary = report.groups["tag"].comparison_summary
                self.assertEqual(
                    str(summary.calculation.status),
                    "computed" if ds_item.annotations else "not_computed",
                )
                self.assertEqual(summary.score, 0 if ds_item.annotations else None)

    def test_provider_cleanup_does_not_materialize_a_dataset(self):
        provider = DatumaroJobDataProvider.__new__(DatumaroJobDataProvider)
        provider._annotation_memo = _MemoizingAnnotationConverterFactory()
        with mock.patch(
            "cvat.apps.quality_control.datumaro_data_provider.GetCVATDataExtractor",
            side_effect=AssertionError,
        ):
            provider.close()
            provider.close()
        self.assertNotIn("dm_dataset", provider.__dict__)
        self.assertNotIn("dataset", provider.__dict__)

    def test_provider_returns_cdm_data_and_direct_source_references(self):
        provider = make_provider(2, make_item(dm.Bbox(1, 1, 10, 10, id=11, label=0)))
        dataset = provider.dataset
        self.assertIsInstance(dataset, cdm.Dataset)
        self.assertIs(provider.dataset, dataset)
        self.assertIs(provider.label_catalog, dataset.label_catalog)
        annotation = next(iter(dataset)).annotations[0]
        self.assertIsInstance(annotation, cdm.Annotation)
        self.assertIs(annotation.reference.type, cdm.AnnotationReferenceType.SHAPE)
        self.assertEqual((annotation.reference.job_id, annotation.reference.obj_id), (2, 11))
        provider.close()
        self.assertNotIn("dataset", provider.__dict__)
        self.assertNotIn("dm_dataset", provider.__dict__)
        self.assertEqual(provider._annotation_memo._annotation_mapping, {})

    def test_group_and_coverage_checks_use_original_references(self):
        gt = make_item(
            dm.Bbox(0, 0, 20, 20, id=1, label=0, group=1),
            dm.Bbox(30, 30, 10, 10, id=2, label=0, group=1),
        )
        ds = make_item(
            dm.Bbox(0, 0, 20, 20, id=11, label=0),
            dm.Bbox(30, 30, 10, 10, id=12, label=0),
        )
        result, _, iterator, _, _ = self.compare(gt, ds)
        self.assertEqual(
            [c.type for c in result.summary.conflicts],
            [models.AnnotationConflictType.MISMATCHING_GROUPS],
        )
        self.assertEqual(result.summary.annotation_summary.valid_count, 2)
        iterator.close()

        # z_order determines which annotation is covered. It is not a filter or
        # matching attribute, and the covered object's server ID must survive.
        result, _, iterator, _, _ = self.compare(
            make_item(),
            make_item(
                dm.Bbox(5, 5, 5, 5, id=13, label=0, z_order=0),
                dm.Bbox(0, 0, 20, 20, id=14, label=0, z_order=1),
            ),
        )
        covered = [
            c
            for c in result.summary.conflicts
            if c.type == models.AnnotationConflictType.COVERED_ANNOTATION
        ]
        self.assertEqual(
            [[(a.job_id, a.obj_id) for a in c.annotation_ids] for c in covered], [[(2, 13)]]
        )
        iterator.close()

    def test_disabled_group_and_coverage_checks_skip_backend_computations(self):
        with (
            mock.patch.object(Comparator, "find_groups") as find_groups,
            mock.patch.object(Comparator, "find_covered") as find_covered,
        ):
            result, _, iterator, _, _ = self.compare(
                make_item(dm.Bbox(0, 0, 20, 20, id=1, label=0)),
                make_item(dm.Bbox(0, 0, 20, 20, id=11, label=0)),
                make_requirement(compare_groups=False, check_covered_annotations=False),
            )
            try:
                self.assertEqual(result.summary.conflicts, [])
                find_groups.assert_not_called()
                find_covered.assert_not_called()
            finally:
                iterator.close()

    def test_skeleton_and_keypoint_targets_keep_distinct_matching_units(self):
        labels = (
            cdm.Label(10, "person", "skeleton"),
            cdm.Label(11, "head", "points", parent="person"),
            cdm.Label(12, "foot", "points", parent="person"),
        )

        def skeleton(annotation_id):
            return dm.Skeleton(
                [
                    dm.Points([10, 10], label=1, id=annotation_id + 1),
                    dm.Points([20, 20], label=2, id=annotation_id + 2),
                ],
                label=0,
                id=annotation_id,
            )

        for target, count in (("skeleton", 1), ("skeleton_keypoint", 2)):
            with self.subTest(target=target):
                result, _, iterator, _, _ = self.compare(
                    make_item(skeleton(10)),
                    make_item(skeleton(20)),
                    make_requirement(target),
                    labels=labels,
                )
                self.assertEqual(result.summary.annotation_summary.valid_count, count)
                self.assertEqual(len(result.matched_pairs), count)
                self.assertEqual(result.summary.conflicts, [])
                iterator.close()

    def test_multiple_requirements_and_frames_preserve_sources_and_counts(self):
        gt = make_provider(
            1,
            make_item(dm.Bbox(1, 1, 10, 10, id=1, label=0)),
            make_item(dm.Label(id=2, label=1), frame=1),
        )
        ds = make_provider(
            2,
            make_item(dm.Bbox(1, 1, 10, 10, id=11, label=0)),
            make_item(dm.Label(id=12, label=1), frame=1),
        )
        report = DatasetQualityEstimator(
            ds,
            gt,
            requirements=[make_requirement(), make_requirement("tag")],
            report_parameters=ComparisonReportParameters(),
        ).generate_report()
        self.assertEqual(report.comparison_summary.frames, [0, 1])
        for target in ("rectangle", "tag"):
            self.assertEqual(report.groups[target].comparison_summary.score, 1)
        self.assertEqual(report.get_conflicts(), [])
        self.assertEqual(len(list(ds.dm_dataset)[0].annotations), 1)

    def test_total_samples_counts_the_job_not_only_compared_frames(self):
        gt = make_provider(1, make_item(frame=1))
        ds = make_provider(2, make_item(frame=1))
        ds.job_data.extend([None] * 9)
        backend = Datumaro2DBackend(ds, gt)
        self.assertEqual(ds.total_samples, 10)
        self.assertEqual(backend.total_samples, 10)
        self.assertEqual(len(list(backend.iter_samples())), 1)

        report = DatasetQualityEstimator(
            ds,
            gt,
            requirements=[make_requirement()],
            report_parameters=ComparisonReportParameters(),
        ).generate_report()
        summary = json.loads(report.to_json())["comparison_summary"]
        self.assertEqual(summary["total_frames"], 10)
        self.assertEqual(summary["frames"], [1])
        self.assertNotIn("total_samples", summary)

    def test_backend_releases_sample_state_after_comparison_error(self):
        gt = make_provider(1, make_item())
        ds = make_provider(2, make_item())
        estimator = DatasetQualityEstimator(
            ds,
            gt,
            requirements=[make_requirement()],
            report_parameters=ComparisonReportParameters(),
        )
        with mock.patch.object(
            estimator._backend, "compare", side_effect=RuntimeError("comparison failed")
        ):
            with self.assertRaisesRegex(RuntimeError, "comparison failed"):
                estimator.generate_report()
        self.assertEqual(estimator._backend._views, {})
        self.assertIsNone(estimator._backend._native_items)

    def test_audio_is_not_enabled_by_the_new_contract(self):
        provider = mock.Mock()
        provider.dimension = DimensionType.DIM_1D
        with self.assertRaisesRegex(ValueError, "only supported for 2D"):
            make_quality_backend(provider, provider)


class TestQualityBackendBoundary(unittest.TestCase):
    def test_frame_sample_requires_a_frame_and_preserves_it_when_filtered(self):
        with self.assertRaises(TypeError):
            FrameComparisonSample((), (), frame_id=None)
        sample = FrameComparisonSample((), (), frame_id=7)
        filtered = evolve(sample, ds_annotations=[])
        self.assertIsInstance(filtered, FrameComparisonSample)
        self.assertEqual(filtered.frame_id, 7)

    def test_frame_report_rejects_a_generic_sample_and_closes_backend(self):
        backend = mock.Mock(spec=QualityBackend)
        backend.iter_samples.return_value = iter([ComparisonSample((), ())])
        with mock.patch.object(quality_handlers, "make_quality_backend", return_value=backend):
            estimator = DatasetQualityEstimator(
                mock.Mock(),
                mock.Mock(),
                requirements=[],
                report_parameters=ComparisonReportParameters(),
            )
        with self.assertRaisesRegex(ValueError, "Only frame comparison reports"):
            estimator.generate_report()
        backend.close.assert_called_once_with()

    def test_filters_accept_new_annotation_types_and_their_subclasses(self):
        class Event(cdm.Annotation):
            annotation_type = "event"
            id = 1
            label = None
            attributes = {}
            reference = cdm.AnnotationReference(1, 1, "tag")
            source = None
            group = 0
            score = 1.0

        class DerivedEvent(Event):
            pass

        annotation_filter = filters.RequirementJsonLogicFilter(
            expression=json.dumps({"==": [{"var": "shape.type"}, "event"]}),
            catalog=cdm.LabelCatalog(()),
            included_annotation_types=[Event],
        )
        event = DerivedEvent()
        self.assertTrue(annotation_filter.matches_annotation(event))
        self.assertIsNone(annotation_filter.build_shape_context_for_annotation(event).area)
        tag = adapt_annotation(dm.Label(label=0), reference_getter=mock.Mock())
        self.assertFalse(annotation_filter.matches_annotation(tag))

    def test_filters_preserve_area_for_2d_annotations_and_none_for_other_types(self):
        annotation_filter = filters.RequirementJsonLogicFilter(
            expression="",
            catalog=cdm.LabelCatalog(()),
            included_annotation_types=[cdm.Annotation],
        )
        for native, expected_area in (
            (dm.Bbox(1, 2, 10, 20), 200),
            (dm.PolyLine([0, 0, 10, 20]), 0),
            (dm.Label(label=0), None),
            (dm.Cuboid3d(position=[0, 0, 0]), None),
        ):
            with self.subTest(annotation_type=native.type):
                annotation = adapt_annotation(native, reference_getter=mock.Mock())
                context = annotation_filter.build_shape_context_for_annotation(annotation)
                self.assertEqual(context.area, expected_area)

    def test_backend_requires_an_implementation(self):
        self.assertRaises(TypeError, QualityBackend)
        self.assertRaises(TypeError, JobDataProvider, 1)

    def test_common_handler_accepts_annotations_without_native_geometry(self):
        class PlainAnnotation(cdm.Rectangle):
            id = 1
            label = 0
            attributes = {}
            reference = cdm.AnnotationReference(1, 1, "shape", "rectangle")
            source = None
            group = 0
            score = 1.0

            def get_area(self):
                return 100.0

        gt = PlainAnnotation()
        ds = PlainAnnotation()
        ds.id = 2
        ds.reference = cdm.AnnotationReference(2, 2, "shape", "rectangle")
        backend = mock.Mock()
        backend.catalog = cdm.LabelCatalog((cdm.Label(1, "car", "rectangle"),))
        backend.ignored_attributes = ()
        backend.prepare_sample.side_effect = lambda sample, **kwargs: sample
        backend.compare.return_value = MatchingResults(
            all_ann_types=AnnotationMatches([(gt, ds)], [], [], [], {}),
            all_shape_ann_types=AnnotationMatches([(gt, ds)], [], [], [], {}),
            covered_annotations=[],
            group_comparisons=[],
        )
        handler = RequirementHandler.for_requirement(make_requirement(), backend=backend)
        result = handler.match_annotations(FrameComparisonSample([gt], [ds], frame_id=0))
        self.assertEqual(result.summary.score, 1)
        self.assertEqual(result.summary.conflicts, [])

    def test_handler_builds_group_and_coverage_conflicts_from_comparison_data(self):
        class PlainAnnotation(cdm.Rectangle):
            id = 1
            label = 0
            attributes = {}
            reference = cdm.AnnotationReference(1, 1, "shape", "rectangle")
            source = None
            group = 0
            score = 1.0

            def get_area(self):
                return 100.0

        gt = PlainAnnotation()
        ds = PlainAnnotation()
        ds.id = 2
        ds.reference = cdm.AnnotationReference(2, 2, "shape", "rectangle")
        backend = mock.Mock()
        backend.catalog = cdm.LabelCatalog((cdm.Label(1, "car", "rectangle"),))
        backend.ignored_attributes = ()
        backend.prepare_sample.side_effect = lambda sample, **kwargs: sample
        handler = RequirementHandler.for_requirement(make_requirement(), backend=backend)

        for gt_size, ds_size, groups_match, expected_conflict in (
            (1, 1, True, False),
            (2, 2, True, False),
            (2, 3, True, False),
            (1, 2, True, True),
            (2, 2, False, True),
            (1, 2, False, True),
        ):
            with self.subTest(gt_size=gt_size, ds_size=ds_size, groups_match=groups_match):
                backend.compare.return_value = MatchingResults(
                    all_ann_types=AnnotationMatches([(gt, ds)], [], [], [], {}),
                    all_shape_ann_types=AnnotationMatches([(gt, ds)], [], [], [], {}),
                    covered_annotations=[ds],
                    group_comparisons=[GroupComparison(gt, ds, gt_size, ds_size, groups_match)],
                )
                result = handler.match_annotations(FrameComparisonSample([gt], [ds], frame_id=7))
                conflicts = result.summary.conflicts
                expected_types = [models.AnnotationConflictType.COVERED_ANNOTATION]
                if expected_conflict:
                    expected_types.append(models.AnnotationConflictType.MISMATCHING_GROUPS)
                self.assertEqual([c.type for c in conflicts], expected_types)
                self.assertTrue(all(c.frame_id == 7 for c in conflicts))
                self.assertEqual(
                    [(a.job_id, a.obj_id) for a in conflicts[0].annotation_ids], [(2, 2)]
                )
                if expected_conflict:
                    self.assertEqual(
                        [(a.job_id, a.obj_id) for a in conflicts[1].annotation_ids],
                        [(2, 2), (1, 1)],
                    )

    def test_shared_modules_do_not_import_datumaro(self):
        for module in (data_providers, filters, quality_handlers):
            with self.subTest(module=module.__name__):
                tree = ast.parse(Path(module.__file__).read_text())
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        self.assertFalse(
                            any(alias.name.startswith("datumaro") for alias in node.names)
                        )
                    elif isinstance(node, ast.ImportFrom):
                        self.assertFalse((node.module or "").startswith("datumaro"))
