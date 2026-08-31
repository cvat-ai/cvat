# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Utilities used by the CVAT OpenH264 video reader."""

from .decoder import (
    OpenH264Decoder,
    load_library,
    resolve_decoder_and_library,
    unload_library,
)
from .i420 import copy_plane, i420_to_rgb
from .mp4 import (
    ANNEX_B_START_CODE,
    MAX_SAMPLE_COUNT,
    MAX_SAMPLE_SIZE,
    build_samples,
    iter_access_units_from_stream,
    iter_boxes,
    parse_sample_sizes,
    read_video_track_from_stream,
)

__all__ = [
    "ANNEX_B_START_CODE",
    "MAX_SAMPLE_COUNT",
    "MAX_SAMPLE_SIZE",
    "OpenH264Decoder",
    "build_samples",
    "copy_plane",
    "i420_to_rgb",
    "iter_access_units_from_stream",
    "iter_boxes",
    "load_library",
    "parse_sample_sizes",
    "read_video_track_from_stream",
    "resolve_decoder_and_library",
    "unload_library",
]
