# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import time
from rest_framework import status
from rest_framework.test import APITestCase

from cvat.apps.engine.models import Job, Label, LabeledShape, Segment, ShapeType, Task
from cvat.apps.iam.models import User


class AnnotationAnalyticsAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="task_owner", password="password123", email="owner@example.com"
        )
        self.other_user = User.objects.create_user(
            username="other_user", password="password123", email="other@example.com"
        )

        self.task = Task.objects.create(name="Analytics Test Task", owner=self.owner)
        self.segment = Segment.objects.create(task=self.task, start_frame=0, stop_frame=100)
        self.job = Job.objects.create(segment=self.segment)

        self.label_car = Label.objects.create(task=self.task, name="car", color="#ff0000")
        self.label_person = Label.objects.create(task=self.task, name="person", color="#00ff00")

    def _create_sample_shapes(self):
        LabeledShape.objects.create(
            job=self.job, label=self.label_car, type=ShapeType.RECTANGLE.value, frame=0, points=[0, 0, 10, 10]
        )
        LabeledShape.objects.create(
            job=self.job, label=self.label_car, type=ShapeType.RECTANGLE.value, frame=1, points=[1, 1, 11, 11]
        )
        LabeledShape.objects.create(
            job=self.job, label=self.label_car, type=ShapeType.POLYGON.value, frame=2, points=[0, 0, 5, 5, 0, 5]
        )
        LabeledShape.objects.create(
            job=self.job, label=self.label_person, type=ShapeType.RECTANGLE.value, frame=3, points=[2, 2, 8, 8]
        )

    def test_unauthenticated_request_rejected(self):
        url = f"/api/test/tasks/{self.task.id}/annotation-counts"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthorized_user_forbidden(self):
        self.client.force_authenticate(user=self.other_user)
        url = f"/api/test/tasks/{self.task.id}/annotation-counts"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_empty_task_returns_zero_counts(self):
        self.client.force_authenticate(user=self.owner)
        url = f"/api/test/tasks/{self.task.id}/annotation-counts"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["task_id"], self.task.id)
        self.assertEqual(response.data["total_annotations"], 0)
        self.assertEqual(response.data["counts"], [])

    def test_per_class_counts_aggregation(self):
        self._create_sample_shapes()
        self.client.force_authenticate(user=self.owner)
        url = f"/api/test/tasks/{self.task.id}/annotation-counts"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["task_id"], self.task.id)
        self.assertEqual(response.data["total_annotations"], 4)

        counts_map = {item["label_name"]: item["count"] for item in response.data["counts"]}
        self.assertEqual(counts_map.get("car"), 3)
        self.assertEqual(counts_map.get("person"), 1)

    def test_shape_type_filtering(self):
        self._create_sample_shapes()
        self.client.force_authenticate(user=self.owner)

        url = f"/api/test/tasks/{self.task.id}/annotation-counts?shape_type=polygon"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["shape_type"], "polygon")
        self.assertEqual(response.data["total_annotations"], 1)
        self.assertEqual(len(response.data["counts"]), 1)
        self.assertEqual(response.data["counts"][0]["label_name"], "car")
        self.assertEqual(response.data["counts"][0]["count"], 1)

    def test_invalid_shape_type_returns_400(self):
        self.client.force_authenticate(user=self.owner)
        url = f"/api/test/tasks/{self.task.id}/annotation-counts?shape_type=invalid_shape"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_task_returns_404(self):
        self.client.force_authenticate(user=self.owner)
        url = "/api/test/tasks/999999/annotation-counts"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_benchmark_latency_five_runs(self):
        self._create_sample_shapes()
        self.client.force_authenticate(user=self.owner)
        url = f"/api/test/tasks/{self.task.id}/annotation-counts"

        timings = []
        for _ in range(5):
            start = time.perf_counter()
            response = self.client.get(url)
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            timings.append(elapsed_ms)

        timings.sort()
        median = timings[2]
        spread = timings[-1] - timings[0]
        self.assertLess(median, 200.0)

    def test_annotation_mutation_signal_dispatched(self):
        from unittest.mock import patch
        with patch("cvat.apps.test.signals.broadcast_annotation_change") as mock_broadcast:
            self._create_sample_shapes()
            self.assertTrue(mock_broadcast.called)
            # Verify called with the task id
            call_args = [call[0][0] for call in mock_broadcast.call_args_list]
            self.assertIn(self.task.id, call_args)

