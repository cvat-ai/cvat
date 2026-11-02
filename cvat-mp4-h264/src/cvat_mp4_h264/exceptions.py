# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


class VideoDecoderError(Exception):
    """Base class for the errors this package raises."""


class UnsupportedVideoError(ValueError, VideoDecoderError):
    """Raised when a chunk is outside the supported MP4/H.264 subset or cannot be decoded."""
