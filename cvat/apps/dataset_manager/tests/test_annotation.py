# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import math
from collections.abc import Sequence
from functools import partial
from typing import Any
from unittest import mock

from django.test import TestCase

from cvat.apps.dataset_manager import task as task_module
from cvat.apps.dataset_manager.annotation import AnnotationIR, TrackManager
from cvat.apps.engine import models
from cvat.apps.engine.models import DimensionType, JobType, ShapeType
from cvat.apps.engine.tests.utils import compare_objects


# --- SHAPE/TRACK GENERATION HELPERS ---
def make_2d_points(
    base: float = 0.0, *, shape_type: ShapeType = ShapeType.RECTANGLE
) -> list[float]:
    if shape_type == ShapeType.RECTANGLE:
        return [1.0 + base, 2.0 + base, 3.0 + base, 4.0 + base]
    elif shape_type == ShapeType.POLYGON:
        return [1.0 + base, 2.0 + base, 3.0 + base, 4.0 + base, 5.0 + base, 2.0 + base]
    elif shape_type == ShapeType.POLYLINE:
        return [1.0 + base, 2.0 + base, 3.0 + base, 4.0 + base, 5.0 + base, 6.0 + base]
    elif shape_type == ShapeType.POINTS:
        return [1.0 + base, 2.0 + base]
    else:
        assert False, f"Unknown shape type '{shape_type}'"


def make_3d_points(base: float = 0.0, rotation: float = 0.0) -> list[float]:
    return [
        1.0 + base,
        2.0 + base,
        3.0 + base,
        rotation,
        rotation,
        rotation,
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
    frame: int,
    *,
    base: float = 0,
    outside: bool = False,
    rotation: float | None = None,
    attributes: dict | None = None,
    dimension: str | DimensionType = DimensionType.DIM_2D,
    shape_type: ShapeType | None = None,
    occluded: bool = False,
) -> dict[str, Any]:
    if dimension == DimensionType.DIM_2D:
        if shape_type is None:
            shape_type = ShapeType.RECTANGLE

        points = make_2d_points(base, shape_type=shape_type)

        shape = {
            "frame": frame,
            "points": points,
            "type": shape_type.value,
            "occluded": occluded,
            "rotation": 0,
            "outside": outside,
            "attributes": attributes or [],
        }

        if rotation is not None:
            assert 0 <= rotation <= 360, "2d shape rotation must be within the [0; 360] range"

            match shape_type:
                case ShapeType.RECTANGLE | ShapeType.ELLIPSE:
                    shape["rotation"] = rotation
                case (
                    ShapeType.CUBOID
                    | ShapeType.MASK
                    | ShapeType.POLYLINE
                    | ShapeType.POINTS
                    | ShapeType.POLYGON
                ):
                    # The UI doesn't allow rotated cuboids.
                    # Masks, polygons, point groups and lines could potentially be rotated,
                    # but it's not the natural way of representing them.
                    raise ValueError(f"rotation is not supported for the '{shape_type}' shape type")
                case _:
                    assert False, f"Unknown shape type '{shape_type}'"

    elif dimension == DimensionType.DIM_3D:
        if rotation is None:
            rotation = 0

        assert -180 <= rotation <= 180, "3d cuboid rotation must be within the [-180; 180] range"

        points = make_3d_points(base, rotation=math.radians(rotation))

        shape = {
            "frame": frame,
            "points": points,
            "rotation": 0,
            "type": ShapeType.CUBOID.value,
            "occluded": occluded,
            "outside": outside,
            "attributes": attributes or [],
        }
    else:
        assert False, f"Unknown dimension '{dimension}'"

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


