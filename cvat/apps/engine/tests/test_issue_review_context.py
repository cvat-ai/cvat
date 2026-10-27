# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.test import TestCase

from cvat.apps.engine import models
from cvat.apps.engine.serializers import IssueReadSerializer, IssueWriteSerializer


class IssueReviewContextTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        data = models.Data.objects.create(size=6, stop_frame=5)
        task = models.Task.objects.create(name="3D review", data=data, dimension="3d")
        segment = models.Segment.objects.create(task=task, start_frame=0, stop_frame=5)
        cls.job = models.Job.objects.create(segment=segment)
        cls.other_job = models.Job.objects.create(segment=segment)
        label = models.Label.objects.create(task=task, name="car", type="cuboid")
        cls.shape = models.LabeledShape.objects.create(
            job=cls.job, frame=1, label=label, type="cuboid", points=[0, 0, 1] * 4
        )
        cls.track = models.LabeledTrack.objects.create(job=cls.job, frame=0, label=label)

    def issue_data(self, **context):
        return {
            "job": self.job.id,
            "frame": 1,
            "position": [0, 0, 1],
            "message": "Check this object",
            **context,
        }

    def test_legacy_point_issue(self):
        serializer = IssueWriteSerializer(data=self.issue_data())
        self.assertTrue(serializer.is_valid(), serializer.errors)
        issue = serializer.save()
        self.assertIsNone(issue.end_frame)
        self.assertIsNone(issue.object_id)
        self.assertIsNone(issue.object_type)
        self.assertEqual(issue.comments.get().message, "Check this object")

    def test_shape_and_track_context_round_trip(self):
        for object_type, annotation in [("shape", self.shape), ("track", self.track)]:
            with self.subTest(object_type=object_type):
                serializer = IssueWriteSerializer(
                    data=self.issue_data(
                        object_type=object_type, object_id=annotation.id, end_frame=4
                    )
                )
                self.assertTrue(serializer.is_valid(), serializer.errors)
                issue = serializer.save()
                issue.refresh_from_db()
                result = IssueReadSerializer(issue).data
                self.assertEqual(result["object_type"], object_type)
                self.assertEqual(result["object_id"], annotation.id)
                self.assertEqual(result["end_frame"], 4)

    def test_invalid_ranges(self):
        for end_frame in [-1, 0, 6]:
            with self.subTest(end_frame=end_frame):
                serializer = IssueWriteSerializer(data=self.issue_data(end_frame=end_frame))
                self.assertFalse(serializer.is_valid())
                self.assertIn("end_frame", serializer.errors)

    def test_invalid_references(self):
        for context in [
            {"object_id": self.shape.id},
            {"object_type": "shape"},
            {"object_id": self.shape.id, "object_type": "unknown"},
            {"object_id": self.shape.id, "object_type": "shape", "job": self.other_job.id},
            {"object_id": self.track.id, "object_type": "track", "job": self.other_job.id},
        ]:
            with self.subTest(context=context):
                serializer = IssueWriteSerializer(data=self.issue_data(**context))
                self.assertFalse(serializer.is_valid())

    def test_corrections_and_deletions_preserve_feedback(self):
        serializer = IssueWriteSerializer(
            data=self.issue_data(object_id=self.shape.id, object_type="shape", end_frame=4)
        )
        serializer.is_valid(raise_exception=True)
        issue = serializer.save()
        shape_id = self.shape.id
        # The annotation API replaces rows with the same IDs during corrections.
        replacement = models.LabeledShape.objects.get(id=shape_id)
        self.shape.delete()
        replacement.points = [2, 3, 4] * 4
        replacement.save(force_insert=True)
        issue.refresh_from_db()
        self.assertEqual(issue.object_id, replacement.id)
        replacement.delete()
        update = IssueWriteSerializer(
            issue, data={"position": [1, 2, 3], "resolved": True}, partial=True
        )
        self.assertTrue(update.is_valid(), update.errors)
        update.save()
        issue.refresh_from_db()
        self.assertEqual(issue.object_id, shape_id)
        self.assertEqual(list(issue.position), [1, 2, 3])
        self.assertEqual(issue.end_frame, 4)
        self.assertTrue(issue.resolved)

    def test_patch_validates_range_and_allows_unlinking(self):
        issue = models.Issue.objects.create(
            job=self.job,
            frame=1,
            end_frame=3,
            position=[0, 0, 1],
            object_id=self.track.id,
            object_type="track",
        )
        invalid = IssueWriteSerializer(issue, data={"end_frame": 0}, partial=True)
        self.assertFalse(invalid.is_valid())
        valid = IssueWriteSerializer(
            issue,
            data={
                "end_frame": 5,
                "object_id": None,
                "object_type": None,
            },
            partial=True,
        )
        self.assertTrue(valid.is_valid(), valid.errors)
        valid.save()
        self.assertIsNone(issue.object_id)
        self.assertEqual(issue.end_frame, 5)
