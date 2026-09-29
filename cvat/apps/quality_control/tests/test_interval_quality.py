# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import unittest
from datetime import timedelta
from types import SimpleNamespace
from unittest import mock

from attrs import evolve

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.dataset_manager.bindings import CommonData
from cvat.apps.quality_control import models
from cvat.apps.quality_control.attribute_comparison import CVAT_ATTRIBUTE_SPEC_IDS_ATTR
from cvat.apps.quality_control.comparison_report import ComparisonReport, ComparisonReportParameters
from cvat.apps.quality_control.filters import RequirementJsonLogicFilter
from cvat.apps.quality_control.interval_data_provider import (
    IntervalAnnotation,
    IntervalDataset,
    IntervalJobDataProvider,
    RecordingSample,
    validate_audio_quality_scope,
)
from cvat.apps.quality_control.matching import temporal_iou
from cvat.apps.quality_control.quality_calculators import (
    ProjectQualityCalculator,
    TaskQualityCalculator,
    _all_enabled_requirements_completed,
)
from cvat.apps.quality_control.quality_handlers import DatasetQualityEstimator
from cvat.apps.quality_control.tests.test_quality_backends import make_requirement
from cvat.apps.quality_control.utils import get_report_version, is_current_report_data


def interval(annotation_id, start=0, stop=1000, *, label=0, job=1, attributes=None, group=0):
    return IntervalAnnotation(
        id=annotation_id,
        label=label,
        start=start,
        stop=stop,
        attributes=attributes or {},
        reference=cdm.AnnotationReference(annotation_id, job, cdm.AnnotationReferenceType.INTERVAL),
        source="manual",
        group=group,
        score=1.0,
    )


def provider(job, annotations, *, duration=3000, labels=None):
    result = IntervalJobDataProvider.__new__(IntervalJobDataProvider)
    result.job_id = job
    result.job_data = SimpleNamespace(
        db_instance=SimpleNamespace(
            segment=SimpleNamespace(task=SimpleNamespace(dimension="1d")),
        )
    )
    result.recording_range = (0, duration)
    result.dataset = IntervalDataset(
        cdm.LabelCatalog(
            tuple(labels or [cdm.Label(1, "A", "interval"), cdm.Label(2, "B", "interval")])
        ),
        RecordingSample("recording", "", tuple(annotations)),
    )
    return result


def report(gt, ds, *, requirements=None):
    return DatasetQualityEstimator(
        provider(2, ds),
        provider(1, gt),
        requirements=requirements or [make_requirement("interval", iou_threshold=0.5)],
        report_parameters=ComparisonReportParameters(),
    ).generate_report()


