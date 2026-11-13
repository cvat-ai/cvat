# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Decode the H.264 video track of MP4 files with OpenH264."""

from .exceptions import UnsupportedVideoError, VideoDecoderError
from .media_extractors import VideoMp4ChunkReader
from .openh264.exceptions import DecoderVersionMismatchError, VideoDecoderUnavailableError
from .openh264.schemas import LibraryInfo, VideoFrame
from .openh264.services import load_library

__all__ = [
    "LibraryInfo",
    "UnsupportedVideoError",
    "DecoderVersionMismatchError",
    "VideoDecoderError",
    "VideoDecoderUnavailableError",
    "VideoFrame",
    "VideoMp4ChunkReader",
    "load_library",
]
