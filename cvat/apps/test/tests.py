# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Unit and integration tests for cvat.apps.test (analytics).

Tests cover:
  1. Aggregation correctness: shapes + tags + tracks, multiple labels, empty task
  2. Permission denial (403)
  3. Distinct-frame counting (same frame in shape + track should count once)
  4. Non-outside tracked shapes only
  5. API endpoint parameter validation

Run with:
  python manage.py test cvat.apps.test
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class ClassCountServiceTest(TestCase):
    """Tests for the service.get_class_counts function."""

    fixtures = []  # no fixtures; we create objects in setUp

    def setUp(self):
        """
        Create minimal DB objects:
          - superuser
          - org (none — sandbox mode)
          - project → task → segment → job
          - labels: car, person
          - annotations of various types
        """
        from cvat.apps.engine.models import (
            Data,
            Job,
            Label,
            LabeledImage,
            LabeledShape,
            LabeledTrack,
            Project,
            Segment,
            ShapeType,
            Task,
            TaskMode,
            TrackedShape,
        )

        self.user = User.objects.create_superuser(
            username="test_admin",
            email="admin@test.com",
            password="testpass",
        )

        # Minimal Task (no Data to avoid media-file complexity)
        self.task = Task.objects.create(
            name="Test Task",
            owner=self.user,
            mode=TaskMode.ANNOTATION,
        )

        # Create a Segment manually
        self.data = Data.objects.create(
            image_quality=70,
            start_frame=0,
            stop_frame=9,
        )
        self.task.data = self.data
        self.task.save()

        self.segment = Segment.objects.create(
            task=self.task,
            start_frame=0,
            stop_frame=9,
        )
        self.job = Job.objects.create(segment=self.segment)

        # Labels
        self.label_car = Label.objects.create(task=self.task, name="car", color="#ff0000")
        self.label_person = Label.objects.create(task=self.task, name="person", color="#00ff00")

        # Annotations:
        # car: tag on frame 0, shape on frame 0 (same frame → distinct=1), shape on frame 1
        LabeledImage.objects.create(job=self.job, label=self.label_car, frame=0, group=0)
        LabeledShape.objects.create(
            job=self.job, label=self.label_car, frame=0, group=0,
            type=ShapeType.RECTANGLE, points=[0, 0, 10, 10],
        )
        LabeledShape.objects.create(
            job=self.job, label=self.label_car, frame=1, group=0,
            type=ShapeType.RECTANGLE, points=[0, 0, 10, 10],
        )

        # person: track with 3 non-outside frames + 1 outside frame
        track = LabeledTrack.objects.create(job=self.job, label=self.label_person, frame=2, group=0)
        TrackedShape.objects.create(track=track, frame=2, type=ShapeType.RECTANGLE, points=[0, 0, 1, 1], outside=False)
        TrackedShape.objects.create(track=track, frame=3, type=ShapeType.RECTANGLE, points=[0, 0, 1, 1], outside=False)
        TrackedShape.objects.create(track=track, frame=4, type=ShapeType.RECTANGLE, points=[0, 0, 1, 1], outside=False)
        TrackedShape.objects.create(track=track, frame=5, type=ShapeType.RECTANGLE, points=[0, 0, 1, 1], outside=True)

    def _counts_by_name(self, counts):
        return {c["label_name"]: c for c in counts}

    def test_distinct_frame_count_same_frame(self):
        """Tag and shape on same frame should count as 1 distinct frame."""
        from cvat.apps.test.service import get_class_counts
        counts = get_class_counts(task_id=self.task.id)
        by_name = self._counts_by_name(counts)
        # car: tag frame0, shape frame0, shape frame1 → 2 distinct frames
        self.assertEqual(by_name["car"]["image_count"], 2)

    def test_annotation_count(self):
        """Total annotation count includes all annotation types."""
        from cvat.apps.test.service import get_class_counts
        counts = get_class_counts(task_id=self.task.id)
        by_name = self._counts_by_name(counts)
        # car: 1 tag + 2 shapes = 3
        self.assertEqual(by_name["car"]["annotation_count"], 3)

    def test_track_outside_excluded(self):
        """Outside tracked shapes must NOT be counted."""
        from cvat.apps.test.service import get_class_counts
        counts = get_class_counts(task_id=self.task.id)
        by_name = self._counts_by_name(counts)
        # person: frames 2, 3, 4 are non-outside → 3 distinct frames
        self.assertEqual(by_name["person"]["image_count"], 3)

    def test_empty_label_zero_counts(self):
        """Labels with no annotations must be included with zero counts."""
        from cvat.apps.engine.models import Label
        from cvat.apps.test.service import get_class_counts
        Label.objects.create(task=self.task, name="bicycle", color="#0000ff")
        counts = get_class_counts(task_id=self.task.id)
        by_name = self._counts_by_name(counts)
        self.assertIn("bicycle", by_name)
        self.assertEqual(by_name["bicycle"]["image_count"], 0)
        self.assertEqual(by_name["bicycle"]["annotation_count"], 0)

    def test_job_scope(self):
        """Job-scoped query returns same results as task when there's one job."""
        from cvat.apps.test.service import get_class_counts
        task_counts = get_class_counts(task_id=self.task.id)
        job_counts = get_class_counts(job_id=self.job.id)
        task_by_name = self._counts_by_name(task_counts)
        job_by_name = self._counts_by_name(job_counts)
        self.assertEqual(
            task_by_name["car"]["image_count"],
            job_by_name["car"]["image_count"],
        )

    def test_exclusive_scope_validation(self):
        """Providing more than one scope param raises ValueError."""
        from cvat.apps.test.service import get_class_counts
        with self.assertRaises(ValueError):
            get_class_counts(task_id=self.task.id, job_id=self.job.id)