class TestIntervalQuality(unittest.TestCase):
    def test_temporal_iou(self):
        for bounds, expected in [
            ((0, 1000, 0, 1000), 1),
            ((0, 1000, 100, 900), 0.8),
            ((0, 1000, 1000, 2000), 0),
            ((0, 0, 0, 0), 0),
            ((10, 10, 0, 20), 0),
            ((1000, 3000, 2000, 4000), 1 / 3),
        ]:
            with self.subTest(bounds=bounds):
                self.assertAlmostEqual(temporal_iou(*bounds), expected)

    def test_iou_is_pairing_score_not_quality_score(self):
        result = report([interval(1)], [interval(2, 100, 900, job=2)])
        self.assertEqual(result.version, 3)
        group = result.groups["interval"]
        self.assertEqual(group.comparison_summary.score, 1)
        self.assertIsNone(group.frame_results)
        self.assertEqual(group.conflicts, [])
        self.assertTrue(result.comparison_summary.has_comparison_scope)
        self.assertEqual(result.comparison_summary.total_frames, 0)
        self.assertTrue(_all_enabled_requirements_completed(result.comparison_summary))

    def test_open_stop_is_resolved_without_changing_source(self):
        gt = interval(1, 1000, None)
        result = report([gt], [interval(2, 1000, 3000, job=2)])
        self.assertEqual(result.groups["interval"].comparison_summary.score, 1)
        self.assertIsNone(gt.stop)

    def test_invalid_boundaries_fail(self):
        for start, stop in [(-1, 100), (200, 100), (0, 3001)]:
            with (
                self.subTest(start=start, stop=stop),
                self.assertRaisesRegex(ValueError, "boundaries"),
            ):
                report([interval(1, start, stop)], [])

    def test_zero_overlap_never_matches_at_zero_threshold(self):
        result = report(
            [interval(1)],
            [interval(2, 1000, 2000, job=2)],
            requirements=[
                make_requirement("interval", iou_threshold=0),
            ],
        )
        self.assertEqual(len(result.get_conflicts()), 2)
        self.assertEqual(result.groups["interval"].comparison_summary.score, 0)

    def test_label_mismatch_and_conflicts_survive_json(self):
        result = report([interval(1)], [interval(2, label=1, job=2)])
        reloaded = ComparisonReport.from_json(result.to_json())
        self.assertEqual(json.loads(reloaded.to_json()), json.loads(result.to_json()))
        (conflict,) = reloaded.get_conflicts()
        self.assertIsNone(conflict.frame_id)
        self.assertEqual(conflict.type, models.AnnotationConflictType.MISMATCHING_LABEL)
        self.assertEqual({a.obj_id for a in conflict.annotation_ids}, {1, 2})
        self.assertTrue(
            all(a.type == models.AnnotationType.INTERVAL for a in conflict.annotation_ids)
        )

    def test_empty_recording_still_has_comparison_scope(self):
        result = report([], [])
        self.assertTrue(result.comparison_summary.has_comparison_scope)
        self.assertIsNone(result.groups["interval"].comparison_summary.score)
        self.assertEqual(
            result.groups["interval"].comparison_summary.calculation.status, "not_computed"
        )
        self.assertTrue(_all_enabled_requirements_completed(result.comparison_summary))

    def test_attributes_filtering_and_requirements_do_not_mutate_samples(self):
        attrs = {"text": "hello", CVAT_ATTRIBUTE_SPEC_IDS_ATTR: {"text": 1}}
        gt, ds = interval(1, attributes=attrs), interval(2, job=2, attributes={"text": "bye"})
        requirement = make_requirement(
            "interval",
            iou_threshold=0.5,
            attribute_comparison={"default": {"enabled": True, "comparator": "exact"}},
        )
        result = report(
            [gt],
            [ds],
            requirements=[
                requirement,
                evolve(requirement, name="without attributes", attribute_comparison=None),
            ],
        )
        self.assertEqual(result.groups["interval"].comparison_summary.score, 0)
        self.assertEqual(result.groups["without attributes"].comparison_summary.score, 1)
        selection = RequirementJsonLogicFilter(
            expression=json.dumps({"==": [{"var": "shape.source"}, "manual"]}),
            catalog=provider(1, []).label_catalog,
            included_annotation_types=[cdm.Interval],
        )
        self.assertEqual(selection.filter_annotations([gt]), [gt])
        self.assertNotIn(
            CVAT_ATTRIBUTE_SPEC_IDS_ATTR,
            selection.build_shape_context_for_annotation(gt).attribute.name,
        )
        self.assertEqual(gt.attributes, attrs)

    def test_filter_rejects_spatial_terms(self):
        from rest_framework.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            RequirementJsonLogicFilter.validate_expression(
                '{">": [{"var": "shape.area"}, 1]}',
                annotation_type="interval",
            )

    def test_groups_do_not_join_intervals_and_labels_have_priority(self):
        result = report(
            [interval(1), interval(2, label=1)],
            [
                interval(3, label=1, job=2, group=5),
                interval(4, job=2, group=5),
            ],
        )
        self.assertEqual(result.groups["interval"].comparison_summary.score, 1)
        self.assertEqual(
            result.groups["interval"].comparison_summary.score_components.valid_count, 2
        )

    def test_task_and_project_aggregate_frameless_matrices_and_conflicts(self):
        requirement = make_requirement("interval", iou_threshold=0.5)
        task = TaskQualityCalculator()._compute_task_report(
            {2: report([interval(1)], [interval(2, job=2)]), 3: report([interval(1)], [])},
            report_parameters=ComparisonReportParameters(inherited=True),
            requirements=[requirement],
            all_job_ids={2, 3},
        )
        self.assertEqual(task.groups["interval"].comparison_summary.score, 0.5)
        self.assertEqual(len(task.get_conflicts()), 1)
        self.assertEqual(task.comparison_summary.jobs.not_checkable, set())
        project = ProjectQualityCalculator()._compute_project_report(
            task_reports={10: ComparisonReport.from_json(task.to_json())},
            report_parameters=ComparisonReportParameters(),
            requirements=[requirement],
            all_task_ids={10},
        )
        self.assertEqual(project.groups["interval"].comparison_summary.score, 0.5)
        self.assertEqual(len(ComparisonReport.from_json(project.to_json()).get_conflicts()), 1)

    def test_provider_converts_metadata_without_datumaro(self):
        source = CommonData.LabeledInterval(
            id=7,
            start=timedelta(milliseconds=1010),
            stop=None,
            label="A",
            attributes=[],
            source="file",
            group=2,
            score=0.8,
        )
        data_provider = provider(1, [])
        del data_provider.dataset
        data_provider._load_label_catalog = lambda: cdm.LabelCatalog(
            (
                cdm.Label(
                    10,
                    "A",
                    "interval",
                    attributes=(cdm.AttributeSpec(11, "number", "number", "2"),),
                ),
            )
        )
        data_provider.job_data = SimpleNamespace(
            iterate_intervals=mock.Mock(return_value=iter([source])),
            db_instance=SimpleNamespace(segment=SimpleNamespace(task_id=1)),
        )
        with mock.patch("datumaro.Dataset.from_extractors", side_effect=AssertionError("Datumaro")):
            (annotation,) = next(iter(data_provider.dataset)).annotations
            self.assertIs(data_provider.dataset, data_provider.dataset)
        self.assertEqual(annotation.start, 1010)
        self.assertIsNone(annotation.stop)
        self.assertEqual(annotation.attributes["number"], 2.0)
        self.assertEqual(annotation.attributes[CVAT_ATTRIBUTE_SPEC_IDS_ATTR], {"number": 11})
        self.assertEqual(annotation.reference.obj_id, 7)
        data_provider.job_data.iterate_intervals.assert_called_once()
        data_provider.close()
        self.assertNotIn("dataset", data_provider.__dict__)

    def test_scope_validation_uses_range_boundaries(self):
        from rest_framework.exceptions import ValidationError

        task = SimpleNamespace(
            dimension="1d",
            data=SimpleNamespace(
                size=3600000,
                deleted_frames=[],
                validation_layout=None,
                get_frame_step=lambda: 1,
            ),
        )
        job = SimpleNamespace(
            segment=SimpleNamespace(type="range", start_frame=0, stop_frame=3599999)
        )
        validate_audio_quality_scope(task, [job])
        job.segment.stop_frame = 100
        with self.assertRaises(ValidationError):
            validate_audio_quality_scope(task, [job])


