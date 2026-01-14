# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT


from enum import Enum
from unittest import mock

from django.test import TestCase

from cvat.apps.dataset_manager import task as task_module
from cvat.apps.dataset_manager.annotation import AnnotationIR, TrackManager
from cvat.apps.engine import models


# --- SHAPE/TRACK GENERATION HELPERS ---
class ShapeType(Enum):
    RECTANGLE = "rectangle"
    POLYGON = "polygon"
    POLYLINE = "polyline"
    POINTS = "points"
    CUBOID = "cuboid"


def make_2d_points(base=0.0, shape_type=ShapeType.RECTANGLE):
    if shape_type == ShapeType.RECTANGLE:
        return [1.0 + base, 2.0 + base, 3.0 + base, 4.0 + base]
    elif shape_type == ShapeType.POLYGON:
        return [1.0 + base, 2.0 + base, 3.0 + base, 4.0 + base, 5.0 + base, 2.0 + base]
    elif shape_type == ShapeType.POLYLINE:
        return [1.0 + base, 2.0 + base, 3.0 + base, 4.0 + base, 5.0 + base, 6.0 + base]
    elif shape_type == ShapeType.POINTS:
        return [1.0 + base, 2.0 + base]
    return []


def make_3d_points(base=0.0):
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


def make_shape(
    frame,
    base=0.0,
    outside=False,
    rotation=0,
    attributes=None,
    dimension="2d",
    shape_type=None,
    occluded=False,
):
    if dimension == "2d":
        if shape_type is None:
            shape_type = ShapeType.RECTANGLE
        points = make_2d_points(base, shape_type)
        shape = {
            "frame": frame,
            "points": points,
            "type": shape_type.value,
            "occluded": occluded,
            "outside": outside,
            "attributes": attributes or [],
        }
        if shape_type in [ShapeType.RECTANGLE, ShapeType.POLYLINE]:
            shape["rotation"] = rotation
        elif shape_type == ShapeType.POINTS:
            shape["rotation"] = 0
    else:
        points = make_3d_points(base)
        shape = {
            "frame": frame,
            "points": points,
            "rotation": rotation,
            "type": ShapeType.CUBOID.value,
            "occluded": occluded,
            "outside": outside,
            "attributes": attributes or [],
        }
    return shape


def make_track(shapes, frame=0, label_id=0, source="manual", attributes=None):
    return {
        "frame": frame,
        "label_id": label_id,
        "group": None,
        "source": source,
        "attributes": attributes or [],
        "shapes": shapes,
    }


def get_dimension_type(dimension):
    if dimension == models.DimensionType.DIM_3D or dimension == "3d":
        return models.DimensionType.DIM_3D
    elif dimension == models.DimensionType.DIM_2D or dimension == "2d":
        return models.DimensionType.DIM_2D
    raise ValueError(f"Unknown dimension: {dimension}")


