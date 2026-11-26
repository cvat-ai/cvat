# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APITestCase

from cvat.apps.engine import models
from cvat.apps.iam.models import User

CUBOID = [1, 2, 3, 0, 0, 0.2, 4, 5, 6, 0, 0, 0, 0, 0, 0, 0]
CAMERA_VIEW = {"position": [10, -5, 8], "target": [0, 0, 1], "up": [0, 0, 1], "zoom": 1.5}


class IssueReviewContextTest(APITestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.reviewer = User.objects.create_superuser(username="reviewer", email="", password=None)
        data = models.Data.objects.create(
            size=6, start_frame=10, stop_frame=20, frame_filter="step=2"
        )
        task = models.Task.objects.create(
            name="3D review",
            data=data,
            dimension=models.DimensionType.DIM_3D,
            media_type=models.MediaType.POINT_CLOUD,
        )
        segment = models.Segment.objects.create(task=task, start_frame=0, stop_frame=5)
        cls.job = models.Job.objects.create(segment=segment)
        label = models.Label.objects.create(task=task, name="car", type=models.ShapeType.CUBOID)
        cls.shape = models.LabeledShape.objects.create(
            job=cls.job, frame=1, label=label, type=models.ShapeType.CUBOID, points=CUBOID
        )

    def setUp(self) -> None:
        super().setUp()
        self.client.force_authenticate(user=self.reviewer)

    def create_issue(self, **context: Any) -> Response:
        return self.client.post(
            "/api/issues",
            {
                "job": self.job.id,
                "frame": 1,
                "position": [0, 0, 1],
                "message": "Check this object",
                **context,
            },
            format="json",
        )

    def test_can_create_point_issue_on_a_task_relative_frame(self) -> None:
        response = self.create_issue()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["position"], [0, 0, 1])
        self.assertEqual(response.data["frame"], 1)
        self.assertIsNone(response.data["view"])
        comments = self.client.get(response.data["comments"]["url"])
        self.assertEqual(comments.data["results"][0]["message"], "Check this object")

    def test_cannot_create_a_3d_issue_outside_the_job(self) -> None:
        response = self.create_issue(frame=6)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("frame", response.data)

    def test_can_move_a_cuboid_issue_without_editing_the_annotation(self) -> None:
        response = self.create_issue(position=CUBOID)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["position"], CUBOID)
        updated = [7, 8, 9, *CUBOID[3:]]
        issue_url = f"/api/issues/{response.data['id']}"

        response = self.client.patch(issue_url, {"position": updated}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(self.client.get(issue_url).data["position"], updated)
        self.assertEqual(response.data["comments"]["count"], 1)
        annotation = self.client.get(f"/api/jobs/{self.job.id}/annotations").data["shapes"][0]
        self.assertEqual(annotation["points"], CUBOID)

    def test_cannot_save_invalid_3d_positions(self) -> None:
        for position in ([1, 2], [0, 0, "inf"], [*CUBOID[:6], 0, *CUBOID[7:]]):
            with self.subTest(position=position):
                response = self.create_issue(position=position)

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("position", response.data)

    def test_camera_view_is_saved_at_creation(self) -> None:
        response = self.create_issue(view=CAMERA_VIEW)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["view"], CAMERA_VIEW)
        issue_url = f"/api/issues/{response.data['id']}"

        response = self.client.patch(
            issue_url, {"resolved": True, "view": {**CAMERA_VIEW, "zoom": 2}}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["resolved"])
        self.assertEqual(self.client.get(issue_url).data["view"], CAMERA_VIEW)

    def test_cannot_save_invalid_camera_views(self) -> None:
        for changes in (
            {"position": [1, 2]},
            {"position": CAMERA_VIEW["target"]},
            {"up": [0, 0, 0]},
            {"zoom": 0},
            {"zoom": "inf"},
        ):
            with self.subTest(changes=changes):
                response = self.create_issue(view={**CAMERA_VIEW, **changes})

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("view", response.data)

    def test_camera_view_is_rejected_for_2d_issues(self) -> None:
        data = models.Data.objects.create(size=2, stop_frame=1)
        task = models.Task.objects.create(
            name="2D review", data=data, media_type=models.MediaType.IMAGE
        )
        segment = models.Segment.objects.create(task=task, start_frame=0, stop_frame=1)
        job = models.Job.objects.create(segment=segment)

        response = self.create_issue(job=job.id, position=[0, 0, 1, 1], view=CAMERA_VIEW)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("view", response.data)

    def test_annotation_edits_and_deletion_preserve_the_issue(self) -> None:
        response = self.create_issue(position=CUBOID)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        issue_url = f"/api/issues/{response.data['id']}"
        annotation_url = f"/api/jobs/{self.job.id}/annotations"
        annotation = self.client.get(annotation_url).data["shapes"][0]
        annotation["points"] = [2, 3, 4, *CUBOID[3:]]
        annotations = {"shapes": [annotation], "tracks": [], "tags": []}
        response = self.client.patch(f"{annotation_url}?action=update", annotations, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["shapes"][0]["id"], self.shape.id)
        self.assertEqual(self.client.get(issue_url).data["position"], CUBOID)

        response = self.client.patch(f"{annotation_url}?action=delete", annotations, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(self.client.get(annotation_url).data["shapes"], [])

        response = self.client.patch(issue_url, {"resolved": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["position"], CUBOID)
        self.assertTrue(response.data["resolved"])
