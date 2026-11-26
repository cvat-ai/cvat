# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db import transaction
from django.test import TestCase

from cvat.apps.engine.models import Data, Job, JobType, Project, Segment, Task
from cvat.apps.quality_control import models
from cvat.apps.quality_control.data_providers import QualitySettingsManager
from cvat.apps.quality_control.serializers import QualitySettingsSerializer

TYPES_2D = (
    "tag",
    "rectangle",
    "skeleton",
    "skeleton_keypoint",
    "points",
    "polyline",
    "mask",
    "polygon",
    "ellipse",
)


class TestQualitySettingsInitialization(TestCase):
    def create_cloud_task(self, **kwargs):
        data = Data.objects.create(size=1, chunk_size=1, image_quality=100)
        return Task.objects.create(
            name="3D", dimension="3d", media_type="point_cloud", data=data, **kwargs
        )

    def create_gt(self, task):
        segment = Segment.objects.create(task=task, start_frame=0, stop_frame=0)
        return Job.objects.create(segment=segment, type=JobType.GROUND_TRUTH)

    def assert_types(self, settings, expected):
        self.assertEqual(
            tuple(
                settings.requirements.filter(parent=None)
                .order_by("sort_order")
                .values_list("annotation_type", flat=True)
            ),
            expected,
        )

    def test_2d_and_3d_requirements_are_initialized_only_by_gt_creation(self):
        for dimension, media_type, expected in (
            ("2d", "image", TYPES_2D),
            ("3d", "point_cloud", ("cuboid",)),
        ):
            with self.subTest(dimension=dimension):
                data = Data.objects.create(size=1, chunk_size=1, image_quality=100)
                task = Task.objects.create(
                    name=dimension, dimension=dimension, media_type=media_type, data=data
                )
                settings = task.quality_settings
                self.assert_types(settings, ())
                self.create_gt(task)
                self.assert_types(settings, expected)
                before = list(settings.requirements.order_by("id").values())
                settings.refresh_from_db()
                timestamp = settings.updated_date
                self.assertFalse(models.ensure_base_quality_requirements(settings))
                self.assertEqual(list(settings.requirements.order_by("id").values()), before)
                settings.refresh_from_db()
                self.assertEqual(settings.updated_date, timestamp)

    def test_data_upload_without_gt_does_not_initialize_requirements(self):
        for dimension, media_type, expected in (
            ("2d", "image", ()),
            ("3d", "point_cloud", ()),
            ("1d", "audio", ()),
        ):
            with self.subTest(dimension=dimension):
                project = Project.objects.create(name=dimension)
                pending = Task.objects.create(name="pending", project=project)
                new_task = Task.objects.create(name="upload", project=project)
                self.assert_types(project.quality_settings, ())
                self.assert_types(new_task.quality_settings, ())
                new_task.dimension = dimension
                new_task.media_type = media_type
                new_task.save(update_fields=["dimension", "media_type"])
                self.assert_types(new_task.quality_settings, expected)
                self.assert_types(project.quality_settings, expected)
                self.assert_types(pending.quality_settings, ())
                serialized = QualitySettingsSerializer(project.quality_settings).data
                self.assertEqual(
                    tuple(r["annotation_type"] for r in serialized["requirements"]), expected
                )

    def test_gt_initializes_only_its_task_and_preserves_other_settings(self):
        image_task = Task.objects.create(name="2D", dimension="2d", media_type="image")
        self.create_gt(image_task)
        target = self.create_cloud_task()
        untouched = self.create_cloud_task()
        before = list(models.QualitySettings.objects.exclude(task=target).order_by("id").values())
        before_requirements = list(models.QualityRequirement.objects.order_by("id").values())
        segment = Segment.objects.create(task=target, start_frame=0, stop_frame=0)
        annotation_job = Job.objects.create(segment=segment)
        annotation_job.save()
        self.assert_types(target.quality_settings, ())

        gt = self.create_gt(target)
        settings = target.quality_settings
        base = settings.requirements.get()
        self.assertEqual(base.annotation_type, "cuboid")
        self.assertEqual(base.name, "Base cuboid")
        self.assertFalse(base.enabled)
        self.assert_types(untouched.quality_settings, ())
        self.assert_types(image_task.quality_settings, TYPES_2D)
        self.assertEqual(
            list(models.QualitySettings.objects.exclude(task=target).order_by("id").values()),
            before,
        )
        self.assertEqual(
            list(models.QualityRequirement.objects.exclude(pk=base.pk).order_by("id").values()),
            before_requirements,
        )

        base.enabled = True
        base.save()
        before = list(settings.requirements.values())
        settings.refresh_from_db()
        timestamp = settings.updated_date
        gt.save()
        self.assertEqual(list(settings.requirements.values()), before)
        settings.refresh_from_db()
        self.assertEqual(settings.updated_date, timestamp)

    def test_gt_initialization_uses_the_dimension_detected_during_upload(self):
        for dimension, media_type, expected in (
            ("2d", "image", TYPES_2D),
            ("3d", "point_cloud", ("cuboid",)),
        ):
            with self.subTest(dimension=dimension):
                project = Project.objects.create(name=dimension)
                data = Data.objects.create(size=1, chunk_size=1, image_quality=100)
                task = Task.objects.create(name="Uploading", project=project, data=data)
                task.dimension = dimension
                task.media_type = media_type
                self.create_gt(task)
                self.assert_types(task.quality_settings, expected)
                task.save()
                self.assert_types(project.quality_settings, expected)

    def test_2d_project_requirements_are_created_by_gt_and_inherited(self):
        project = Project.objects.create(name="2D project")
        task = Task.objects.create(name="2D", dimension="2d", media_type="image", project=project)
        sibling = Task.objects.create(
            name="Other 2D", dimension="2d", media_type="image", project=project
        )
        self.assert_types(project.quality_settings, ())
        self.create_gt(task)
        self.assert_types(task.quality_settings, TYPES_2D)
        self.assert_types(project.quality_settings, TYPES_2D)
        self.assert_types(sibling.quality_settings, ())
        self.assertTrue(task.quality_settings.inherit)
        self.assertEqual(
            QualitySettingsManager().get_task_settings(task).id, project.quality_settings.id
        )

    def test_project_requirements_are_initialized_by_its_first_gt_and_inherited(self):
        project = Project.objects.create(name="3D project")
        task = self.create_cloud_task(project=project)
        sibling = self.create_cloud_task(project=project)
        other_project = Project.objects.create(name="Other project")
        other_task = self.create_cloud_task(project=other_project)
        untouched_ids = (
            sibling.quality_settings.id,
            other_task.quality_settings.id,
            other_project.quality_settings.id,
        )
        before = list(
            models.QualitySettings.objects.filter(id__in=untouched_ids).order_by("id").values()
        )
        manager = QualitySettingsManager()
        manager.get_task_settings(task)
        manager.get_task_settings(task, inherit=False)
        manager.get_project_settings(project)
        self.assertEqual(
            QualitySettingsSerializer(project.quality_settings).data["requirements"], []
        )
        self.assert_types(task.quality_settings, ())
        self.assert_types(project.quality_settings, ())

        self.create_gt(task)
        self.assert_types(task.quality_settings, ("cuboid",))
        self.assert_types(project.quality_settings, ("cuboid",))
        self.assertTrue(task.quality_settings.inherit)
        self.assertEqual(manager.get_task_settings(task).id, project.quality_settings.id)
        self.assert_types(sibling.quality_settings, ())
        self.assert_types(other_task.quality_settings, ())
        self.assert_types(other_project.quality_settings, ())
        self.assertEqual(
            list(
                models.QualitySettings.objects.filter(id__in=untouched_ids).order_by("id").values()
            ),
            before,
        )

        project_base = project.quality_settings.requirements.get()
        project_base.enabled = True
        project_base.save()
        project.quality_settings.refresh_from_db()
        timestamp = project.quality_settings.updated_date
        self.create_gt(sibling)
        self.assert_types(sibling.quality_settings, ("cuboid",))
        self.assertEqual(manager.get_task_settings(sibling).id, project.quality_settings.id)
        self.assertEqual(project.quality_settings.requirements.get().id, project_base.id)
        self.assertTrue(project.quality_settings.requirements.get().enabled)
        project.quality_settings.refresh_from_db()
        self.assertEqual(project.quality_settings.updated_date, timestamp)

    def test_moving_a_gt_task_initializes_only_its_new_project(self):
        task = self.create_cloud_task()
        self.create_gt(task)
        base_id = task.quality_settings.requirements.get().id
        project = Project.objects.create(name="New project")
        sibling = self.create_cloud_task(project=project)
        task.project = project
        task.save(update_fields=["project"])
        self.assert_types(project.quality_settings, ("cuboid",))
        self.assertEqual(task.quality_settings.requirements.get().id, base_id)
        self.assert_types(sibling.quality_settings, ())
        self.assertEqual(
            QualitySettingsManager().get_task_settings(task).id, project.quality_settings.id
        )

    def test_failed_gt_creation_rolls_back_task_and_project_requirements(self):
        project = Project.objects.create(name="3D project")
        task = self.create_cloud_task(project=project)
        before = list(models.QualitySettings.objects.order_by("id").values())
        with self.assertRaisesRegex(ValueError, "creation failed"):
            with transaction.atomic():
                self.create_gt(task)
                raise ValueError("GT creation failed")
        self.assertFalse(Job.objects.filter(type=JobType.GROUND_TRUTH).exists())
        self.assertFalse(models.QualityRequirement.objects.exists())
        self.assertEqual(list(models.QualitySettings.objects.order_by("id").values()), before)
