# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat_sdk.datasets._video_chunks.exceptions import VideoDecoderError


class VideoDecoderUnavailableError(VideoDecoderError):
    """Raised when a usable OpenH264 shared library cannot be found."""


class DecoderVersionMismatchError(VideoDecoderUnavailableError):
    """Raised when an OpenH264 library has an unsupported version."""
