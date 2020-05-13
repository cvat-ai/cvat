# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.dataset_manager.annotation import TrackManager

from unittest import TestCase


class TrackManagerTest(TestCase):
    def test_single_point_interpolation(self):
        track = {
            "frame": 0,
            "label_id": 0,
            "group": None,
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
            ]
        }

        interpolated = TrackManager.get_interpolated_shapes(track, 0, 2)

        self.assertEqual(len(interpolated), 3)