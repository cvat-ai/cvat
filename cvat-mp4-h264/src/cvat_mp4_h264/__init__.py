# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Decode the H.264 video track of MP4 files with OpenH264."""

from .chunk_readers import VideoMp4ChunkReader
from .openh264.schemas import VideoFrame

__all__ = [
    "VideoFrame",
    "VideoMp4ChunkReader",
]
