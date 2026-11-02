# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Load the OpenH264 library and copy its output."""

from __future__ import annotations

import ctypes
import os

import PIL.Image

from ..exceptions import UnsupportedVideoError
from .bindings import OpenH264Version, SBufferInfo, declare_functions
from .consts import SUPPORTED_MAJOR_VERSION, videoFormatI420
from .exceptions import DecoderVersionMismatchError, VideoDecoderUnavailableError
from .schemas import LibraryInfo, VideoFrame


def _load_library(library_path: str) -> ctypes.CDLL:
    try:
        library = ctypes.CDLL(library_path)
    except OSError as exc:
        raise VideoDecoderUnavailableError(
            f"Could not load a compatible OpenH264 library from {library_path!r}: {exc}"
        ) from exc

    return library


def _probe_version(library: ctypes.CDLL) -> tuple[int, int, int]:
    native_version = OpenH264Version()
    library.WelsGetCodecVersionEx(ctypes.byref(native_version))
    return (native_version.uMajor, native_version.uMinor, native_version.uRevision)


def _ensure_supported_version(version: tuple[int, int, int], library_path: str) -> None:
    if version[0] != SUPPORTED_MAJOR_VERSION:
        reported = ".".join(map(str, version))
        raise DecoderVersionMismatchError(
            f"OpenH264 library {library_path!r} reports version {reported}, "
            f"but only {SUPPORTED_MAJOR_VERSION}.x is supported."
        )


def load_library(library_path: os.PathLike[str] | str) -> LibraryInfo:
    """Load and version-validate the OpenH264 library at ``library_path``."""

    resolved_path = os.fspath(library_path)
    library = _load_library(library_path=resolved_path)
    declare_functions(library=library)
    version = _probe_version(library=library)
    _ensure_supported_version(version=version, library_path=resolved_path)

    return LibraryInfo(library_path=resolved_path, version=version, library=library)


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
