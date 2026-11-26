# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from copy import deepcopy
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import Group
from django.db import models as django_models
from django.test import TestCase, override_settings
from rest_framework import serializers as rest_serializers
from rest_framework.test import APIClient

from cvat.apps.dataset_manager.task import put_job_data
from cvat.apps.engine import models as engine
from cvat.apps.engine.serializers import GroundTruthJobCreateSerializer
from cvat.apps.engine.task import _create_validation_jobs
from cvat.apps.iam.models import User
from cvat.apps.quality_control import models
from cvat.apps.quality_control.backends.capabilities import get_backend_capabilities
from cvat.apps.quality_control.backends.cuboid import Cuboid3DBackend
from cvat.apps.quality_control.backends.cuboid import capabilities as cuboid_capabilities
from cvat.apps.quality_control.comparison_report import ComparisonReport
from cvat.apps.quality_control.quality_calculators import (
    ProjectQualityCalculator,
    TaskQualityCalculator,
)
from cvat.apps.quality_control.serializers import (
    QualityRequirementSerializer,
    QualitySettingsSerializer,
)
from cvat.apps.quality_control.validation import validate_quality_task


class TestCuboidIntegration(TestCase):
    def setUp(self):
        self.owner = User.objects.create_superuser(username="3d-user", email="", password="test")
        self.owner.groups.add(Group.objects.get_or_create(name="admin")[0])
        self.data = engine.Data.objects.create(
            size=4,
            start_frame=10,
            stop_frame=16,
            frame_filter="step=2",
            chunk_size=1,
            image_quality=100,
            deleted_frames=[],
        )
        self.task = engine.Task.objects.create(
            name="3D quality",
            owner=self.owner,
            data=self.data,
            dimension="3d",
            mode="annotation",
            media_type="point_cloud",
            overlap=0,
        )
        self.label = engine.Label.objects.create(task=self.task, name="car", type="cuboid")
        engine.Image.objects.bulk_create(
            [
                engine.Image(
                    data=self.data, path=f"{idx}/frame.pcd", frame=10 + 2 * idx, width=1, height=1
                )
                for idx in range(4)
            ]
        )
        segment = engine.Segment.objects.create(task=self.task, start_frame=0, stop_frame=3)
        self.job = engine.Job.objects.create(segment=segment)

    def create_gt(self):
        serializer = GroundTruthJobCreateSerializer(
            data={
                "task_id": self.task.id,
                "type": "ground_truth",
                "frame_selection_method": "manual",
                "frames": [0, 2],
            }
        )
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        self.task.refresh_from_db()
        self.base = self.task.quality_settings.requirements.get(
            annotation_type="cuboid", parent=None
        )
        return job

    def enable(self):
        serializer = QualityRequirementSerializer(self.base, data={"enabled": True}, partial=True)
        serializer.is_valid(raise_exception=True)
        self.base = serializer.save()

    def test_manual_gt_report_and_persistent_conflicts(self):
        self.task.owner = None
        self.task.save(update_fields=["owner"])
        gt = self.create_gt()
        self.assertEqual(gt.segment.frames, [10, 14])
        self.enable()
        shape = dict(
            type="cuboid",
            frame=0,
            label_id=self.label.id,
            points=[0.123456, 0, 0, 0.31, -0.47, 0.83, 0.004, 0.006, 0.008] + [0] * 7,
            occluded=False,
            outside=False,
            attributes=[],
            group=0,
            source="manual",
            z_order=0,
            rotation=0,
        )
        put_job_data(
            gt.id, {"version": 0, "tags": [], "shapes": [shape], "tracks": [], "intervals": []}
        )
        # Real providers must not read PCD data: metadata-only fixtures have no files.
        report = TaskQualityCalculator().compute_report(self.task)
        report.refresh_from_db()
        job_report = report.children.get(job=self.job)
        conflict = job_report.conflicts.get()
        reference = conflict.annotation_ids.get()
        self.assertEqual((conflict.frame, conflict.type), (0, "missing_annotation"))
        self.assertEqual(
            (reference.job_id, reference.shape_type, reference.type), (gt.id, "cuboid", "shape")
        )
        restored = ComparisonReport.from_json(job_report.get_report_data())
        self.assertEqual(
            restored.get_conflicts()[0].to_dict()["annotation_ids"][0]["obj_id"], reference.obj_id
        )
        old_id = conflict.id
        conflict.refresh_from_db()
        self.assertEqual(conflict.id, old_id)
        client = APIClient()
        client.force_authenticate(self.owner)
        response = client.get(
            "/api/quality/conflicts",
            {"report_id": report.id, "job_id": self.job.id, "frame": 0, "page_size": 1},
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], old_id)
        self.assertEqual(response.data["results"][0]["annotation_ids"][0]["job_id"], gt.id)
        shape.pop("id", None)
        put_job_data(
            self.job.id,
            {"version": 0, "tags": [], "shapes": [shape], "tracks": [], "intervals": []},
        )
        new_report = TaskQualityCalculator().compute_report(self.task)
        parsed = ComparisonReport.from_json(new_report.get_report_data())
        self.assertEqual(parsed.groups["Base cuboid"].comparison_summary.score, 1)
        self.assertNotEqual(new_report.id, report.id)
        put_job_data(gt.id, {"version": 0, "tags": [], "shapes": [], "tracks": [], "intervals": []})
        conflict.refresh_from_db()
        self.assertEqual(conflict.annotation_ids.get().obj_id, reference.obj_id)

    def test_interpolated_tracks_preserve_server_identity_and_active_frames(self):
        gt = self.create_gt()
        self.enable()

        def track(stop):
            return {
                "frame": 0,
                "label_id": self.label.id,
                "group": 0,
                "source": "manual",
                "attributes": [],
                "shapes": [
                    dict(
                        type="cuboid",
                        frame=frame,
                        points=[frame, 0, 0, 0, 0, 0, 2, 2, 2] + [0] * 7,
                        occluded=False,
                        outside=False,
                        attributes=[],
                        z_order=0,
                        rotation=0,
                    )
                    for frame in (0, stop)
                ],
            }

        gt_annotations = put_job_data(
            gt.id, {"version": 0, "tags": [], "shapes": [], "tracks": [track(2)], "intervals": []}
        )
        put_job_data(
            self.job.id,
            {"version": 0, "tags": [], "shapes": [], "tracks": [track(3)], "intervals": []},
        )
        report = TaskQualityCalculator().compute_report(self.task)
        parsed = ComparisonReport.from_json(report.get_report_data())
        self.assertEqual(parsed.groups["Base cuboid"].comparison_summary.score, 1)
        self.assertEqual(parsed.comparison_summary.frames, [0, 2])
        self.assertFalse(report.children.get(job=self.job).conflicts.exists())
        # Delete the DS track: missing states must reference the original GT track.
        put_job_data(
            self.job.id, {"version": 0, "tags": [], "shapes": [], "tracks": [], "intervals": []}
        )
        report = TaskQualityCalculator().compute_report(self.task)
        references = models.AnnotationId.objects.filter(conflict__report__parents=report)
        self.assertEqual(
            set(references.values_list("type", "obj_id", "job_id")),
            {("track", gt_annotations["tracks"][0]["id"], gt.id)},
        )
        layout = engine.ValidationLayout.objects.get(task_data=self.data)
        layout.disabled_frames = [2]
        layout.save()
        report = TaskQualityCalculator().compute_report(self.task)
        parsed = ComparisonReport.from_json(report.get_report_data())
        self.assertEqual(parsed.comparison_summary.frames, [0])

    def test_project_aggregation_and_validation_before_saved_report_reuse(self):
        project = engine.Project.objects.create(name="3D project", owner=self.owner)
        self.task.project = project
        self.task.save()
        self.label.task = None
        self.label.project = project
        self.label.save()
        settings = self.task.quality_settings
        settings.inherit = True
        settings.save()
        self.create_gt()
        base = project.quality_settings.requirements.get(annotation_type="cuboid")
        base.enabled = True
        base.save()
        report = ProjectQualityCalculator().compute_report(project)
        self.assertEqual(report.children.count(), 1)
        with patch.object(TaskQualityCalculator, "compute_report") as compute_task_report:
            reused = ProjectQualityCalculator().compute_report(project)
            self.assertEqual(reused.children.get().id, report.children.get().id)
            compute_task_report.assert_not_called()

        project.quality_settings.touch()
        self.assertFalse(ProjectQualityCalculator().is_task_report_relevant(reused.children.get()))

        engine.ValidationLayout.objects.filter(task_data=self.data).update(mode="gt_pool")
        with self.assertRaisesRegex(ValueError, "ordinary"):
            ProjectQualityCalculator().compute_report(project)
        engine.ValidationLayout.objects.filter(task_data=self.data).update(mode="gt")

        # This invalid persisted setting must be rejected even when a recent task
        # report is available. Validation cannot be limited to the queue endpoint.
        models.QualityRequirement.objects.create(
            settings=project.quality_settings,
            name="Invalid 2D requirement",
            annotation_type="rectangle",
            enabled=True,
            **models.QualityRequirement.get_base_defaults("rectangle"),
        )
        with self.assertRaisesRegex(ValueError, "only cuboid"):
            ProjectQualityCalculator().compute_report(project)

    def test_invalid_task_settings_prevent_job_report_creation(self):
        self.create_gt()
        self.enable()
        defaults = models.QualityRequirement.get_base_defaults("cuboid")
        for field_name, value in (
            ("compare_groups", True),
            ("iou_threshold", {"type": "iou", "mode": "constant", "value": 0.5}),
            ("similarity_metric", "boundary_f"),
        ):
            with self.subTest(field_name=field_name):
                models.QualityRequirement.objects.filter(pk=self.base.pk).update(
                    **{field_name: value}
                )
                with (
                    patch(
                        "cvat.apps.quality_control.quality_calculators.make_job_data_provider"
                    ) as make_provider,
                    self.assertRaises(ValueError),
                ):
                    TaskQualityCalculator().compute_report(self.task)
                make_provider.assert_not_called()
                self.assertFalse(models.QualityReport.objects.exists())
                models.QualityRequirement.objects.filter(pk=self.base.pk).update(
                    **{field_name: defaults[field_name]}
                )

    def test_task_creation_gt_and_gt_pool_rejection(self):
        _create_validation_jobs(
            self.task,
            {
                "mode": "gt",
                "frame_selection_method": "random_uniform",
                "frame_count": 2,
                "random_seed": 42,
            },
            images=list(self.data.images.all()),
        )
        self.assertEqual(
            engine.Job.objects.filter(segment__task=self.task, type="ground_truth").count(), 1
        )
        self.assertEqual(self.task.quality_settings.requirements.get().annotation_type, "cuboid")
        with self.assertRaisesRegex(Exception, "ordinary ground truth"):
            _create_validation_jobs(
                self.task, {"mode": "gt_pool"}, images=list(self.data.images.all())
            )

    def test_source_metadata_and_user_attributes_are_distinct(self):
        gt = self.create_gt()
        self.enable()
        spec = engine.AttributeSpec.objects.create(
            label=self.label,
            name="source",
            mutable=False,
            input_type="text",
            default_value="generated",
            values="",
        )
        engine.AttributeSpec.objects.create(
            label=self.label,
            name="track_id",
            mutable=False,
            input_type="text",
            default_value="external-id",
            values="",
        )
        shape = dict(
            type="cuboid",
            frame=0,
            label_id=self.label.id,
            points=[0, 0, 0, 0.31, -0.47, 0.83, 2, 3, 4] + [0] * 7,
            occluded=True,
            outside=False,
            attributes=[{"spec_id": spec.id, "value": "generated"}],
            group=0,
            source="manual",
            z_order=0,
            rotation=0,
        )
        annotations = {"version": 0, "tags": [], "shapes": [shape], "tracks": [], "intervals": []}
        put_job_data(gt.id, deepcopy(annotations))
        put_job_data(self.job.id, deepcopy(annotations))
        self.base.filter = json.dumps(
            {
                "and": [
                    {"==": [{"var": "shape.source"}, "manual"]},
                    {"==": [{"var": "shape.occluded"}, True]},
                    {"==": [{"var": "shape.attribute.name"}, "source"]},
                    {"==": [{"var": "shape.attribute.value"}, "generated"]},
                ]
            }
        )
        self.base.save()
        parsed = ComparisonReport.from_json(
            TaskQualityCalculator().compute_report(self.task).get_report_data()
        )
        self.assertEqual(parsed.groups["Base cuboid"].comparison_summary.score, 1)
        self.base.filter = ""
        self.base.attribute_comparison = {"rules": [{"spec_id": spec.id, "enabled": True}]}
        self.base.save()
        shape["attributes"] = [{"spec_id": spec.id, "value": "generateX"}]
        put_job_data(self.job.id, deepcopy(annotations))
        report = TaskQualityCalculator().compute_report(self.task)
        self.assertEqual(report.children.get(job=self.job).conflicts.count(), 2)
        self.base.attribute_comparison = {
            "rules": [
                {"spec_id": spec.id, "enabled": True, "comparator": "levenshtein", "threshold": 0.7}
            ]
        }
        self.base.save()
        report = TaskQualityCalculator().compute_report(self.task)
        self.assertEqual(report.children.get(job=self.job).conflicts.count(), 0)

    def test_settings_validation_inheritance_and_round_trip(self):
        self.create_gt()
        self.enable()
        serializer = QualityRequirementSerializer(
            data={
                "settings_id": self.base.settings_id,
                "parent_requirement": self.base.id,
                "name": "Cars",
                "annotation_type": "cuboid",
                "iou_threshold": 0.5,
                "required_score": 0.8,
            }
        )
        serializer.is_valid(raise_exception=True)
        child = serializer.save()
        self.assertIsNone(child.annotation_type)
        self.assertEqual(
            QualityRequirementSerializer(child).data["effective"]["annotation_type"], "cuboid"
        )
        for fields in [
            {"iou_threshold": {"type": "iou", "mode": "constant", "value": 0.5}},
            {"match_groups": True},
            {"group_match_threshold": 0.5},
            {"panoptic_comparison": True},
            {"filter": '{"var":"shape.track.area"}'},
            {"filter": '{"var":"shape.skeleton.label"}'},
        ]:
            with self.subTest(fields=fields):
                serializer = QualityRequirementSerializer(child, data=fields, partial=True)
                self.assertFalse(serializer.is_valid())
        settings = self.task.quality_settings
        serialized = QualitySettingsSerializer(settings).data
        serializer = QualitySettingsSerializer(
            settings, data={"requirements": serialized["requirements"]}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Historical settings above quota remain editable, but cannot grow.
        with override_settings(MAX_QUALITY_REQUIREMENTS_PER_SETTINGS=1):
            serializer = QualitySettingsSerializer(
                settings, data={"requirements": serialized["requirements"]}, partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

    def test_reading_settings_does_not_initialize_3d_requirements(self):
        image_task = engine.Task.objects.create(
            name="Existing 2D", owner=self.owner, dimension="2d", media_type="image"
        )
        segment = engine.Segment.objects.create(task=image_task, start_frame=0, stop_frame=0)
        engine.Job.objects.create(segment=segment, type=engine.JobType.GROUND_TRUTH)
        image_settings = image_task.quality_settings
        original_2d = list(image_settings.requirements.order_by("id").values())
        original_timestamp = image_settings.updated_date
        client = APIClient()
        client.force_authenticate(self.owner)

        for query in (
            {"task_id": self.task.id},
            {"settings_id": self.task.quality_settings.id},
        ):
            with self.subTest(query=query):
                response = client.get("/api/quality/settings/requirements", query)
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(response.data["count"], 0)

        settings = self.task.quality_settings
        response = client.get("/api/quality/settings", {"task_id": self.task.id})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["results"][0]["requirements"], [])
        response = client.patch(
            f"/api/quality/settings/{settings.id}", {"inherit": False}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["requirements"], [])
        self.assertFalse(settings.requirements.exists())

        self.create_gt()
        response = client.get("/api/quality/settings/requirements", {"task_id": self.task.id})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["annotation_type"], "cuboid")

        # Reads must not repair requirements even after a GT exists.
        settings.requirements.all().delete()
        settings.refresh_from_db()
        timestamp = settings.updated_date
        response = client.get("/api/quality/settings", {"task_id": self.task.id})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["results"][0]["requirements"], [])
        settings.refresh_from_db()
        self.assertEqual(settings.updated_date, timestamp)

        self.assertEqual(list(image_settings.requirements.order_by("id").values()), original_2d)
        image_settings.refresh_from_db()
        self.assertEqual(image_settings.updated_date, original_timestamp)

        response = client.get("/api/quality/settings/requirements", {"task_id": image_task.id})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["count"], 9)
        self.assertNotIn("cuboid", {r["annotation_type"] for r in response.data["results"]})

    def test_new_comparison_parameters_are_disabled_for_cuboids_by_default(self):
        self.create_gt()

        class FutureRequirementSerializer(QualityRequirementSerializer):
            future_flag = rest_serializers.BooleanField(required=False, allow_null=True)
            future_threshold = rest_serializers.FloatField(required=False, allow_null=True)

            class Meta(QualityRequirementSerializer.Meta):
                fields = (
                    *QualityRequirementSerializer.Meta.fields,
                    "future_flag",
                    "future_threshold",
                )

        future_fields = {
            "future_flag": django_models.BooleanField(name="future_flag", null=True),
            "future_threshold": django_models.FloatField(name="future_threshold", null=True),
        }
        metadata = models.QualityRequirement._meta
        get_field = metadata.get_field
        with (
            patch.object(
                models,
                "INHERITED_REQUIREMENT_FIELDS",
                (*models.INHERITED_REQUIREMENT_FIELDS, *future_fields),
            ),
            patch.object(metadata, "fields", (*metadata.fields, *future_fields.values())),
            patch.object(
                metadata,
                "get_field",
                side_effect=lambda name: (
                    future_fields[name] if name in future_fields else get_field(name)
                ),
            ),
            patch.object(models.DefaultComparisonSettings, "future_flag", True, create=True),
            patch.object(models.DefaultComparisonSettings, "future_threshold", 0.5, create=True),
        ):
            defaults = models.QualityRequirement.get_base_defaults("cuboid")
            self.assertIs(defaults["future_flag"], False)
            self.assertIsNone(defaults["future_threshold"])

            serializer = FutureRequirementSerializer(
                self.base, data={"future_flag": None, "future_threshold": None}, partial=True
            )
            serializer.is_valid(raise_exception=True)
            self.assertIs(serializer.validated_data["future_flag"], False)
            self.assertIsNone(serializer.validated_data["future_threshold"])

            requirement = SimpleNamespace(
                annotation_type="cuboid", enabled=True, filter="", **defaults
            )
            validate_quality_task(self.task, [requirement])
            for field_name, value in {"future_flag": True, "future_threshold": 0.5}.items():
                with self.subTest(field_name=field_name):
                    serializer = FutureRequirementSerializer(
                        self.base, data={field_name: value}, partial=True
                    )
                    self.assertFalse(serializer.is_valid())
                    self.assertIn(field_name, serializer.errors)

                    invalid_requirement = SimpleNamespace(
                        **{**vars(requirement), field_name: value}
                    )
                    with self.assertRaisesRegex(ValueError, field_name):
                        validate_quality_task(self.task, [invalid_requirement])

            # Declaring support in the backend must enable the parameters in
            # defaults, API validation and report validation together.
            capabilities = get_backend_capabilities("cuboid")
            updated_capabilities = replace(
                capabilities,
                supported_parameters=capabilities.supported_parameters | frozenset(future_fields),
            )
            with (
                patch.object(cuboid_capabilities, "CAPABILITIES", updated_capabilities),
                patch.object(Cuboid3DBackend, "capabilities", updated_capabilities),
            ):
                defaults = models.QualityRequirement.get_base_defaults("cuboid")
                self.assertIs(defaults["future_flag"], True)
                self.assertEqual(defaults["future_threshold"], 0.5)
                serializer = FutureRequirementSerializer(
                    self.base, data={"future_flag": True, "future_threshold": 0.5}, partial=True
                )
                serializer.is_valid(raise_exception=True)
                validate_quality_task(
                    self.task,
                    [
                        SimpleNamespace(
                            annotation_type="cuboid", enabled=True, filter="", **defaults
                        )
                    ],
                )

    def test_gt_initialization_preserves_existing_requirements_and_order(self):
        rectangle = models.QualityRequirement.objects.create(
            settings=self.task.quality_settings,
            name="Base rectangle",
            annotation_type="rectangle",
            enabled=False,
            **models.QualityRequirement.get_base_defaults("rectangle"),
        )
        custom = models.QualityRequirement.objects.create(
            settings=self.task.quality_settings,
            name="Legacy custom requirement",
            parent=rectangle,
            sort_order=42,
        )
        existing_requirements = list(
            self.task.quality_settings.requirements.order_by("id").values()
        )
        old_timestamp = self.task.quality_settings.updated_date
        self.create_gt()
        custom.refresh_from_db()
        self.assertEqual(custom.name, "Legacy custom requirement")
        base = self.task.quality_settings.requirements.get(annotation_type="cuboid", parent=None)
        self.assertEqual(base.name, "Base cuboid")
        self.assertEqual(base.sort_order, 43)
        self.assertFalse(base.enabled)
        self.assertEqual(
            list(
                self.task.quality_settings.requirements.exclude(id=base.id).order_by("id").values()
            ),
            existing_requirements,
        )
        # Recreating the GT must preserve the base and its configuration.
        base.enabled = True
        base.iou_threshold = 0.8
        base.save()
        gt = engine.Job.objects.get(segment__task=self.task, type="ground_truth")
        gt.delete()
        self.create_gt()
        self.assertEqual(self.base.id, base.id)
        self.assertTrue(self.base.enabled)
        self.assertEqual(self.base.iou_threshold, 0.8)
        self.assertEqual(
            self.task.quality_settings.requirements.filter(
                annotation_type="cuboid", parent=None
            ).count(),
            1,
        )
        self.task.quality_settings.refresh_from_db()
        self.assertGreater(self.task.quality_settings.updated_date, old_timestamp)
