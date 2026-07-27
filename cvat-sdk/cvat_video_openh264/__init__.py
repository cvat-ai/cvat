# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Proof-of-concept boundary for the future ``cvat-video-openh264`` package.

The PoC ships this library inside the CVAT SDK distribution. Its public API is
kept independent of ``cvat_sdk`` so the directory can become a separately
versioned package without changing SDK consumers.
"""

from ._reader import (
    DecoderInfo,
    DecoderUnavailableError,
    UnsupportedVideoChunkError,
    iter_frames,
    resolve_decoder,
)

__all__ = [
    "DecoderInfo",
    "DecoderUnavailableError",
    "UnsupportedVideoChunkError",
    "iter_frames",
    "resolve_decoder",
]
