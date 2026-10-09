# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import mock

from django.db import connections
from django.test import TestCase, TransactionTestCase, override_settings, skipUnlessDBFeature
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from cvat.apps.engine import models as engine
from cvat.apps.quality_control import models
from cvat.apps.quality_control.comparison_report import ComparisonReport
from cvat.apps.quality_control.export import prepare_json_report_for_downloading
from cvat.apps.quality_control.quality_calculators import (
    ProjectQualityCalculator,
    TaskQualityCalculator,
)
from cvat.apps.quality_control.serializers import (
    QualityReportSerializer,
    QualityRequirementBulkCreateSerializer,
    QualityRequirementSerializer,
    QualitySettingsSerializer,
)
from cvat.apps.quality_control.utils import filter_current_reports
from cvat.apps.quality_control.validation import validate_task_quality_settings


class TestReportVersionDetection(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.task = engine.Task.objects.create(name="historical quality reports")

    def test_list_filters_by_stored_version_without_reading_data(self):
        reports = {
            version: models.QualityReport.objects.create(
                task=self.task,
                target_last_updated=timezone.now(),
                data=json.dumps({"groups": {}, "version": 3}),
                version=version,
            )
            for version in (0, 1, 2, 3, 4)
        }
        with mock.patch(
            "cvat.apps.quality_control.utils.detect_report_version",
            side_effect=AssertionError("known payload inspected"),
        ):
            queryset = filter_current_reports(models.QualityReport.objects.all()).defer("data")
        with self.assertNumQueries(1):
            self.assertEqual(queryset.count(), 2)
        with self.assertNumQueries(1):
            results = list(queryset)
            self.assertEqual({report.id for report in results}, {reports[2].id, reports[3].id})
            self.assertTrue(all(report.has_current_data_format for report in results))
            self.assertTrue(all("data" in report.get_deferred_fields() for report in results))

    def test_unknown_version_is_resolved_once_without_changing_payload(self):
        for payload, version in [
            ({}, 1),
            ({"groups": {}}, 2),
            ({"version": 3}, 3),
            ({"version": 4}, 4),
            ("invalid JSON", 0),
        ]:
            for data in (payload, json.dumps(payload)):
                with self.subTest(data=data):
                    report = models.QualityReport.objects.create(
                        task=self.task, target_last_updated=timezone.now(), data=data
                    )
                    created = report.created_date
                    self.assertIsNone(report.version)
                    self.assertEqual(report.resolve_version(), version)
                    report.refresh_from_db()
                    self.assertEqual(report.version, version)
                    self.assertEqual(report.data, data)
                    self.assertEqual(report.created_date, created)
                    report = models.QualityReport.objects.only("id", "version").get(pk=report.pk)
                    with self.assertNumQueries(0):
                        self.assertEqual(report.resolve_version(), version)
                        self.assertEqual(report.has_current_data_format, version in (2, 3))
                        if version == 0:
                            self.assertFalse(report.has_readable_data)

    def test_stale_reader_does_not_overwrite_a_resolved_version(self):
        report = models.QualityReport.objects.create(
            task=self.task, target_last_updated=timezone.now(), data='{"groups": {}}'
        )
        models.QualityReport.objects.filter(pk=report.pk).update(version=4)
        self.assertEqual(report.resolve_version(), 4)
        report.refresh_from_db()
        self.assertEqual(report.version, 4)

    def test_version_resolution_only_updates_the_supplied_queryset(self):
        def create_report(task):
            return models.QualityReport.objects.create(
                task=task, target_last_updated=timezone.now(), data='{"groups": {}}'
            )

        selected = create_report(self.task)
        excluded = create_report(self.task)
        unrelated = create_report(engine.Task.objects.create(name="unrelated reports"))
        queryset = models.QualityReport.objects.filter(task=self.task).exclude(pk=excluded.pk)

        self.assertEqual(list(filter_current_reports(queryset)), [selected])
        selected.refresh_from_db()
        self.assertEqual(selected.version, 2)
        for report in (excluded, unrelated):
            report.refresh_from_db()
            self.assertIsNone(report.version)

    def test_list_resolves_multiple_batches_and_caches_invalid_data(self):
        reports = models.QualityReport.objects.bulk_create(
            [
                models.QualityReport(
                    task=self.task, target_last_updated=timezone.now(), data='{"groups": {}}'
                )
                for _ in range(501)
            ]
        )
        broken = models.QualityReport.objects.create(
            task=self.task, target_last_updated=timezone.now(), data="invalid JSON"
        )
        queryset = models.QualityReport.objects.filter(task=self.task)
        self.assertEqual(filter_current_reports(queryset).count(), len(reports))
        broken.refresh_from_db()
        self.assertEqual(broken.version, 0)
        self.assertFalse(queryset.filter(version__isnull=True).exists())
        with mock.patch(
            "cvat.apps.quality_control.utils.detect_report_version",
            side_effect=AssertionError("payload inspected again"),
        ):
            self.assertEqual(filter_current_reports(queryset).count(), len(reports))

    def test_serializer_resolves_only_serialized_reports(self):
        data = json.dumps(
            {
                "parameters": {},
                "comparison_summary": {
                    "total_frames": 0,
                    "frames": [],
                    "validation_frames": 0,
                    "conflict_count": 0,
                    "error_count": 0,
                },
                "groups": {},
            }
        )
        accessed, untouched = [
            models.QualityReport.objects.create(
                task=self.task, target_last_updated=timezone.now(), data=data
            )
            for _ in range(2)
        ]
        self.assertEqual(QualityReportSerializer([accessed], many=True).data[0]["version"], 2)
        accessed.refresh_from_db()
        untouched.refresh_from_db()
        self.assertEqual(accessed.version, 2)
        self.assertIsNone(untouched.version)

    def test_export_preserves_historical_versions_without_changing_data(self):
        for payload, version in (({}, 1), ({"groups": {}}, 2)):
            with self.subTest(version=version):
                data = json.dumps({"parameters": {}, "comparison_summary": {}, **payload})
                stored = models.QualityReport.objects.create(
                    task=self.task, target_last_updated=timezone.now(), data=data
                )
                self.assertIsNone(stored.version)
                exported = json.loads(
                    prepare_json_report_for_downloading(stored, host="http://test/").read()
                )
                self.assertEqual(exported["version"], version)
                stored.refresh_from_db()
                self.assertEqual(stored.version, version)
                self.assertEqual(stored.data, data)


class TestAudioQualityDatabase(TransactionTestCase):
    def setUp(self):
        data = engine.Data.objects.create(
            size=3000, start_frame=0, stop_frame=2999, image_quality=70
        )
        self.task = engine.Task.objects.create(
            name="audio quality",
            dimension="1d",
            media_type="audio",
            mode="interpolation",
            data=data,
        )
        self.label = engine.Label.objects.create(task=self.task, name="speech", type="interval")
        self.job = engine.Job.objects.create(
            segment=engine.Segment.objects.create(task=self.task, start_frame=0, stop_frame=2999)
        )
        self.gt = engine.Job.objects.create(
            type="ground_truth",
            segment=engine.Segment.objects.create(task=self.task, start_frame=0, stop_frame=2999),
        )
        self.requirement = self.task.quality_settings.requirements.get(annotation_type="interval")
        self.requirement.enabled = True
        self.requirement.save()

    def test_real_provider_report_persistence_and_export(self):
        gt_interval = engine.LabeledInterval.objects.create(
            job=self.gt, label=self.label, start=1000, stop=None
        )
        with (
            mock.patch(
                "datumaro.Dataset.from_extractors", side_effect=AssertionError("Datumaro dataset")
            ),
            mock.patch(
                "cvat.apps.dataset_manager.bindings.JobData.get_included_frames",
                side_effect=AssertionError("frame enumeration"),
            ),
        ):
            task_report = TaskQualityCalculator().compute_report(self.task)
        job_report = task_report.children.get(job=self.job)
        self.assertEqual(task_report.version, 3)
        self.assertEqual(job_report.version, 3)
        self.assertEqual(QualityReportSerializer(task_report).data["version"], 3)
        conflict = job_report.conflicts.get()
        self.assertIsNone(conflict.frame)
        reference = conflict.annotation_ids.get()
        self.assertEqual(reference.obj_id, gt_interval.id)
        self.assertEqual(reference.type, "interval")
        result = ComparisonReport.from_json(task_report.data)
        self.assertTrue(result.comparison_summary.has_comparison_scope)
        self.assertEqual(result.groups[self.requirement.name].comparison_summary.score, 0)
        exported = json.loads(
            prepare_json_report_for_downloading(task_report, host="http://test/").read()
        )
        reference = exported["groups"][self.requirement.name]["conflicts"][0]["annotation_ids"][0]
        self.assertIn(f"?type=interval&serverID={gt_interval.id}", reference["url"])
        self.assertNotIn("frame=", reference["url"])
        gt_interval.refresh_from_db()
        self.assertIsNone(gt_interval.stop)

    def test_project_recalculates_v2_and_reuses_only_supported_v3_reports(self):
        project = engine.Project.objects.create(name="audio project")
        self.task.project = project
        self.task.save()
        self.label.task = None
        self.label.project = project
        self.label.save()
        requirement = project.quality_settings.requirements.get(annotation_type="interval")
        requirement.enabled = True
        requirement.save()
        engine.LabeledInterval.objects.create(job=self.gt, label=self.label, start=0, stop=1000)
        old_report = models.QualityReport.objects.create(
            version=2,
            task=self.task,
            target_last_updated=timezone.now(),
            data=json.dumps({"version": 2, "groups": {}}),
        )

        project_report = ProjectQualityCalculator().compute_report(project)
        task_report = project_report.children.get(task=self.task)
        self.assertEqual(project_report.version, 3)
        self.assertEqual(task_report.version, 3)
        self.assertNotEqual(task_report.id, old_report.id)
        result = ComparisonReport.from_json(project_report.data)
        self.assertTrue(result.comparison_summary.has_comparison_scope)
        self.assertEqual(result.groups[requirement.name].comparison_summary.score, 0)

        # Imported or historical v3 reports with an unknown column are still reusable.
        models.QualityReport.objects.filter(pk=task_report.pk).update(version=None)
        with mock.patch.object(
            TaskQualityCalculator, "compute_report", side_effect=AssertionError("recomputed v3")
        ):
            next_report = ProjectQualityCalculator().compute_report(project)
        self.assertEqual(next_report.children.get(task=self.task).id, task_report.id)
        task_report.refresh_from_db()
        self.assertEqual(task_report.version, 3)

        # Only the latest report is inspected. Unsupported or unreadable data triggers
        # recalculation instead of scanning older report payloads in the database.
        for data, version in (
            (json.dumps({"version": 4, "groups": {}}), 4),
            ("invalid JSON", None),
        ):
            with self.subTest(data=data):
                old_report = models.QualityReport.objects.create(
                    task=self.task, target_last_updated=timezone.now(), data=data, version=version
                )
                next_report = ProjectQualityCalculator().compute_report(project)
                recalculated = next_report.children.get(task=self.task)
                self.assertEqual(recalculated.version, 3)
                self.assertNotIn(recalculated.id, (old_report.id, task_report.id))
                task_report = recalculated

        # Even a fresh v3 report cannot bypass the audio metadata invariants.
        engine.Data.objects.filter(id=self.task.data_id).update(deleted_frames=[1])
        with self.assertRaisesRegex(AssertionError, "excluded times"):
            ProjectQualityCalculator().compute_report(project)

    def test_incompatible_legacy_requirements_can_be_disabled_individually(self):
        incompatible = self.task.quality_settings.requirements.filter(
            annotation_type__in=("rectangle", "tag")
        )
        incompatible.update(enabled=True)
        for requirement in incompatible:
            serializer = QualityRequirementSerializer(
                requirement,
                data={
                    "enabled": False,
                    "parent_requirement": None,
                    "settings_id": requirement.settings_id,
                },
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
        validate_task_quality_settings(self.task)

    def test_inherited_incompatible_settings_are_rejected_before_computation(self):
        project = engine.Project.objects.create(name="incompatible project requirements")
        self.task.project = project
        self.task.save()
        rectangle = project.quality_settings.requirements.get(annotation_type="rectangle")
        # Simulate an existing configuration from before compatibility validation.
        rectangle.enabled = True
        rectangle.save()
        with self.assertRaisesRegex(ValidationError, "only interval"):
            validate_task_quality_settings(self.task)
        settings = self.task.quality_settings
        settings.inherit = False
        settings.save()
        validate_task_quality_settings(self.task)

    def test_database_reports_for_disjoint_segments_are_not_checkable(self):
        self.gt.segment.stop_frame = 999
        self.gt.segment.save()
        self.job.segment.start_frame = 1000
        self.job.segment.save()
        stored = TaskQualityCalculator().compute_report(self.task)
        result = ComparisonReport.from_json(stored.data)
        self.assertFalse(result.comparison_summary.has_comparison_scope)
        self.assertCountEqual(result.comparison_summary.jobs.not_checkable, [self.job.id])
        self.assertIsNone(result.groups[self.requirement.name].frame_results)
        self.assertEqual(result.get_conflicts(), [])

    @override_settings(MAX_QUALITY_REQUIREMENTS_PER_SETTINGS=9)
    def test_existing_over_quota_settings_can_be_saved(self):
        settings = self.task.quality_settings
        serializer = QualitySettingsSerializer(settings)
        payload = serializer.data
        payload["requirements"][-1]["enabled"] = True
        update = QualitySettingsSerializer(
            settings, data={"requirements": payload["requirements"]}, partial=True
        )
        self.assertTrue(update.is_valid(), update.errors)
        update.save()
        self.assertEqual(settings.requirements.count(), 10)

    def test_missing_base_requirement_uses_canonical_name(self):
        self.requirement.delete()
        custom = models.QualityRequirement.objects.create(
            settings=self.task.quality_settings,
            name="Custom interval",
            annotation_type=None,
            parent=self.task.quality_settings.requirements.get(annotation_type="rectangle"),
        )
        models.ensure_base_quality_requirements(self.task.quality_settings)
        custom.refresh_from_db()
        self.assertEqual(custom.name, "Custom interval")
        self.assertEqual(
            self.task.quality_settings.requirements.get(annotation_type="interval").name,
            "Base interval",
        )


class TestRequirementQuotaTransactions(TransactionTestCase):
    def setUp(self):
        self.task = engine.Task.objects.create(name="requirement quota", media_type="image")
        self.settings = self.task.quality_settings
        self.parent = self.settings.requirements.get(annotation_type="rectangle")

    def _create_serializer(self, name):
        serializer = QualityRequirementSerializer(
            data={
                "settings_id": self.settings.id,
                "parent_requirement": self.parent.id,
                "name": name,
                "enabled": False,
            }
        )
        serializer.is_valid(raise_exception=True)
        return serializer

    @override_settings(MAX_QUALITY_REQUIREMENTS_PER_SETTINGS=11)
    def test_bulk_create_rechecks_quota_after_validation(self):
        serializer = QualityRequirementBulkCreateSerializer(
            data={
                "settings_id": self.settings.id,
                "requirements": [
                    {"name": "bulk", "parent_requirement": self.parent.id, "enabled": False}
                ],
            }
        )
        serializer.is_valid(raise_exception=True)
        self._create_serializer("concurrent").save()
        with self.assertRaisesRegex(ValidationError, "No more than 11"):
            serializer.save()
        self.assertEqual(self.settings.requirements.count(), 11)
        self.assertFalse(self.settings.requirements.filter(name="bulk").exists())

    @override_settings(MAX_QUALITY_REQUIREMENTS_PER_SETTINGS=11)
    @skipUnlessDBFeature("has_select_for_update")
    def test_concurrent_creates_cannot_exceed_quota(self):
        validated = Barrier(2)

        def create(name):
            try:
                serializer = self._create_serializer(name)
                validated.wait(timeout=10)
                try:
                    serializer.save()
                except ValidationError:
                    return False
                return True
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(create, ["first", "second"]))
        self.assertEqual(sorted(results), [False, True])
        self.assertEqual(self.settings.requirements.count(), 11)