class TestReportVersions(unittest.TestCase):
    def test_historical_detection_and_explicit_versions(self):
        for data, version in [
            ({}, 1),
            ({"name": '"groups": {}'}, 1),
            ({"groups": {}}, 2),
            ({"groups": None}, 2),
            ({"version": 1, "groups": {}}, 1),
            ({"version": 2}, 2),
            ({"version": 3}, 3),
            ({"version": 4}, 4),
        ]:
            with self.subTest(data=data):
                self.assertEqual(get_report_version(data), version)
                self.assertEqual(is_current_report_data(data), version in (2, 3))
        for version in [None, True, "3", 0]:
            with self.subTest(version=version), self.assertRaises(ValueError):
                get_report_version({"version": version})

    def test_v2_reader_keeps_version_and_falls_back_to_frames(self):
        data = report([], []).to_dict()
        data.pop("version")
        data["comparison_summary"].pop("has_comparison_scope")
        data["comparison_summary"].update(frames=[0], validation_frames=1)
        result = ComparisonReport.from_dict(data)
        self.assertEqual(result.version, 2)
        self.assertTrue(result.comparison_summary.has_comparison_scope)
        self.assertEqual(json.loads(result.to_json())["version"], 2)

    def test_unknown_format_is_not_read_as_generalized_quality(self):
        with self.assertRaisesRegex(ValueError, "Unsupported quality report version"):
            ComparisonReport.from_dict({"version": 4, "groups": {}})

    def test_project_does_not_reuse_v2(self):
        stored = SimpleNamespace(target=models.QualityReportTarget.TASK, version=2)
        self.assertFalse(ProjectQualityCalculator().is_task_report_relevant(stored))
