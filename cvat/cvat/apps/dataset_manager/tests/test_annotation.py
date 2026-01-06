# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT
from unittest import mock

from django.test import TestCase

from cvat.apps.dataset_manager import task as task_module
from cvat.apps.dataset_manager.annotation import AnnotationIR, TrackManager
from cvat.apps.engine import models


class TrackManagerTest(TestCase):
    def _check_interpolation(self, track):
        interpolated = TrackManager.get_interpolated_shapes(track, 0, 7, "2d")

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

    def test_point_interpolation(self):
        track = {
            "frame": 0,
            "label_id": 0,
            "group": None,
            "source": "manual",
            "attributes": [],
            "shapes": [
                {
                    "frame": 0,
                    "points": [1.0, 2.0],
                    "type": "points",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "type": "points",
                    "occluded": False,
                    "outside": True,
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "type": "points",
                    "occluded": False,
                    "outside": False,
                },
            ],
        }

        self._check_interpolation(track)

    def test_polygon_interpolation(self):
        track = {
            "frame": 0,
            "label_id": 0,
            "group": None,
            "attributes": [],
            "source": "manual",
            "shapes": [
                {
                    "frame": 0,
                    "points": [1.0, 2.0, 3.0, 4.0, 5.0, 2.0],
                    "type": "polygon",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0, 7.0, 6.0, 4.0, 5.0],
                    "type": "polygon",
                    "occluded": False,
                    "outside": True,
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0, 7.0, 6.0, 4.0, 5.0],
                    "type": "polygon",
                    "occluded": False,
                    "outside": False,
                },
            ],
        }

        self._check_interpolation(track)

    def test_bbox_interpolation(self):
        track = {
            "frame": 0,
            "label_id": 0,
            "group": None,
            "attributes": [],
            "source": "manual",
            "shapes": [
                {
                    "frame": 0,
                    "points": [1.0, 2.0, 3.0, 4.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": True,
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                },
            ],
        }

        self._check_interpolation(track)

    def test_line_interpolation(self):
        track = {
            "frame": 0,
            "label_id": 0,
            "group": None,
            "attributes": [],
            "source": "manual",
            "shapes": [
                {
                    "frame": 0,
                    "points": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "polyline",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "polyline",
                    "occluded": False,
                    "outside": True,
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "polyline",
                    "occluded": False,
                    "outside": False,
                },
            ],
        }

        self._check_interpolation(track)

    def test_outside_bbox_interpolation(self):
        track = {
            "frame": 0,
            "label_id": 0,
            "group": None,
            "attributes": [],
            "source": "manual",
            "shapes": [
                {
                    "frame": 0,
                    "points": [1.0, 2.0, 3.0, 4.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": True,
                    "attributes": [],
                },
                {
                    "frame": 4,
                    "points": [5.0, 6.0, 7.0, 8.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": True,
                    "attributes": [],
                },
            ],
        }

        expected_shapes = [
            {
                "frame": 0,
                "points": [1.0, 2.0, 3.0, 4.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": True,
            },
            {
                "frame": 1,
                "points": [2.0, 3.0, 4.0, 5.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": False,
            },
            {
                "frame": 2,
                "points": [3.0, 4.0, 5.0, 6.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": True,
                "attributes": [],
                "keyframe": True,
            },
            {
                "frame": 4,
                "points": [5.0, 6.0, 7.0, 8.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": True,
                "attributes": [],
                "keyframe": True,
            },
        ]

        interpolated_shapes = TrackManager.get_interpolated_shapes(track, 0, 5, "2d")
        self.assertEqual(expected_shapes, interpolated_shapes)

    def test_outside_polygon_interpolation(self):
        track = {
            "frame": 0,
            "label_id": 0,
            "group": None,
            "attributes": [],
            "source": "manual",
            "shapes": [
                {
                    "frame": 0,
                    "points": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
                    "type": "polygon",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,
                    "points": [3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
                    "type": "polygon",
                    "occluded": False,
                    "outside": True,
                    "attributes": [],
                },
            ],
        }

        expected_shapes = [
            {
                "frame": 0,
                "points": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
                "type": "polygon",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": True,
            },
            {
                "frame": 1,
                "points": [2.0, 3.0, 4.0, 5.0, 6.0, 7.0],
                "type": "polygon",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": False,
            },
            {
                "frame": 2,
                "points": [3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
                "type": "polygon",
                "occluded": False,
                "outside": True,
                "attributes": [],
                "keyframe": True,
            },
        ]

        interpolated_shapes = TrackManager.get_interpolated_shapes(track, 0, 3, "2d")
        self.assertEqual(expected_shapes, interpolated_shapes)

    def test_duplicated_shape_interpolation(self):
        # there should not be any new tracks with duplicated shapes,
        # but it is possible that the database still contains some
        expected_shapes = [
            {
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "points": [100, 100, 200, 200],
                "frame": 0,
                "attributes": [],
                "rotation": 0,
            },
            {
                "type": "rectangle",
                "occluded": False,
                "outside": True,
                "points": [100, 100, 200, 200],
                "frame": 1,
                "attributes": [],
                "rotation": 0,
            },
        ]
        track = {
            "id": 666,
            "frame": 0,
            "group": None,
            "source": "manual",
            "attributes": [],
            "elements": [],
            "label": "cat",
            "shapes": expected_shapes + [expected_shapes[-1]],
        }

        interpolated_shapes = TrackManager.get_interpolated_shapes(track, 0, 2, "2d")
        self.assertEqual(expected_shapes, interpolated_shapes)

    def test_deleted_frames_with_keyframes_are_ignored(self):
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
                    "points": [1.0, 2.0, 3.0, 4.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,  # deleted in the task
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 4,
                    "points": [1.0, 2.0, 3.0, 4.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
            ],
        }

        expected_shapes = [
            {
                "frame": 0,
                "points": [1.0, 2.0, 3.0, 4.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": True,
            },
            {
                "frame": 1,
                "points": [1.0, 2.0, 3.0, 4.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": False,
            },
            {
                "frame": 3,
                "points": [1.0, 2.0, 3.0, 4.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": False,
            },
            {
                "frame": 4,
                "points": [1.0, 2.0, 3.0, 4.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": True,
            },
        ]

        interpolated_shapes = TrackManager.get_interpolated_shapes(
            track, 0, end_frame, models.DimensionType.DIM_2D, deleted_frames=deleted_frames
        )
        self.assertEqual(expected_shapes, interpolated_shapes)

    def test_keyframes_on_excluded_frames_are_not_ignored(self):
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
                    "points": [1.0, 2.0, 3.0, 4.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 4,
                    "points": [7.0, 8.0, 9.0, 10.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
            ],
        }

        all_expected_shapes = [
            {
                "frame": 0,
                "points": [1.0, 2.0, 3.0, 4.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": True,
            },
            {
                "frame": 1,
                "points": [2.0, 3.0, 4.0, 5.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": False,
            },
            {
                "frame": 2,
                "points": [3.0, 4.0, 5.0, 6.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": True,
            },
            {
                "frame": 3,
                "points": [5.0, 6.0, 7.0, 8.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": False,
            },
            {
                "frame": 4,
                "points": [7.0, 8.0, 9.0, 10.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": True,
            },
        ]

        for included_frames in [None, [1, 3]]:
            interpolated_shapes = TrackManager.get_interpolated_shapes(
                track, 0, end_frame, models.DimensionType.DIM_2D, included_frames=included_frames
            )
            expected_shapes = [
                shape
                for shape in all_expected_shapes
                if included_frames is None or shape["frame"] in included_frames
            ]
            self.assertEqual(expected_shapes, interpolated_shapes)

    def test_keyframes_on_deleted_frames_with_specific_requested_frames_are_ignored(self):
        deleted_frames = [2]  # the task has deleted frames
        included_frames = [1, 3]  # and current track view requires only specific frames
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
                    "points": [1.0, 2.0, 3.0, 4.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 2,  # deleted
                    "points": [0, 0, 1, 1],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": True,
                    "outside": False,
                    "attributes": [],
                },
                {
                    "frame": 4,
                    "points": [9.0, 10.0, 11.0, 12.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": [],
                },
            ],
        }

        expected_shapes = [
            {
                "frame": 1,
                "points": [3.0, 4.0, 5.0, 6.0],
                "rotation": 0.0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": False,
            },
            {
                "frame": 3,
                "points": [7.0, 8.0, 9.0, 10.0],
                "rotation": 0.0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": False,
            },
        ]

        interpolated_shapes = TrackManager.get_interpolated_shapes(
            track,
            0,
            end_frame,
            models.DimensionType.DIM_2D,
            included_frames=included_frames,
            deleted_frames=deleted_frames,
        )
        self.assertEqual(expected_shapes, interpolated_shapes)


class AnnotationIRTest(TestCase):
    def test_slice_track_does_not_duplicate_outside_frame_on_the_end(self):
        track_shapes = [
            {
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "points": [100, 100, 200, 200],
                "frame": 0,
                "attributes": [],
                "rotation": 0,
            },
            {
                "type": "rectangle",
                "occluded": False,
                "outside": True,
                "points": [100, 100, 200, 200],
                "frame": 1,
                "attributes": [],
                "rotation": 0,
            },
            {
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "points": [111, 111, 222, 222],
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
                    "label": "cat",
                    "shapes": track_shapes,
                }
            ],
        }
        annotation = AnnotationIR(dimension=models.DimensionType.DIM_2D, data=data)
        sliced_annotation = annotation.slice(0, 1)
        self.assertEqual(sliced_annotation.data["tracks"][0]["shapes"], track_shapes[0:2])


class TestTaskAnnotation(TestCase):
    def test_reads_ordered_jobs(self):
        user = models.User.objects.create_superuser(username="admin", email="", password="admin")

        db_data = models.Data.objects.create(size=31, stop_frame=30, image_quality=50)

        data = {
            "name": "my task",
            "owner": user,
            "overlap": 1,
            "segment_size": 11,
        }
        db_task = models.Task.objects.create(data=db_data, **data)

        # We assume that normally segments and annotation jobs
        # are created in the ascending order for start_frame,
        # so their ids correspond to this order. The DB, however,
        # can return them in an arbitrary order, if not specified explicitly.
        # This test tries to reproduce this by specifying job ids.
        # https://github.com/cvat-ai/cvat/issues/9860

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

        # ensure that the jobs are not ordered if the order is not specified
        # if they are ordered, the test is not really testing anything anymore
        unordered_ids = list(
            models.Job.objects.filter(segment__task_id=db_task.id).values_list("id", flat=True)
        )
        assert sorted(unordered_ids) != unordered_ids

        class DummyJobAnnotation(task_module.JobAnnotation):
            called_ids = []

            def __init__(self, job_id, db_job=None):
                self.called_ids.append(job_id)
                self.ir_data = AnnotationIR(models.DimensionType.DIM_2D)

            def init_from_db(self, *, streaming: bool = False):
                pass

        with mock.patch.object(task_module, "JobAnnotation", DummyJobAnnotation):
            ta = task_module.TaskAnnotation(db_task.id)
            ta.init_from_db()

        assert DummyJobAnnotation.called_ids == sorted(unordered_ids)
