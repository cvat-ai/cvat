# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest

from cvat.apps.engine import models
from cvat.apps.engine.task import (
    _filter_server_files_exclude,
    _get_sorted_filtered_image_paths,
    _is_frame_filter_active,
)


class TestTaskImageSelection(unittest.TestCase):
    def test_frame_filter_active(self):
        self.assertFalse(
            _is_frame_filter_active(start_frame=0, stop_frame=9, step=1, media_count=10)
        )
        self.assertTrue(
            _is_frame_filter_active(start_frame=2, stop_frame=9, step=1, media_count=10)
        )
        self.assertTrue(
            _is_frame_filter_active(start_frame=0, stop_frame=9, step=2, media_count=10)
        )
        self.assertTrue(
            _is_frame_filter_active(start_frame=0, stop_frame=5, step=1, media_count=10)
        )

    def test_sorted_filtered_image_paths_natural(self):
        media_files = [f"frame_{i}.jpg" for i in range(1, 15)]

        result = _get_sorted_filtered_image_paths(
            media_files,
            sorting_method=models.SortingMethod.NATURAL,
            start_frame=2,
            stop_frame=14,
            step=2,
        )

        self.assertEqual(
            result,
            [
                "frame_3.jpg",
                "frame_5.jpg",
                "frame_7.jpg",
                "frame_9.jpg",
                "frame_11.jpg",
                "frame_13.jpg",
            ],
        )

    def test_sorted_filtered_image_paths_without_filter(self):
        media_files = [f"frame_{i}.jpg" for i in (3, 1, 2)]

        result = _get_sorted_filtered_image_paths(
            media_files,
            sorting_method=models.SortingMethod.NATURAL,
            start_frame=0,
            stop_frame=None,
            step=1,
        )

        self.assertEqual(result, ["frame_1.jpg", "frame_2.jpg", "frame_3.jpg"])

    def test_filter_before_sort_differs_from_sort_before_filter(self):
        # Regression for https://github.com/cvat-ai/cvat/issues/9021:
        # filtering the upload list by index and then sorting is not equivalent to
        # sorting first and then filtering (as the extractor does).
        media_files = [f"frame_{i}.jpg" for i in (10, 1, 2, 3, 4, 5, 6, 7, 8, 9)]
        start_frame, stop_frame, step = 2, 9, 2

        filter_then_sort = sorted(
            media_files[start_frame : stop_frame + 1 : step],
            key=lambda name: int(name.removeprefix("frame_").removesuffix(".jpg")),
        )
        sort_then_filter = _get_sorted_filtered_image_paths(
            media_files,
            sorting_method=models.SortingMethod.NATURAL,
            start_frame=start_frame,
            stop_frame=stop_frame,
            step=step,
        )

        self.assertNotEqual(filter_then_sort, sort_then_filter)
        self.assertEqual(
            sort_then_filter,
            [
                "frame_3.jpg",
                "frame_5.jpg",
                "frame_7.jpg",
                "frame_9.jpg",
            ],
        )

    def test_filter_server_files_exclude(self):
        media_files = [
            "test/sub_0/img_0.jpeg",
            "test/sub_0/img_1.jpeg",
            "test/sub_1/img_0.jpeg",
            "test/sub_1/img_1.jpeg",
        ]

        self.assertEqual(_filter_server_files_exclude(media_files, None), media_files)
        self.assertEqual(
            _filter_server_files_exclude(media_files, ["test/sub_0/img_1.jpeg", "test/sub_1/"]),
            ["test/sub_0/img_0.jpeg"],
        )
