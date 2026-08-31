# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Discover and invoke the system-provided OpenH264 decoder library."""

from __future__ import annotations

import ctypes
import ctypes.util
import os

import _ctypes
import PIL.Image

from ..ctypes_structs import (
    BufferInfo,
    DecoderVTable,
    DecodingParameters,
    OpenH264Version,
    VideoProperty,
)
from ..errors import (
    DecoderVersionMismatchError,
    UnsupportedVideoChunkError,
    VideoDecoderUnavailableError,
)
from ..models import DecoderInfo
from .i420 import i420_to_rgb

# OpenH264 ABI window this adapter's ctypes bindings match. The floor is 1.6.0 because
# OpenH264 1.0-1.5 carried an extra ``eOutputColorFormat`` field in ``SDecodingParam``
# that was removed in 1.6.0; ``DecodingParameters`` mirrors the post-1.6 layout, so
# initializing a 1.0-1.5 library would write ``sVideoProperty`` at the wrong offset. The
# ceiling rejects unknown future majors whose ``ISVCDecoder`` vtable or structs could
# change again. Widen this window deliberately once a new major line is reviewed.
MIN_SUPPORTED_VERSION = (1, 6, 0)
MAX_SUPPORTED_MAJOR = 2

# LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_SYSTEM32. On Windows this pins
# the load-time dependency search to the codec's own directory and System32 so a DLL
# planted in the current working directory or on PATH cannot be picked up as one of
# libopenh264's dependencies.
_WINDOWS_SAFE_LOAD_FLAGS = 0x00000100 | 0x00000800


def load_library(library_path: str) -> ctypes.CDLL:
    """Load a shared library and verify the required OpenH264 entry points."""

    try:
        if os.name == "nt":
            library = ctypes.CDLL(library_path, winmode=_WINDOWS_SAFE_LOAD_FLAGS)
        else:
            library = ctypes.CDLL(library_path)
    except OSError as exc:
        raise VideoDecoderUnavailableError(
            f"Could not load a compatible OpenH264 library from {library_path!r}: {exc}"
        ) from exc

    try:
        library.WelsCreateDecoder
        library.WelsDestroyDecoder
    except AttributeError as exc:
        # The library loaded but is not OpenH264; release the handle before failing so a
        # rejected candidate does not leak a loader reference.
        unload_library(library)
        raise VideoDecoderUnavailableError(
            f"Could not load a compatible OpenH264 library from {library_path!r}: {exc}"
        ) from exc

    return library


def unload_library(library: ctypes.CDLL | None) -> None:
    """Release the OS handle for a library this adapter loaded.

    CPython's ``ctypes.CDLL`` never calls ``dlclose``/``FreeLibrary`` on its own, so a
    library loaded per chunk keeps a loader reference for the life of the process. That
    blocks replacing or uninstalling a managed DLL on Windows. Callers that own a loaded
    handle must release it here; libraries supplied by the caller are their responsibility.
    """

    if library is None:
        return

    handle = library._handle
    if os.name == "nt":
        _ctypes.FreeLibrary(handle)
    else:
        _ctypes.dlclose(handle)


def _discover_library_path(library_path: os.PathLike[str] | str | None) -> str:
    """Resolve the OpenH264 library path without loading it.

    An explicit ``library_path`` or ``CVAT_OPENH264_LIBRARY`` is authoritative. When
    neither is set, only POSIX platforms fall back to system-library discovery. Windows
    intentionally requires an explicit absolute path so the current working directory and
    ``PATH`` never influence codec selection.
    """

    if library_path is not None:
        configured_path = os.fspath(library_path)
        configured_source = "library_path"
    else:
        configured_path = os.environ.get("CVAT_OPENH264_LIBRARY")
        configured_source = "CVAT_OPENH264_LIBRARY"

    if configured_path is not None and not configured_path.strip():
        raise VideoDecoderUnavailableError(
            f"The OpenH264 library path from {configured_source} is empty; set it to a valid "
            "shared-library path."
        )

    if configured_path:
        if os.name == "nt" and not os.path.isabs(configured_path):
            raise VideoDecoderUnavailableError(
                "An explicit OpenH264 library path must be absolute on Windows so the "
                "current working directory and PATH never influence codec selection."
            )
        return configured_path

    resolved_path = None if os.name == "nt" else ctypes.util.find_library("openh264")
    if not resolved_path:
        raise VideoDecoderUnavailableError(
            "OpenH264 is required for video chunks. Set CVAT_OPENH264_LIBRARY to a compatible "
            "shared library or install OpenH264 on the system."
        )

    return resolved_path


