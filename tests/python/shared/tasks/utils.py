# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


def parse_frame_step(frame_filter: str) -> int:
    return int((frame_filter or "step=1").split("=")[1])
