# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Load the OpenH264 library and copy its output."""

from __future__ import annotations

import ctypes
import platform
import sys
from pathlib import Path

import PIL.Image
import platformdirs

from ..exceptions import UnsupportedVideoError
from .bindings import OpenH264Version, SBufferInfo, declare_functions
from .consts import SUPPORTED_MAJOR_VERSION, videoFormatI420
from .exceptions import DecoderVersionMismatchError, VideoDecoderUnavailableError
from .schemas import LibraryInfo, VideoFrame


def get_library_install_path() -> Path:
    """Return where `python -m cvat_mp4_h264 install` puts the library; the file may not exist."""

    file_names = {
        "darwin": "libopenh264.dylib",
        "win32": "openh264.dll",
    }
    file_name = file_names.get(sys.platform, "libopenh264.so")
    return (
        platformdirs.user_data_path("cvat-mp4-h264", "CVAT.ai")
        / f"openh264-{SUPPORTED_MAJOR_VERSION}"
        / file_name
    )


def open_shared_library(library_path: str) -> ctypes.CDLL:
    try:
        library = ctypes.CDLL(library_path)
    except OSError as exc:
        raise VideoDecoderUnavailableError(
            f"Could not load a compatible OpenH264 library from {library_path!r}: {exc}. "
            f"The library must be an OpenH264 {SUPPORTED_MAJOR_VERSION}.x build "
            f"for {sys.platform} {platform.machine()}."
        ) from exc

    return library


def probe_version(library: ctypes.CDLL) -> tuple[int, int, int]:
    native_version = OpenH264Version()
    library.WelsGetCodecVersionEx(ctypes.byref(native_version))
    return (native_version.uMajor, native_version.uMinor, native_version.uRevision)


def ensure_supported_version(version: tuple[int, int, int], library_path: str) -> None:
    if version[0] != SUPPORTED_MAJOR_VERSION:
        reported = ".".join(map(str, version))
        raise DecoderVersionMismatchError(
            f"OpenH264 library {library_path!r} reports version {reported}, "
            f"but only {SUPPORTED_MAJOR_VERSION}.x is supported."
        )


def load_library_from_path(library_path: str) -> LibraryInfo:
    """Load and version-validate the OpenH264 library at the given path."""

    library = open_shared_library(library_path=library_path)
    declare_functions(library=library)
    version = probe_version(library=library)
    ensure_supported_version(version=version, library_path=library_path)

    return LibraryInfo(library_path=library_path, version=version, library=library)


def _copy_plane(pointer: int, width: int, height: int, stride: int) -> PIL.Image.Image:
    if not pointer or width <= 0 or height <= 0 or stride < width:
        raise UnsupportedVideoError("OpenH264 returned invalid I420 plane metadata")

    return PIL.Image.frombytes(
        "L",
        (width, height),
        ctypes.string_at(pointer, stride * height),
        "raw",
        "L",
        stride,
        1,
    )


def copy_i420_frame(planes: ctypes.Array[ctypes.c_void_p], info: SBufferInfo) -> VideoFrame:
    system_buffer = info.UsrData.sSystemBuffer
    if system_buffer.iFormat != videoFormatI420:
        raise UnsupportedVideoError(
            f"OpenH264 returned unsupported pixel format {system_buffer.iFormat}"
        )

    width = system_buffer.iWidth
    height = system_buffer.iHeight
    chroma_width = (width + 1) // 2
    chroma_height = (height + 1) // 2

    return VideoFrame(
        width=width,
        height=height,
        planes=(
            _copy_plane(
                pointer=planes[0], width=width, height=height, stride=system_buffer.iStride[0]
            ),
            _copy_plane(
                pointer=planes[1],
                width=chroma_width,
                height=chroma_height,
                stride=system_buffer.iStride[1],
            ),
            _copy_plane(
                pointer=planes[2],
                width=chroma_width,
                height=chroma_height,
                stride=system_buffer.iStride[1],
            ),
        ),
    )
