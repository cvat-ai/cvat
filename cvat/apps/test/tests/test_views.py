# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework import status
from rest_framework.test import APITestCase

from cvat.apps.engine import models
from cvat.apps.engine.tests.utils import ForceLogin
from cvat.apps.iam.models import User

URL = "/api/label-counts"


class LabelCountsViewTest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="password")
        self.other = User.objects.create_user(username="other", password="password")

        data = models.Data.objects.create(size=1, stop_frame=0)
        self.task = models.Task.objects.create(name="task", owner=self.owner, data=data)
        segment = models.Segment.objects.create(task=self.task, start_frame=0, stop_frame=0)
        job = models.Job.objects.create(segment=segment)
        cat = models.Label.objects.create(task=self.task, name="cat", color="#000000")
        models.Label.objects.create(task=self.task, name="dog", color="#ffffff")
        for _ in range(2):
            models.LabeledShape.objects.create(
                job=job,
                label=cat,
                frame=0,
                type=models.ShapeType.RECTANGLE,
                points=[0, 0, 1, 1],
            )

    def _get(self, user, **params):
        with ForceLogin(user, self.client):
            return self.client.get(URL, params)

    def test_anonymous_user_gets_401(self):
        response = self._get(None, task_id=self.task.id)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_task_id_gets_400(self):
        response = self._get(self.owner)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_integer_task_id_gets_400(self):
        response = self._get(self.owner, task_id="abc")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_task_gets_404(self):
        response = self._get(self.owner, task_id=self.task.id + 1000)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_without_access_to_the_task_gets_403(self):
        response = self._get(self.other, task_id=self.task.id)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_gets_counts(self):
        response = self._get(self.owner, task_id=self.task.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json()["task_id"], self.task.id)
        self.assertIsNone(response.json()["job_id"])
        self.assertEqual(response.json()["total"], 2)
        self.assertEqual(
            [(label["name"], label["count"]) for label in response.json()["labels"]],
            [("cat", 2), ("dog", 0)],
        )
