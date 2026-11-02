# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from cvat_sdk.datasets._video_chunks.exceptions import VideoDecoderError


class VideoDecoderUnavailableError(VideoDecoderError):
    """Raised when the OpenH264 shared library cannot be loaded or used."""


class DecoderVersionMismatchError(VideoDecoderUnavailableError):
    """Raised when an OpenH264 library has an unsupported version."""
