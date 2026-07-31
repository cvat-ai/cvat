# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Public exceptions raised by the CVAT OpenH264 adapter."""


class VideoDecoderError(Exception):
    """Base class for stable video-decoder failures."""


class VideoDecoderUnavailableError(RuntimeError, VideoDecoderError):
    """Raised when a usable OpenH264 shared library cannot be found."""


# Preserve the proof-of-concept name as an alias of the production exception.
DecoderUnavailableError = VideoDecoderUnavailableError


class UnsupportedVideoChunkError(ValueError, VideoDecoderError):
    """Raised when a chunk is outside the constrained CVAT MP4/H.264 contract."""


class UnsupportedDecoderPlatformError(VideoDecoderError):
    """Raised when the operating system or architecture is unsupported."""


class DecoderVersionMismatchError(VideoDecoderError):
    """Raised when an OpenH264 library has an unsupported version or ABI."""


class DecoderIntegrityError(VideoDecoderError):
    """Raised when decoder code or data fails an integrity check."""


class DecoderProvisioningError(VideoDecoderError):
    """Raised when a user-requested managed-codec operation fails."""
