# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Load OpenH264 and decode H.264 access units with it."""

from __future__ import annotations

import ctypes

from ..exceptions import UnsupportedVideoError
from ..settings import OPENH264_LIBRARY_ENV_VAR, get_openh264_library_path
from .bindings import ISVCDecoder, SBufferInfo, SDecodingParam, SVideoProperty, declare_functions
from .consts import (
    DECODING_STATE,
    ERROR_CON_DISABLE,
    MAX_ACCESS_UNIT_CAPACITY,
    VIDEO_BITSTREAM_AVC,
)
from .exceptions import VideoDecoderUnavailableError
from .schemas import LibraryInfo, VideoFrame
from .utils import (
    copy_i420_frame,
    ensure_supported_version,
    open_shared_library,
    probe_version,
)


def load_library() -> LibraryInfo:
    """Find, load and version-validate the OpenH264 library."""

    library_path = get_openh264_library_path()
    if library_path is None:
        raise VideoDecoderUnavailableError(
            "Decoding video chunks requires OpenH264. "
            f"Set {OPENH264_LIBRARY_ENV_VAR} to the path of the OpenH264 shared library."
        )

    library = open_shared_library(library_path=library_path)
    declare_functions(library=library)
    version = probe_version(library=library)
    ensure_supported_version(version=version, library_path=library_path)

    return LibraryInfo(library_path=library_path, version=version, library=library)


class OpenH264Decoder:
    """One native OpenH264 decoder, alive only inside a ``with`` block. Not thread-safe."""

    def __init__(self, library: ctypes.CDLL) -> None:
        self._library = library
        self._decoder = ctypes.POINTER(ISVCDecoder)()

    def __enter__(self) -> OpenH264Decoder:
        try:
            result = self._library.WelsCreateDecoder(ctypes.byref(self._decoder))
            if result or not self._decoder:
                raise VideoDecoderUnavailableError(
                    f"OpenH264 decoder creation failed with code {result}"
                )

            self._vtable = self._decoder.contents.contents
            parameters = SDecodingParam()
            parameters.eEcActiveIdc = ERROR_CON_DISABLE
            parameters.sVideoProperty.size = ctypes.sizeof(SVideoProperty)
            parameters.sVideoProperty.eVideoBsType = VIDEO_BITSTREAM_AVC

            result = self._vtable.Initialize(self._decoder, ctypes.byref(parameters))
            if result:
                raise VideoDecoderUnavailableError(
                    f"OpenH264 decoder initialization failed with code {result}"
                )
        except BaseException:
            self.__exit__()
            raise

        return self

    def __exit__(self, *_exception_info: object) -> None:
        if self._decoder:
            self._library.WelsDestroyDecoder(self._decoder)
            self._decoder = ctypes.POINTER(ISVCDecoder)()

    def decode(self, access_unit: bytes) -> VideoFrame:
        """Decode one Annex-B access unit into exactly one frame."""

        if not self._decoder:
            raise ValueError("The decoder can only be used inside its with block")
        if len(access_unit) >= MAX_ACCESS_UNIT_CAPACITY:
            raise UnsupportedVideoError(
                f"An access unit of {len(access_unit)} bytes exceeds the OpenH264 limit of "
                f"{MAX_ACCESS_UNIT_CAPACITY} bytes"
            )

        planes = (ctypes.c_void_p * 3)()
        buffer_info = SBufferInfo()
        state = DECODING_STATE(
            self._vtable.DecodeFrameNoDelay(
                self._decoder,
                access_unit,
                len(access_unit),
                planes,
                ctypes.byref(buffer_info),
            )
        )
        if state != DECODING_STATE.dsErrorFree:
            raise UnsupportedVideoError(
                f"OpenH264 failed to decode an access unit: {state.name} ({hex(state)})"
            )
        # An error-free state without a picture means the access unit held an incomplete one.
        if not buffer_info.iBufferStatus:
            raise UnsupportedVideoError("OpenH264 produced no picture for an access unit")

        return copy_i420_frame(planes, buffer_info)
