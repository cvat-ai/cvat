# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Convert OpenH264 I420 output into owned Pillow RGB images."""

from __future__ import annotations

import ctypes

import PIL.Image

from ..ctypes_structs import BufferInfo
from ..errors import UnsupportedVideoChunkError

# Constant-time BT.601 limited-to-full-range lookup tables.
_LIMITED_RANGE_LUMA_LUT = tuple(
    max(0, min(255, round((value - 16) * 255 / 219))) for value in range(256)
)
_LIMITED_RANGE_CHROMA_LUT = tuple(
    max(0, min(255, round((value - 128) * 255 / 224 + 128))) for value in range(256)
)


def copy_plane(pointer: int, width: int, height: int, stride: int) -> PIL.Image.Image:
    """Copy one potentially padded I420 plane into an owned grayscale image."""

    if not pointer or width <= 0 or height <= 0 or stride < width:
        raise UnsupportedVideoChunkError("OpenH264 returned invalid I420 plane metadata")

    return PIL.Image.frombytes(
        "L",
        (width, height),
        ctypes.string_at(pointer, stride * height),
        "raw",
        "L",
        stride,
        1,
    )


def i420_to_rgb(
    planes: ctypes.Array[ctypes.c_void_p],
    info: BufferInfo,
) -> PIL.Image.Image:
    """Convert an OpenH264 I420 frame into an owned RGB image."""

    system_buffer = info.user_data.system_buffer
    if system_buffer.format != 23:
        raise UnsupportedVideoChunkError(
            f"OpenH264 returned unsupported pixel format {system_buffer.format}"
        )

    width = system_buffer.width
    height = system_buffer.height
    chroma_width = (width + 1) // 2
    chroma_height = (height + 1) // 2

    # CVAT's current chunk writers emit limited-range yuv420p. Pillow's YCbCr conversion
    # expects full-range components, so expand the planes before converting to RGB.
    y_plane = copy_plane(planes[0], width, height, system_buffer.stride[0]).point(
        _LIMITED_RANGE_LUMA_LUT
    )
    u_plane = copy_plane(planes[1], chroma_width, chroma_height, system_buffer.stride[1]).point(
        _LIMITED_RANGE_CHROMA_LUT
    )
    v_plane = copy_plane(planes[2], chroma_width, chroma_height, system_buffer.stride[1]).point(
        _LIMITED_RANGE_CHROMA_LUT
    )

    return PIL.Image.merge(
        "YCbCr",
        (
            y_plane,
            u_plane.resize((width, height), PIL.Image.Resampling.BILINEAR),
            v_plane.resize((width, height), PIL.Image.Resampling.BILINEAR),
        ),
    ).convert("RGB")
