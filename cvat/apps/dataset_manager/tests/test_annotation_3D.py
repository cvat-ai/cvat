# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT
from unittest import mock

from django.test import TestCase

from cvat.apps.dataset_manager.annotation import AnnotationIR, TrackManager
from cvat.apps.dataset_manager import task as task_module
from cvat.apps.engine import models


class TrackManager3DTest(TestCase):
    def _check_interpolation(self, track):
        interpolated = TrackManager.get_interpolated_shapes(
            track, 0, 7, models.DimensionType.DIM_3D
        )

        self.assertEqual(
            [
                {"frame": 0, "keyframe": True, "outside": False},
                {"frame": 1, "keyframe": False, "outside": False},
                {"frame": 2, "keyframe": True, "outside": True},
                # frame = 3 should be skipped as it is outside and interpolated
                {"frame": 4, "keyframe": True, "outside": False},
                {"frame": 5, "keyframe": False, "outside": False},
                {"frame": 6, "keyframe": False, "outside": False},
            ],
            [
                {k: v for k, v in shape.items() if k in ["frame", "keyframe", "outside"]}
                for shape in interpolated
            ],
        )

    def _cuboid_points(self, base=0.0):
        # Return a 16-element list similar to other tests in the repo.
        # Structure: center x,y,z, angles (3), some zeros, lengths (3), rest zeros
        return [
            1.0 + base,
            2.0 + base,
            3.0 + base,
            0.0,
            0.0,
            0.0,
            4.0 + base,
            4.0 + base,
            4.0 + base,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
        ]

    def test_cuboid_interpolation(self):
        track = {
            "frame": 0,
            "label_id": 0,
            "group": None,
            "source": "manual",
            "attributes": [],
            "shapes": [
                {
                    "frame": 0,
                    "points": self._cuboid_points(0.0),
                    "rotation": 0,
                    "type": "cuboid",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": self._cuboid_points(2.0),
                    "rotation": 0,
                    "type": "cuboid",
                    "occluded": False,
                    "outside": True,
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": self._cuboid_points(4.0),
                    "rotation": 0,
                    "type": "cuboid",
                    "occluded": False,
                    "outside": False,
                },
            ],
        }

        self._check_interpolation(track)

    def test_outside_cuboid_interpolation(self):
        track = {
            "frame": 0,
            "label_id": 0,
            "group": None,
            "attributes": [],
            "source": "manual",
            "shapes": [
                {
                    "frame": 0,
                    "points": self._cuboid_points(0.0),
                    "rotation": 0,
                    "type": "cuboid",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,
                    "points": self._cuboid_points(2.0),
                    "rotation": 0,
                    "type": "cuboid",
                    "occluded": False,
                    "outside": True,
                    "attributes": [],
                },
                {
                    "frame": 4,
                    "points": self._cuboid_points(4.0),
                    "rotation": 0,
                    "type": "cuboid",
                    "occluded": False,
                    "outside": True,
                    "attributes": [],
                },
            ],
        }

        interpolated = TrackManager.get_interpolated_shapes(track, 0, 5, models.DimensionType.DIM_3D)

        # ensure frames/keyframe/outside sequence is reasonable for 3D cuboids
        expected = [0, 1, 2, 4]
        got = [shape["frame"] for shape in interpolated]
        self.assertEqual(expected, got)

    def test_deleted_frames_with_keyframes_are_ignored_3d(self):
        deleted_frames = [2]
        end_frame = 5

        track = {
            "frame": 0,
            "label_id": 0,
            "group": None,
            "attributes": [],
            "source": "manual",
            "shapes": [
                {
                    "frame": 0,
                    "points": self._cuboid_points(0.0),
                    "rotation": 0,
                    "type": "cuboid",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,  # deleted in the task
                    "points": self._cuboid_points(2.0),
                    "rotation": 0,
                    "type": "cuboid",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 4,
                    "points": self._cuboid_points(4.0),
                    "rotation": 0,
                    "type": "cuboid",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
            ],
        }

        interpolated_shapes = TrackManager.get_interpolated_shapes(
            track, 0, end_frame, models.DimensionType.DIM_3D, deleted_frames=deleted_frames
        )

        expected_frames = [0, 1, 3, 4]
        self.assertEqual(expected_frames, [s["frame"] for s in interpolated_shapes])

    def test_duplicated_shape_interpolation_3d(self):
        # Ensure duplicated shapes in a track are deduplicated
        shape0 = {
            "type": "cuboid",
            "occluded": False,
            "outside": False,
            "points": self._cuboid_points(0.0),
            "frame": 0,
            "attributes": [],
            "rotation": 0,
        }
        shape1 = {
            "type": "cuboid",
            "occluded": False,
            "outside": True,
            "points": self._cuboid_points(0.0),
            "frame": 1,
            "attributes": [],
            "rotation": 0,
        }

        track = {
            "id": 777,
            "frame": 0,
            "group": None,
            "source": "manual",
            "attributes": [],
            "elements": [],
            "label": "car",
            "shapes": [shape0, shape1, shape1],
        }

        interpolated_shapes = TrackManager.get_interpolated_shapes(track, 0, 2, models.DimensionType.DIM_3D)
        # Expect only two shapes (no duplicated last one)
        self.assertEqual(2, len(interpolated_shapes))


class AnnotationIR3DTest(TestCase):
    def test_slice_track_does_not_duplicate_outside_frame_on_the_end_3d(self):
        track_shapes = [
            {
                "type": "cuboid",
                "occluded": False,
                "outside": False,
                "points": [100, 100, 100] + [0] * 13,
                "frame": 0,
                "attributes": [],
                "rotation": 0,
            },
            {
                "type": "cuboid",
                "occluded": False,
                "outside": True,
                "points": [100, 100, 100] + [0] * 13,
                "frame": 1,
                "attributes": [],
                "rotation": 0,
            },
            {
                "type": "cuboid",
                "occluded": False,
                "outside": False,
                "points": [111, 111, 111] + [0] * 13,
                "frame": 10,
                "attributes": [],
                "rotation": 0,
            },
        ]
        data = {
            "tags": [],
            "shapes": [],
            "tracks": [
                {
                    "id": 666,
                    "frame": 0,
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "elements": [],
                    "label": "car",
                    "shapes": track_shapes,
                }
            ],
        }
        annotation = AnnotationIR(dimension=models.DimensionType.DIM_3D, data=data)
        sliced_annotation = annotation.slice(0, 1)
        self.assertEqual(sliced_annotation.data["tracks"][0]["shapes"], track_shapes[0:2])


class TestTaskAnnotation3D(TestCase):
    def test_reads_ordered_jobs_3d(self):
        # replicate the job ordering test but ensure AnnotationIR used is 3D
        user = models.User.objects.create_superuser(username="admin", email="", password="admin")

        db_data = models.Data.objects.create(size=31, stop_frame=30, image_quality=50)

        data = {"name": "my task", "owner": user, "overlap": 1, "segment_size": 11}
        db_task = models.Task.objects.create(data=db_data, **data)

        models.Job.objects.create(
            segment=models.Segment.objects.create(task=db_task, start_frame=0, stop_frame=10),
            type=models.JobType.ANNOTATION,
            id=456789,
        )
        models.Job.objects.create(
            segment=models.Segment.objects.create(task=db_task, start_frame=10, stop_frame=20),
            type=models.JobType.ANNOTATION,
            id=123456,
        )
        models.Job.objects.create(
            segment=models.Segment.objects.create(task=db_task, start_frame=20, stop_frame=30),
            type=models.JobType.ANNOTATION,
            id=345678,
        )

        unordered_ids = list(
            models.Job.objects.filter(segment__task_id=db_task.id).values_list("id", flat=True)
        )
        assert sorted(unordered_ids) != unordered_ids

        class DummyJobAnnotation(task_module.JobAnnotation):
            called_ids = []

            def __init__(self, job_id, db_job=None):
                self.called_ids.append(job_id)
                self.ir_data = AnnotationIR(models.DimensionType.DIM_3D)

            def init_from_db(self, *, streaming: bool = False):
                pass

        with mock.patch.object(task_module, "JobAnnotation", DummyJobAnnotation):
            ta = task_module.TaskAnnotation(db_task.id)
            ta.init_from_db()

        assert DummyJobAnnotation.called_ids == sorted(unordered_ids)
