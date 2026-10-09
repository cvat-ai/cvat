# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import ctypes

import pytest

from cvat_video_openh264.ctypes_structs import BufferInfo
from cvat_video_openh264.utils.i420 import copy_plane, i420_to_rgb

from tests.helpers import convert_single_i420_pixel


def test_copy_plane_honors_stride() -> None:
    source = ctypes.create_string_buffer(bytes((16, 17, 255, 18, 19, 255)))

    plane = copy_plane(ctypes.addressof(source), width=2, height=2, stride=3)

    assert plane.tobytes() == bytes((16, 17, 18, 19))


@pytest.mark.parametrize(
    ("limited_range_y", "expected_rgb"),
    [(16, (0, 0, 0)), (235, (255, 255, 255))],
)
def test_i420_conversion_expands_limited_range_luma(
    limited_range_y: int,
    expected_rgb: tuple[int, int, int],
) -> None:
    assert convert_single_i420_pixel(limited_range_y) == expected_rgb


def test_i420_conversion_supports_odd_dimensions_and_owns_output() -> None:
    width = 3
    height = 3
    y_stride = 4
    uv_stride = 3
    y_source = ctypes.create_string_buffer(bytes((16, 32, 48, 0)) * height)
    u_source = ctypes.create_string_buffer(bytes((128, 144, 0)) * 2)
    v_source = ctypes.create_string_buffer(bytes((128, 112, 0)) * 2)
    planes = (ctypes.c_void_p * 3)(
        ctypes.addressof(y_source),
        ctypes.addressof(u_source),
        ctypes.addressof(v_source),
    )
    buffer_info = BufferInfo()
    system_buffer = buffer_info.user_data.system_buffer
    system_buffer.width = width
    system_buffer.height = height
    system_buffer.format = 23
    system_buffer.stride[0] = y_stride
    system_buffer.stride[1] = uv_stride

    image = i420_to_rgb(planes, buffer_info)
    owned_pixels = image.tobytes()
    ctypes.memset(ctypes.addressof(y_source), 255, ctypes.sizeof(y_source))
    ctypes.memset(ctypes.addressof(u_source), 0, ctypes.sizeof(u_source))
    ctypes.memset(ctypes.addressof(v_source), 0, ctypes.sizeof(v_source))

    assert image.mode == "RGB"
    assert image.size == (width, height)
    assert image.tobytes() == owned_pixels
