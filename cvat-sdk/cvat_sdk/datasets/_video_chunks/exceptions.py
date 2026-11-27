# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


class VideoDecoderError(Exception):
    """Base class for the errors the video chunk decoder raises."""


class UnsupportedVideoError(VideoDecoderError):
    """Raised when a file is not a video chunk as CVAT writes them, or cannot be decoded."""
