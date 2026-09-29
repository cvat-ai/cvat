# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from unittest import mock

from django.test import TestCase, TransactionTestCase, override_settings
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
from cvat.apps.quality_control.serializers import QualityReportSerializer, QualitySettingsSerializer
from cvat.apps.quality_control.utils import filter_current_reports


class TestReportVersionDetection(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.task = engine.Task.objects.create(name="historical quality reports")

    def test_versions_are_inferred_without_rewriting_data(self):
        payloads = [
            ({}, 1),
            ({"name": '"groups": {}'}, 1),
            ({"parameters": {"groups": {}}}, 1),
            ({"groups": {}}, 2),
            ({"groups": None}, 2),
            ({"groups": {}, "parameters": {"version": 1}}, 2),
            ({"version": 1, "groups": {}}, 1),
            ({"version": 2}, 2),
            ({"version": 3, "groups": {}}, 3),
            ({"version": 4, "groups": {}}, 4),
        ]
        report_ids = {version: set() for version in (1, 2, 3, 4)}
        for payload, version in payloads:
            for data in (payload, json.dumps(payload)):
                with self.subTest(data=data):
                    stored = models.QualityReport.objects.create(
                        task=self.task, target_last_updated=timezone.now(), data=data
                    )
                    stored.refresh_from_db()
                    self.assertEqual(stored.version, version)
                    self.assertEqual(stored.has_current_data_format, version in (2, 3))
                    self.assertEqual(stored.data, data)
                    report_ids[version].add(stored.id)

        # An explicit invalid version must not fall back to the presence of groups.
        for payload in [
            {"version": version, "groups": {}} for version in (None, True, "3", 0, 2.5)
        ] + [None, [], ["groups"], 3, True]:
            for data in (payload, json.dumps(payload)):
                if data is None:
                    continue  # The data column is not nullable.
                stored = models.QualityReport.objects.create(
                    task=self.task, target_last_updated=timezone.now(), data=data
                )
                self.assertFalse(stored.has_current_data_format)

        self.assertSetEqual(
            set(
                filter_current_reports(models.QualityReport.objects.all()).values_list(
                    "id", flat=True
                )
            ),
            report_ids[2] | report_ids[3],
        )

    def test_export_infers_historical_versions_without_changing_data(self):
        for payload, version in (({}, 1), ({"groups": {}}, 2)):
            with self.subTest(version=version):
                data = json.dumps({"parameters": {}, "comparison_summary": {}, **payload})
                stored = models.QualityReport.objects.create(
                    task=self.task, target_last_updated=timezone.now(), data=data
                )
                exported = json.loads(
                    prepare_json_report_for_downloading(stored, host="http://test/").read()
                )
                self.assertEqual(exported["version"], version)
                stored.refresh_from_db()
                self.assertEqual(stored.data, data)


class TestAudioQualityDatabase(TransactionTestCase):
    def setUp(self):
        data = engine.Data.objects.create(
            size=3000, start_frame=0, stop_frame=2999, image_quality=70
        )
        self.task = engine.Task.objects.create(
            name="audio quality", dimension="1d", mode="interpolation", data=data
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

        with mock.patch.object(
            TaskQualityCalculator, "compute_report", side_effect=AssertionError("recomputed v3")
        ):
            next_report = ProjectQualityCalculator().compute_report(project)
        self.assertEqual(next_report.children.get(task=self.task).id, task_report.id)

        # Only the latest report is inspected. Unsupported or unreadable data triggers
        # recalculation instead of scanning older report payloads in the database.
        for data in (json.dumps({"version": 4, "groups": {}}), "invalid JSON"):
            with self.subTest(data=data):
                old_report = models.QualityReport.objects.create(
                    task=self.task, target_last_updated=timezone.now(), data=data
                )
                next_report = ProjectQualityCalculator().compute_report(project)
                recalculated = next_report.children.get(task=self.task)
                self.assertEqual(recalculated.version, 3)
                self.assertNotIn(recalculated.id, (old_report.id, task_report.id))
                task_report = recalculated

        # Even a fresh v3 report cannot bypass the whole-recording scope restriction.
        engine.Data.objects.filter(id=self.task.data_id).update(deleted_frames=[1])
        with self.assertRaisesRegex(ValidationError, "whole recording"):
            ProjectQualityCalculator().compute_report(project)

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