class ClassCountAPITest(TestCase):
    """Tests for the REST endpoint."""

    def setUp(self):
        from cvat.apps.engine.models import (
            Data,
            Job,
            Label,
            Segment,
            Task,
            TaskMode,
        )

        self.client = APIClient()
        self.user = User.objects.create_user(
            username="api_user",
            password="testpass",
            email="api@test.com",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            password="testpass",
            email="other@test.com",
        )

        self.task = Task.objects.create(
            name="API Test Task",
            owner=self.user,
            mode=TaskMode.ANNOTATION,
        )
        data = Data.objects.create(image_quality=70, start_frame=0, stop_frame=4)
        self.task.data = data
        self.task.save()

        seg = Segment.objects.create(task=self.task, start_frame=0, stop_frame=4)
        self.job = Job.objects.create(segment=seg)
        self.label_a = Label.objects.create(task=self.task, name="alpha", color="#aabbcc")

    def test_missing_scope_returns_400(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/api/test/class-counts")
        self.assertEqual(resp.status_code, 400)

    def test_multiple_scopes_returns_400(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(
            f"/api/test/class-counts?task_id={self.task.id}&job_id={self.job.id}"
        )
        self.assertEqual(resp.status_code, 400)

    def test_unauthenticated_returns_403(self):
        resp = self.client.get(f"/api/test/class-counts?task_id={self.task.id}")
        self.assertIn(resp.status_code, (401, 403))

    def test_owner_can_access(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f"/api/test/class-counts?task_id={self.task.id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("counts", data)
        self.assertIn("scope", data)

    def test_unrelated_user_denied(self):
        self.client.force_authenticate(user=self.other_user)
        resp = self.client.get(f"/api/test/class-counts?task_id={self.task.id}")
        self.assertEqual(resp.status_code, 403)

    def test_nonexistent_task_returns_404(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/api/test/class-counts?task_id=99999999")
        self.assertEqual(resp.status_code, 404)

    def test_response_schema(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f"/api/test/class-counts?task_id={self.task.id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("counts", data)
        self.assertIn("scope", data)
        for item in data["counts"]:
            self.assertIn("label_id", item)
            self.assertIn("label_name", item)
            self.assertIn("color", item)
            self.assertIn("image_count", item)
            self.assertIn("annotation_count", item)
