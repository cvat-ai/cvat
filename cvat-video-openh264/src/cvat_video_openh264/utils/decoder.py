# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Discover and invoke the system-provided OpenH264 decoder library."""

from __future__ import annotations

import ctypes
import ctypes.util
import os

import PIL.Image

from ..ctypes_structs import (
    BufferInfo,
    DecoderVTable,
    DecodingParameters,
    OpenH264Version,
    VideoProperty,
)
from ..errors import DecoderUnavailableError, UnsupportedVideoChunkError
from ..models import DecoderInfo
from .i420 import i420_to_rgb


def load_library(library_path: str) -> ctypes.CDLL:
    """Load a shared library and verify the required OpenH264 entry points."""

    try:
        library = ctypes.CDLL(library_path)
        getattr(library, "WelsCreateDecoder")
        getattr(library, "WelsDestroyDecoder")
    except (AttributeError, OSError) as exc:
        raise DecoderUnavailableError(
            f"Could not load a compatible OpenH264 library from {library_path!r}: {exc}"
        ) from exc

    return library


def resolve_decoder_and_library(
    library_path: os.PathLike[str] | str | None,
) -> tuple[DecoderInfo, ctypes.CDLL]:
    """Resolve and load an explicit, configured, or system OpenH264 library."""

    configured_path = library_path or os.environ.get("CVAT_OPENH264_LIBRARY")
    resolved_path = (
        os.fspath(configured_path) if configured_path else ctypes.util.find_library("openh264")
    )
    if not resolved_path:
        raise DecoderUnavailableError(
            "OpenH264 is required for video chunks. Set CVAT_OPENH264_LIBRARY to a compatible "
            "shared library or install OpenH264 on the system."
        )

    library = load_library(resolved_path)
    version = None
    try:
        get_version = library.WelsGetCodecVersionEx
    except AttributeError:
        pass
    else:
        get_version.argtypes = [ctypes.POINTER(OpenH264Version)]
        get_version.restype = None
        native_version = OpenH264Version()
        get_version(ctypes.byref(native_version))
        version = (native_version.major, native_version.minor, native_version.revision)

    return DecoderInfo(library_path=resolved_path, version=version), library


class OpenH264Decoder:
    """Own one ctypes-backed OpenH264 decoder instance."""

    def __init__(self, decoder_info: DecoderInfo, library: ctypes.CDLL | None = None) -> None:
        self._library = library if library is not None else load_library(decoder_info.library_path)
        self._library.WelsCreateDecoder.argtypes = [ctypes.POINTER(ctypes.c_void_p)]
        self._library.WelsCreateDecoder.restype = ctypes.c_long
        self._library.WelsDestroyDecoder.argtypes = [ctypes.c_void_p]
        self._library.WelsDestroyDecoder.restype = None

        self._decoder = ctypes.c_void_p()
        result = self._library.WelsCreateDecoder(ctypes.byref(self._decoder))
        if result or not self._decoder:
            raise DecoderUnavailableError(f"OpenH264 decoder creation failed with code {result}")

        self._vtable = ctypes.cast(
            self._decoder, ctypes.POINTER(ctypes.POINTER(DecoderVTable))
        ).contents.contents
        parameters = DecodingParameters()
        parameters.video_property.size = ctypes.sizeof(VideoProperty)
        parameters.video_property.bitstream_type = 0

        result = self._vtable.initialize(self._decoder, ctypes.byref(parameters))
        if result:
            self._library.WelsDestroyDecoder(self._decoder)
            self._decoder = ctypes.c_void_p()
            raise DecoderUnavailableError(
                f"OpenH264 decoder initialization failed with code {result}"
            )

    def decode(self, access_unit: bytes) -> PIL.Image.Image | None:
        """Decode one Annex-B access unit, returning a frame when one is available."""

        source = (ctypes.c_ubyte * len(access_unit)).from_buffer_copy(access_unit)
        planes = (ctypes.c_void_p * 3)()
        buffer_info = BufferInfo()
        state = self._vtable.decode_frame_no_delay(
            self._decoder,
            source,
            len(source),
            planes,
            ctypes.byref(buffer_info),
        )
        if state & ~0x01:
            raise UnsupportedVideoChunkError(
                f"OpenH264 failed to decode the video chunk (state 0x{state:x})"
            )
        if not buffer_info.buffer_status:
            return None

        return i420_to_rgb(planes, buffer_info)

    def close(self) -> None:
        """Release the native decoder, if it is still open."""

        if not self._decoder:
            return

        try:
            self._vtable.uninitialize(self._decoder)
        finally:
            self._library.WelsDestroyDecoder(self._decoder)
            self._decoder = ctypes.c_void_p()
