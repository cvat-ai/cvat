# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.dataset_manager.annotation import TrackManager

from unittest import TestCase


class TrackManagerTest(TestCase):
    def _check_interpolation(self, track):
        interpolated = TrackManager.get_interpolated_shapes(track, 0, 7, '2d')

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
            ]
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
                    "attributes": []
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "type": "points",
                    "occluded": False,
                    "outside": True
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "type": "points",
                    "occluded": False,
                    "outside": False
                },
            ]
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
                    "attributes": []
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0, 7.0, 6.0, 4.0, 5.0],
                    "type": "polygon",
                    "occluded": False,
                    "outside": True
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0, 7.0, 6.0, 4.0, 5.0],
                    "type": "polygon",
                    "occluded": False,
                    "outside": False
                },
            ]
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
                    "attributes": []
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": True
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False
                },
            ]
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
                    "attributes": []
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "polyline",
                    "occluded": False,
                    "outside": True
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "rotation": 0,
                    "type": "polyline",
                    "occluded": False,
                    "outside": False
                },
            ]
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
                    "attributes": []
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
                    "attributes": []
                }
            ]
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
                "keyframe": True
            },
            {
                "frame": 1,
                "points": [2.0, 3.0, 4.0, 5.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": False
            },
            {
                "frame": 2,
                "points": [3.0, 4.0, 5.0, 6.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": True,
                "attributes": [],
                "keyframe": True
            },
            {
                "frame": 4,
                "points": [5.0, 6.0, 7.0, 8.0],
                "rotation": 0,
                "type": "rectangle",
                "occluded": False,
                "outside": True,
                "attributes": [],
                "keyframe": True
            }
        ]

        interpolated_shapes = TrackManager.get_interpolated_shapes(track, 0, 5, '2d')
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
                    "attributes": []
                },
                {
                    "frame": 2,
                    "points": [3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
                    "type": "polygon",
                    "occluded": False,
                    "outside": True,
                    "attributes": []
                }
            ]
        }

        expected_shapes = [
            {
                "frame": 0,
                "points": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
                "type": "polygon",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": True
            },
            {
                "frame": 1,
                "points": [2.0, 3.0, 4.0, 5.0, 6.0, 7.0],
                "type": "polygon",
                "occluded": False,
                "outside": False,
                "attributes": [],
                "keyframe": False
            },
            {
                "frame": 2,
                "points": [3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
                "type": "polygon",
                "occluded": False,
                "outside": True,
                "attributes": [],
                "keyframe": True
            }
        ]

        interpolated_shapes = TrackManager.get_interpolated_shapes(track, 0, 3, '2d')
        self.assertEqual(expected_shapes, interpolated_shapes)
