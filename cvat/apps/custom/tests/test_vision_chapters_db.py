# Copyright (C) 2026 CVAT Custom Vision Module
# SPDX-License-Identifier: MIT

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from cvat.apps.custom.models import TaskVisionAnalysis
from cvat.apps.custom.tests.test_vision_chapters import DOC
from cvat.apps.engine.models import Task


class TaskChaptersViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("onprem", password="pw")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.task = Task.objects.create(name="1786288643", owner=self.user)
        self.url = f"/api/custom/tasks/{self.task.id}/chapters/"

    def test_get_before_any_push_is_404(self):
        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_post_then_get_round_trips_the_document(self):
        resp = self.client.post(self.url, DOC, format="json")
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(resp.data["created"])
        self.assertEqual(resp.data["summary"]["car_count"], 2)

        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["chapters"], DOC)
        self.assertEqual(resp.data["summary"]["trimmed"], True)

    def test_second_post_replaces_not_duplicates(self):
        self.client.post(self.url, DOC, format="json")
        again = dict(DOC, cars=DOC["cars"][:1], needs_review=True)
        resp = self.client.post(self.url, again, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["created"])
        self.assertEqual(TaskVisionAnalysis.objects.filter(task=self.task).count(), 1)
        row = TaskVisionAnalysis.objects.get(task=self.task)
        self.assertEqual((row.car_count, row.needs_review), (1, True))

    def test_invalid_document_is_rejected_with_reasons(self):
        resp = self.client.post(self.url, {"schema_version": 1}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("video.duration_s must be a positive number", resp.data["details"])

    def test_unknown_task_is_404(self):
        resp = self.client.post("/api/custom/tasks/999999/chapters/", DOC, format="json")
        self.assertEqual(resp.status_code, 404)

    def test_requires_authentication(self):
        anon = APIClient()
        self.assertEqual(anon.get(self.url).status_code, 401)
        self.assertEqual(anon.post(self.url, DOC, format="json").status_code, 401)

    def test_task_list_carries_the_summary(self):
        self.client.post(self.url, DOC, format="json")
        resp = self.client.get("/api/custom/tasks-paginated/?page=1&page_size=5")
        self.assertEqual(resp.status_code, 200, getattr(resp, "data", None))
        rows = {t["task_id"]: t for t in resp.data["tasks"]} if "tasks" in resp.data else \
               {t["task_id"]: t for t in resp.data["results"]}
        self.assertEqual(rows[self.task.id]["vision"]["car_count"], 2)
