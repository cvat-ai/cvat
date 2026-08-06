# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.engine import models
from cvat.apps.engine.task import (
    _get_sorted_filtered_image_paths,
    _is_frame_filter_active,
)


class TestTaskImageSelection:
    def test_frame_filter_active(self):
        assert _is_frame_filter_active(
            start_frame=0, stop_frame=9, step=1, media_count=10
        ) is False
        assert _is_frame_filter_active(
            start_frame=2, stop_frame=9, step=1, media_count=10
        ) is True
        assert _is_frame_filter_active(
            start_frame=0, stop_frame=9, step=2, media_count=10
        ) is True
        assert _is_frame_filter_active(
            start_frame=0, stop_frame=5, step=1, media_count=10
        ) is True

    def test_sorted_filtered_image_paths_natural(self):
        media_files = [f"frame_{i}.jpg" for i in range(1, 15)]

        result = _get_sorted_filtered_image_paths(
            media_files,
            sorting_method=models.SortingMethod.NATURAL,
            start_frame=2,
            stop_frame=14,
            step=2,
        )

        assert result == [
            "frame_3.jpg",
            "frame_5.jpg",
            "frame_7.jpg",
            "frame_9.jpg",
            "frame_11.jpg",
            "frame_13.jpg",
        ]

    def test_sorted_filtered_image_paths_without_filter(self):
        media_files = [f"frame_{i}.jpg" for i in (3, 1, 2)]

        result = _get_sorted_filtered_image_paths(
            media_files,
            sorting_method=models.SortingMethod.NATURAL,
            start_frame=0,
            stop_frame=None,
            step=1,
        )

        assert result == ["frame_1.jpg", "frame_2.jpg", "frame_3.jpg"]