class TrackManagerTest(TestCase):
    def _check_interpolation(self, track, dimension=models.DimensionType.DIM_2D):
        interpolated = TrackManager.get_interpolated_shapes(
            track, 0, 7, get_dimension_type(dimension)
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

    def test_shape_interpolation(self):
        test_cases = [
            (models.DimensionType.DIM_2D, ShapeType.RECTANGLE),
            (models.DimensionType.DIM_2D, ShapeType.POLYGON),
            (models.DimensionType.DIM_2D, ShapeType.POLYLINE),
            (models.DimensionType.DIM_2D, ShapeType.POINTS),
            (models.DimensionType.DIM_3D, ShapeType.CUBOID),
        ]
        for dimension, shape_type in test_cases:
            with self.subTest(dimension=dimension, shape_type=shape_type):
                shapes = [
                    make_shape(
                        0, base=0.0, outside=False, dimension=dimension, shape_type=shape_type
                    ),
                    make_shape(
                        2, base=2.0, outside=True, dimension=dimension, shape_type=shape_type
                    ),
                    make_shape(
                        4, base=4.0, outside=False, dimension=dimension, shape_type=shape_type
                    ),
                ]
                track = make_track(shapes)
                self._check_interpolation(track, dimension)

    def test_outside_shape_interpolation(self):
        for dimension in [models.DimensionType.DIM_2D, models.DimensionType.DIM_3D]:
            with self.subTest(dimension=dimension):
                shape_type = (
                    ShapeType.CUBOID
                    if dimension == models.DimensionType.DIM_3D
                    else ShapeType.RECTANGLE
                )
                shapes = [
                    make_shape(
                        0, base=0.0, outside=False, dimension=dimension, shape_type=shape_type
                    ),
                    make_shape(
                        2, base=2.0, outside=True, dimension=dimension, shape_type=shape_type
                    ),
                    make_shape(
                        4, base=4.0, outside=True, dimension=dimension, shape_type=shape_type
                    ),
                ]
                track = make_track(shapes)
                interpolated = TrackManager.get_interpolated_shapes(
                    track, 0, 5, get_dimension_type(dimension)
                )
                expected = [0, 1, 2, 4]
                got = [shape["frame"] for shape in interpolated]
                self.assertEqual(expected, got)

    def test_outside_bbox_interpolation(self):
        shapes = [
            make_shape(0, base=0.0, outside=False, shape_type=ShapeType.RECTANGLE),
            make_shape(2, base=2.0, outside=True, shape_type=ShapeType.RECTANGLE),
            make_shape(4, base=4.0, outside=True, shape_type=ShapeType.RECTANGLE),
        ]
        track = make_track(shapes)
        expected_shapes = [
            dict(
                make_shape(0, base=0.0, outside=False, shape_type=ShapeType.RECTANGLE),
                keyframe=True,
            ),
            dict(
                make_shape(1, base=1.0, outside=False, shape_type=ShapeType.RECTANGLE),
                keyframe=False,
            ),
            dict(
                make_shape(2, base=2.0, outside=True, shape_type=ShapeType.RECTANGLE), keyframe=True
            ),
            dict(
                make_shape(4, base=4.0, outside=True, shape_type=ShapeType.RECTANGLE), keyframe=True
            ),
        ]
        interpolated_shapes = TrackManager.get_interpolated_shapes(track, 0, 5, "2d")
        self.assertEqual(expected_shapes, interpolated_shapes)

    def test_outside_polygon_interpolation(self):
        shapes = [
            make_shape(0, base=0.0, outside=False, shape_type=ShapeType.POLYGON),
            make_shape(2, base=2.0, outside=True, shape_type=ShapeType.POLYGON),
        ]
        track = make_track(shapes)
        expected_shapes = [
            dict(
                make_shape(0, base=0.0, outside=False, shape_type=ShapeType.POLYGON), keyframe=True
            ),
            dict(
                make_shape(1, base=1.0, outside=False, shape_type=ShapeType.POLYGON), keyframe=False
            ),
            dict(
                make_shape(2, base=2.0, outside=True, shape_type=ShapeType.POLYGON), keyframe=True
            ),
        ]
        interpolated_shapes = TrackManager.get_interpolated_shapes(track, 0, 3, "2d")
        self.assertEqual(expected_shapes, interpolated_shapes)

    def test_duplicated_shape_interpolation(self):
        for dimension in [models.DimensionType.DIM_2D, models.DimensionType.DIM_3D]:
            with self.subTest(dimension=dimension):
                shape_type = (
                    ShapeType.CUBOID
                    if dimension == models.DimensionType.DIM_3D
                    else ShapeType.RECTANGLE
                )
                label = "car"
                track_id = 777
                shape0 = make_shape(
                    0, base=0.0, outside=False, dimension=dimension, shape_type=shape_type
                )
                shape1 = make_shape(
                    1, base=0.0, outside=True, dimension=dimension, shape_type=shape_type
                )
                shapes = [shape0, shape1, shape1]
                track = {
                    "id": track_id,
                    "frame": 0,
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "elements": [],
                    "label": label,
                    "shapes": shapes,
                }
                interpolated_shapes = TrackManager.get_interpolated_shapes(
                    track, 0, 2, get_dimension_type(dimension)
                )
                self.assertEqual(2, len(interpolated_shapes))

    def test_deleted_frames_with_keyframes_are_ignored(self):
        for dimension in [models.DimensionType.DIM_2D, models.DimensionType.DIM_3D]:
            with self.subTest(dimension=dimension):
                deleted_frames = [2]
                end_frame = 5
                shape_type = (
                    ShapeType.CUBOID
                    if dimension == models.DimensionType.DIM_3D
                    else ShapeType.RECTANGLE
                )
                shapes = [
                    make_shape(
                        0, base=0.0, outside=False, dimension=dimension, shape_type=shape_type
                    ),
                    make_shape(
                        2, base=2.0, outside=False, dimension=dimension, shape_type=shape_type
                    ),
                    make_shape(
                        4, base=4.0, outside=False, dimension=dimension, shape_type=shape_type
                    ),
                ]
                track = make_track(shapes)
                interpolated_shapes = TrackManager.get_interpolated_shapes(
                    track,
                    0,
                    end_frame,
                    get_dimension_type(dimension),
                    deleted_frames=deleted_frames,
                )
                expected_frames = [0, 1, 3, 4]
                self.assertEqual(expected_frames, [s["frame"] for s in interpolated_shapes])

    def test_keyframes_on_excluded_frames_are_not_ignored(self):
        end_frame = 5
        shapes = [
            make_shape(0, base=0.0, outside=False, shape_type=ShapeType.RECTANGLE),
            make_shape(2, base=2.0, outside=False, shape_type=ShapeType.RECTANGLE),
            make_shape(4, base=4.0, outside=False, shape_type=ShapeType.RECTANGLE),
        ]
        track = make_track(shapes)
        all_expected_shapes = [
            dict(
                make_shape(0, base=0.0, outside=False, shape_type=ShapeType.RECTANGLE),
                keyframe=True,
            ),
            dict(
                make_shape(1, base=1.0, outside=False, shape_type=ShapeType.RECTANGLE),
                keyframe=False,
            ),
            dict(
                make_shape(2, base=2.0, outside=False, shape_type=ShapeType.RECTANGLE),
                keyframe=True,
            ),
            dict(
                make_shape(3, base=3.0, outside=False, shape_type=ShapeType.RECTANGLE),
                keyframe=False,
            ),
            dict(
                make_shape(4, base=4.0, outside=False, shape_type=ShapeType.RECTANGLE),
                keyframe=True,
            ),
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
        deleted_frames = [2]
        included_frames = [1, 3]
        end_frame = 5
        shapes = [
            make_shape(0, base=0.0, outside=False, shape_type=ShapeType.RECTANGLE),
            make_shape(2, base=-1.0, outside=False, shape_type=ShapeType.RECTANGLE, occluded=True),
            make_shape(4, base=8.0, outside=False, shape_type=ShapeType.RECTANGLE),
        ]
        track = make_track(shapes)
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
        for dimension in [models.DimensionType.DIM_2D, models.DimensionType.DIM_3D]:
            with self.subTest(dimension=dimension):
                label = "car" if dimension == models.DimensionType.DIM_3D else "cat"
                track_id = 666
                shape_type = (
                    ShapeType.CUBOID
                    if dimension == models.DimensionType.DIM_3D
                    else ShapeType.RECTANGLE
                )
                shapes = [
                    make_shape(
                        0, base=99.0, outside=False, dimension=dimension, shape_type=shape_type
                    ),
                    make_shape(
                        1, base=99.0, outside=True, dimension=dimension, shape_type=shape_type
                    ),
                    make_shape(
                        10, base=110.0, outside=False, dimension=dimension, shape_type=shape_type
                    ),
                ]
                track = {
                    "id": track_id,
                    "frame": 0,
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "elements": [],
                    "label": label,
                    "shapes": shapes,
                }
                data = {
                    "tags": [],
                    "shapes": [],
                    "tracks": [track],
                }
                dimension_type = get_dimension_type(dimension)
                annotation = AnnotationIR(dimension=dimension_type, data=data)
                sliced_annotation = annotation.slice(0, 1)
                self.assertEqual(sliced_annotation.data["tracks"][0]["shapes"], shapes[0:2])


class TestTaskAnnotation(TestCase):
    def test_reads_ordered_jobs(self):
        user = models.User.objects.create_superuser(
                    username=f"admin", email="", password=""
                )
        for dimension in ["2d", "3d"]:
            with self.subTest(dimension=dimension):
                db_data = models.Data.objects.create(size=31, stop_frame=30, image_quality=50)

                data = {
                    "name": "my task",
                    "owner": user,
                    "overlap": 1,
                    "segment_size": 11,
                }
                db_task = models.Task.objects.create(data=db_data, **data)

                # We assume that norheapq.mergemally segments and annotation jobs
                # are created in the ascending order for start_frame,
                # so their ids correspond to this order. The DB, however,
                # can return them in an arbitrary order, if not specified explicitly.
                # This test tries to reproduce this by specifying job ids.
                # https://github.com/cvat-ai/cvat/issues/9860

                id_offset = 0 if dimension == "2d" else 1000000

                models.Job.objects.create(
                    segment=models.Segment.objects.create(
                        task=db_task, start_frame=0, stop_frame=10
                    ),
                    type=models.JobType.ANNOTATION,
                    id=456789 + id_offset,
                )
                models.Job.objects.create(
                    segment=models.Segment.objects.create(
                        task=db_task, start_frame=10, stop_frame=20
                    ),
                    type=models.JobType.ANNOTATION,
                    id=123456 + id_offset,
                )
                models.Job.objects.create(
                    segment=models.Segment.objects.create(
                        task=db_task, start_frame=20, stop_frame=30
                    ),
                    type=models.JobType.ANNOTATION,
                    id=345678 + id_offset,
                )

                # ensure that the jobs are not ordered if the order is not specified
                # if they are ordered, the test is not really testing anything anymore

                unordered_ids = list(
                    models.Job.objects.filter(segment__task_id=db_task.id).values_list(
                        "id", flat=True
                    )
                )
                assert sorted(unordered_ids) != unordered_ids

                dimension_type = (
                    models.DimensionType.DIM_3D
                    if dimension == "3d"
                    else models.DimensionType.DIM_2D
                )

                class DummyJobAnnotation(task_module.JobAnnotation):
                    called_ids = []

                    def __init__(self, job_id, db_job=None):
                        self.called_ids.append(job_id)
                        self.ir_data = AnnotationIR(dimension_type)

                    def init_from_db(self, *, streaming: bool = False):
                        pass

                with mock.patch.object(task_module, "JobAnnotation", DummyJobAnnotation):
                    ta = task_module.TaskAnnotation(db_task.id)
                    ta.init_from_db()

                assert DummyJobAnnotation.called_ids == sorted(unordered_ids)