def _probe_version(library: ctypes.CDLL) -> tuple[int, int, int] | None:
    """Read the OpenH264 version, preferring the pointer-out ``Ex`` entry point."""

    try:
        get_version_ex = library.WelsGetCodecVersionEx
    except AttributeError:
        pass
    else:
        get_version_ex.argtypes = [ctypes.POINTER(OpenH264Version)]
        get_version_ex.restype = None
        native_version = OpenH264Version()
        get_version_ex(ctypes.byref(native_version))
        return (native_version.major, native_version.minor, native_version.revision)

    try:
        get_version = library.WelsGetCodecVersion
    except AttributeError:
        return None

    get_version.argtypes = []
    get_version.restype = OpenH264Version
    native_version = get_version()
    return (native_version.major, native_version.minor, native_version.revision)


def ensure_supported_version(
    version: tuple[int, int, int] | None,
    library_path: str,
) -> None:
    """Reject a library whose reported OpenH264 version is unreadable or too old."""

    if version is None:
        raise DecoderVersionMismatchError(
            f"OpenH264 library {library_path!r} does not export a readable codec version; "
            "it is not a supported OpenH264 build."
        )
    if version < MIN_SUPPORTED_VERSION or version[0] > MAX_SUPPORTED_MAJOR:
        supported = ".".join(map(str, MIN_SUPPORTED_VERSION))
        reported = ".".join(map(str, version))
        raise DecoderVersionMismatchError(
            f"OpenH264 library {library_path!r} reports version {reported}, but this adapter "
            f"only supports the {supported}..{MAX_SUPPORTED_MAJOR}.x ABI window."
        )


def resolve_decoder_and_library(
    library_path: os.PathLike[str] | str | None,
) -> tuple[DecoderInfo, ctypes.CDLL]:
    """Resolve, load, and version-validate an explicit, configured, or system library."""

    resolved_path = _discover_library_path(library_path)
    library = load_library(resolved_path)
    try:
        version = _probe_version(library)
        ensure_supported_version(version, resolved_path)
    except BaseException:
        # Version probe/rejection must not leak the handle we just loaded.
        unload_library(library)
        raise

    return DecoderInfo(library_path=resolved_path, version=version), library


class OpenH264Decoder:
    """Own one ctypes-backed OpenH264 decoder instance.

    The adapter binds OpenH264's stable ``ISVCDecoder`` vtable and ``Wels*`` entry points
    through ``ctypes`` so the package stays pure Python and installs as a single
    ``py3-none-any`` wheel with no compiler or per-interpreter build.
    """

    def __init__(self, decoder_info: DecoderInfo, library: ctypes.CDLL | None = None) -> None:
        # When no library is supplied the decoder loads and therefore owns the handle, so a
        # construction failure (or close) must release it. A caller-supplied library stays
        # the caller's responsibility.
        self._owns_library = library is None
        self._library: ctypes.CDLL | None = (
            library if library is not None else load_library(decoder_info.library_path)
        )
        self._decoder = ctypes.c_void_p()
        try:
            self._library.WelsCreateDecoder.argtypes = [ctypes.POINTER(ctypes.c_void_p)]
            self._library.WelsCreateDecoder.restype = ctypes.c_long
            self._library.WelsDestroyDecoder.argtypes = [ctypes.c_void_p]
            self._library.WelsDestroyDecoder.restype = None

            result = self._library.WelsCreateDecoder(ctypes.byref(self._decoder))
            if result or not self._decoder:
                raise VideoDecoderUnavailableError(
                    f"OpenH264 decoder creation failed with code {result}"
                )

            self._vtable = ctypes.cast(
                self._decoder, ctypes.POINTER(ctypes.POINTER(DecoderVTable))
            ).contents.contents
            parameters = DecodingParameters()
            parameters.video_property.size = ctypes.sizeof(VideoProperty)
            parameters.video_property.bitstream_type = 0

            result = self._vtable.initialize(self._decoder, ctypes.byref(parameters))
            if result:
                raise VideoDecoderUnavailableError(
                    f"OpenH264 decoder initialization failed with code {result}"
                )
        except BaseException:
            if self._decoder:
                self._library.WelsDestroyDecoder(self._decoder)
                self._decoder = ctypes.c_void_p()
            if self._owns_library:
                unload_library(self._library)
                self._library = None
            raise

    def decode(self, access_unit: bytes) -> PIL.Image.Image:
        """Decode one Annex-B access unit into a frame.

        Per H.264, decoding an access unit always yields a decoded picture, and CVAT
        chunks are constrained-baseline (no reordering), so each access unit must
        produce exactly one frame. A missing picture is treated as a decoder failure.
        """

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
            raise UnsupportedVideoChunkError("OpenH264 produced no picture for a CVAT access unit")

        return i420_to_rgb(planes, buffer_info)

    def close(self) -> None:
        """Release the native decoder and, if owned, the library. Idempotent."""

        if self._decoder:
            try:
                self._vtable.uninitialize(self._decoder)
            finally:
                self._library.WelsDestroyDecoder(self._decoder)
                self._decoder = ctypes.c_void_p()

        if self._owns_library and self._library is not None:
            unload_library(self._library)
            self._library = None