class TrackManagerTest(TestCase):
    def assertTracksEqual(self, a: Sequence[dict], b: Sequence[dict]):
        compare_objects(self, a, b, fp_tolerance=0.001)

    def _check_keyframe_interpolation(self, track, dimension=DimensionType.DIM_2D):
        interpolated = TrackManager.get_interpolated_shapes(track, 0, 7, dimension=dimension)
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
            (DimensionType.DIM_2D, ShapeType.RECTANGLE),
            (DimensionType.DIM_2D, ShapeType.POLYGON),
            (DimensionType.DIM_2D, ShapeType.POLYLINE),
            (DimensionType.DIM_2D, ShapeType.POINTS),
            (DimensionType.DIM_3D, ShapeType.CUBOID),
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
                self._check_keyframe_interpolation(track, dimension)

    def test_outside_shape_interpolation(self):
        for dimension in [DimensionType.DIM_2D, DimensionType.DIM_3D]:
            with self.subTest(dimension=dimension):
                shape_type = (
                    ShapeType.CUBOID if dimension == DimensionType.DIM_3D else ShapeType.RECTANGLE
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
                    track, 0, 5, dimension=dimension
                )
                expected = [0, 1, 2, 4]
                got = [shape["frame"] for shape in interpolated]
                self.assertEqual(expected, got)

    def test_bbox_interpolation(self):
        make_rect = partial(make_shape, shape_type=ShapeType.RECTANGLE)

        shapes = [
            make_rect(0, base=0, rotation=4 / 8 * 180, outside=False),
            make_rect(4, base=4, rotation=0 / 8 * 180, outside=True),
        ]
        track = make_track(shapes)
        interpolated_shapes = TrackManager.get_interpolated_shapes(
            track, 0, 6, dimension=DimensionType.DIM_2D
        )

        expected_shapes = [
            dict(make_rect(0, base=0, rotation=4 / 8 * 180, outside=False), keyframe=True),
            dict(make_rect(1, base=1, rotation=3 / 8 * 180, outside=False), keyframe=False),
            dict(make_rect(2, base=2, rotation=2 / 8 * 180, outside=False), keyframe=False),
            dict(make_rect(3, base=3, rotation=1 / 8 * 180, outside=False), keyframe=False),
            dict(make_rect(4, base=4, rotation=0 / 8 * 180, outside=True), keyframe=True),
        ]
        self.assertTracksEqual(expected_shapes, interpolated_shapes)

    def test_polygon_interpolation(self):
        make_polygon = partial(make_shape, shape_type=ShapeType.POLYGON)

        shapes = [
            make_polygon(0, base=0, outside=False),
            make_polygon(4, base=4, outside=True),
        ]
        track = make_track(shapes)
        interpolated_shapes = TrackManager.get_interpolated_shapes(
            track, 0, 6, dimension=DimensionType.DIM_2D
        )

        expected_shapes = [
            dict(make_polygon(0, base=0, outside=False), keyframe=True),
            dict(make_polygon(1, base=1, outside=False), keyframe=False),
            dict(make_polygon(2, base=2, outside=False), keyframe=False),
            dict(make_polygon(3, base=3, outside=False), keyframe=False),
            dict(make_polygon(4, base=4, outside=True), keyframe=True),
        ]
        self.assertTracksEqual(expected_shapes, interpolated_shapes)

    def test_cuboid_3d_interpolation(self):
        make_cuboid = partial(
            make_shape, shape_type=ShapeType.CUBOID, dimension=DimensionType.DIM_3D
        )

        shapes = [
            make_cuboid(0, base=0, rotation=-2 / 8 * 180, outside=False),
            make_cuboid(4, base=4, rotation=2 / 8 * 180, outside=True),
        ]
        track = make_track(shapes)
        interpolated_shapes = TrackManager.get_interpolated_shapes(
            track, 0, 6, dimension=DimensionType.DIM_3D
        )

        expected_shapes = [
            dict(make_cuboid(0, base=0, rotation=-2 / 8 * 180, outside=False), keyframe=True),
            dict(make_cuboid(1, base=1, rotation=-1 / 8 * 180, outside=False), keyframe=False),
            dict(make_cuboid(2, base=2, rotation=0 / 8 * 180, outside=False), keyframe=False),
            dict(make_cuboid(3, base=3, rotation=1 / 8 * 180, outside=False), keyframe=False),
            dict(make_cuboid(4, base=4, rotation=2 / 8 * 180, outside=True), keyframe=True),
        ]
        self.assertTracksEqual(expected_shapes, interpolated_shapes)

    def test_duplicated_shape_interpolation(self):
        for dimension in [DimensionType.DIM_2D, DimensionType.DIM_3D]:
            with self.subTest(dimension=dimension):
                shape_type = (
                    ShapeType.CUBOID if dimension == DimensionType.DIM_3D else ShapeType.RECTANGLE
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
                    track, 0, 2, dimension=dimension
                )
                self.assertEqual(2, len(interpolated_shapes))

    def test_deleted_frames_with_keyframes_are_ignored(self):
        for dimension in [DimensionType.DIM_2D, DimensionType.DIM_3D]:
            with self.subTest(dimension=dimension):
                deleted_frames = [2]
                end_frame = 5
                shape_type = (
                    ShapeType.CUBOID if dimension == DimensionType.DIM_3D else ShapeType.RECTANGLE
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
                    dimension=dimension,
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
                track, 0, end_frame, DimensionType.DIM_2D, included_frames=included_frames
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
            dimension=DimensionType.DIM_2D,
            included_frames=included_frames,
            deleted_frames=deleted_frames,
        )
        self.assertEqual(expected_shapes, interpolated_shapes)


class AnnotationIRTest(TestCase):
    def test_slice_track_does_not_duplicate_outside_frame_on_the_end(self):
        for dimension in [DimensionType.DIM_2D, DimensionType.DIM_3D]:
            with self.subTest(dimension=dimension):
                label = "car"
                track_id = 666
                shape_type = (
                    ShapeType.CUBOID if dimension == DimensionType.DIM_3D else ShapeType.RECTANGLE
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
                annotation = AnnotationIR(dimension=dimension, data=data)
                sliced_annotation = annotation.slice(0, 1)
                self.assertEqual(sliced_annotation.data["tracks"][0]["shapes"], shapes[0:2])


class TestTaskAnnotation(TestCase):
    def test_reads_ordered_jobs(self):
        user = models.User.objects.create_superuser(username="admin", email="", password="")
        for dimension in [DimensionType.DIM_2D, DimensionType.DIM_3D]:
            with self.subTest(dimension=dimension):
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

                id_offset = 0 if dimension == DimensionType.DIM_2D else 1000000

                models.Job.objects.create(
                    segment=models.Segment.objects.create(
                        task=db_task, start_frame=0, stop_frame=10
                    ),
                    type=JobType.ANNOTATION,
                    id=456789 + id_offset,
                )
                models.Job.objects.create(
                    segment=models.Segment.objects.create(
                        task=db_task, start_frame=10, stop_frame=20
                    ),
                    type=JobType.ANNOTATION,
                    id=123456 + id_offset,
                )
                models.Job.objects.create(
                    segment=models.Segment.objects.create(
                        task=db_task, start_frame=20, stop_frame=30
                    ),
                    type=JobType.ANNOTATION,
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

                class DummyJobAnnotation(task_module.JobAnnotation):
                    called_ids = []

                    def __init__(self, job_id, db_job=None):
                        self.called_ids.append(job_id)
                        self.ir_data = AnnotationIR(dimension=dimension)

                    def init_from_db(self, *, streaming: bool = False):
                        pass

                with mock.patch.object(task_module, "JobAnnotation", DummyJobAnnotation):
                    ta = task_module.TaskAnnotation(db_task.id)
                    ta.init_from_db()

                assert DummyJobAnnotation.called_ids == sorted(unordered_ids)
