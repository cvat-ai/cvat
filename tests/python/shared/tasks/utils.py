# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from collections.abc import Iterable


def parse_frame_step(frame_filter: str) -> int:
    return int((frame_filter or "step=1").split("=")[1])


def to_rel_frame(abs_frame: int, *, frame_step: int, task_start_frame: int) -> int:
    return (abs_frame - task_start_frame) // frame_step


def to_rel_frames(
    abs_frames: Iterable[int], *, frame_step: int, task_start_frame: int
) -> list[int]:
    return [
        to_rel_frame(f, frame_step=frame_step, task_start_frame=task_start_frame)
        for f in abs_frames
    ]
