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
        cls.other_job = models.Job.objects.create(segment=segment)
        label = models.Label.objects.create(task=task, name="car", type=models.ShapeType.CUBOID)
        cls.shape = models.LabeledShape.objects.create(
            job=cls.job, frame=1, label=label, type=models.ShapeType.CUBOID, points=CUBOID
        )
        cls.track = models.LabeledTrack.objects.create(job=cls.job, frame=0, label=label)

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
        for field in ("end_frame", "object_id", "object_type", "view"):
            self.assertIsNone(response.data[field])
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
        self.assertIsNone(response.data["object_id"])
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

    def test_can_link_a_shape_or_track_in_the_same_job(self) -> None:
        for object_type, annotation in (
            (models.Issue.ObjectType.SHAPE, self.shape),
            (models.Issue.ObjectType.TRACK, self.track),
        ):
            with self.subTest(object_type=object_type):
                response = self.create_issue(object_id=annotation.id, object_type=object_type)

                self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
                issue = self.client.get(f"/api/issues/{response.data['id']}").data
                self.assertEqual(issue["object_type"], object_type)
                self.assertEqual(issue["object_id"], annotation.id)

    def test_can_clear_an_annotation_reference(self) -> None:
        response = self.create_issue(
            object_id=self.track.id, object_type=models.Issue.ObjectType.TRACK
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        response = self.client.patch(
            f"/api/issues/{response.data['id']}",
            {"object_id": None, "object_type": None},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIsNone(response.data["object_id"])
        self.assertIsNone(response.data["object_type"])

    def test_cannot_link_an_incomplete_or_cross_job_reference(self) -> None:
        shape = models.Issue.ObjectType.SHAPE
        cases = (
            ({"object_id": self.shape.id}, "object_id"),
            ({"object_id": self.shape.id, "object_type": ""}, "object_type"),
            (
                {"job": self.other_job.id, "object_id": self.shape.id, "object_type": shape},
                "object_id",
            ),
        )
        for context, field in cases:
            with self.subTest(context=context):
                response = self.create_issue(**context)

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(field, response.data)

    def test_annotation_edits_and_deletion_preserve_the_issue(self) -> None:
        response = self.create_issue(
            object_id=self.shape.id, object_type=models.Issue.ObjectType.SHAPE
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        issue_url = f"/api/issues/{response.data['id']}"
        annotation_url = f"/api/jobs/{self.job.id}/annotations"
        annotation = self.client.get(annotation_url).data["shapes"][0]
        annotation["points"] = [2, 3, 4, *CUBOID[3:]]
        annotations = {"shapes": [annotation], "tracks": [], "tags": []}
        response = self.client.patch(f"{annotation_url}?action=update", annotations, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["shapes"][0]["id"], self.shape.id)
        self.assertEqual(self.client.get(issue_url).data["object_id"], self.shape.id)

        response = self.client.patch(f"{annotation_url}?action=delete", annotations, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(self.client.get(annotation_url).data["shapes"], [])

        response = self.client.patch(issue_url, {"resolved": True}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["object_id"], self.shape.id)
        self.assertTrue(response.data["resolved"])

    def test_frame_ranges_can_be_updated_within_the_job(self) -> None:
        response = self.create_issue(end_frame=3)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        issue_url = f"/api/issues/{response.data['id']}"

        for end_frame in (0, 6):
            with self.subTest(end_frame=end_frame):
                response = self.client.patch(issue_url, {"end_frame": end_frame}, format="json")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("end_frame", response.data)
        self.assertEqual(self.client.get(issue_url).data["end_frame"], 3)

        response = self.client.patch(issue_url, {"end_frame": 5}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["end_frame"], 5)
