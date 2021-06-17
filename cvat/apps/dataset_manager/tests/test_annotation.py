# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.dataset_manager.annotation import TrackManager

from unittest import TestCase


class TrackManagerTest(TestCase):
    def _check_interpolation(self, track):
        interpolated = TrackManager.get_interpolated_shapes(track, 0, 7)

        self.assertEqual(len(interpolated), 6)
        self.assertTrue(interpolated[0]["keyframe"])
        self.assertFalse(interpolated[1]["keyframe"])
        self.assertTrue(interpolated[2]["keyframe"])
        self.assertTrue(interpolated[3]["keyframe"])
        self.assertFalse(interpolated[4]["keyframe"])
        self.assertFalse(interpolated[5]["keyframe"])

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
                    "type": "rectangle",
                    "occluded": False,
                    "outside": False,
                    "attributes": []
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "type": "rectangle",
                    "occluded": False,
                    "outside": True
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
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
                    "type": "polyline",
                    "occluded": False,
                    "outside": False,
                    "attributes": []
                },
                {
                    "frame": 2,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "type": "polyline",
                    "occluded": False,
                    "outside": True
                },
                {
                    "frame": 4,
                    "attributes": [],
                    "points": [3.0, 4.0, 5.0, 6.0],
                    "type": "polyline",
                    "occluded": False,
                    "outside": False
                },
            ]
        }

        self._check_interpolation(track)

    def test_api_v1_unit_test_on_normalize_shape_function(self):
        # 3 points
        norm_shape = TrackManager.normalize_shape({
            "points": [1.5, 2.5, 0.5, 8.6, 9.6, 3.6],
        })
        self.assertEqual(len(norm_shape["points"]), 200)

        # 4 points
        norm_shape = TrackManager.normalize_shape({
            "points": [1.5, 2.5, 0.5, 8.6, 9.6, 3.6, 2.8, 7.2],
        })
        self.assertEqual(len(norm_shape["points"]), 200)

        # 1 point
        norm_shape = TrackManager.normalize_shape({
            "points": [1.5, 2.5],
        })
        self.assertEqual(len(norm_shape["points"]), 200)

        # empty shape
        with self.assertRaises(ValueError):
            TrackManager.normalize_shape({
                "points": [],
            })
        # invalid count of points
        with self.assertRaises(ValueError):
            TrackManager.normalize_shape({
                "points": [1.5, 2.5, 7.5],
            })
        # negative points
        TrackManager.normalize_shape({
            "points": [-1.5, 2.5, -9.8, -4.6],
        })
        # integer
        TrackManager.normalize_shape({
            "points": [1, 2, 9, 4],
        })
