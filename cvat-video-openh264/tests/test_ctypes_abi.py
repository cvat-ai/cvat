# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Binary-free guards for the OpenH264 ctypes ABI the adapter binds.

These assertions pin the ``SDecodingParam``/``ISVCDecoder`` layout the bindings assume
so a silent field change (or a mismatch with the accepted version window) fails in CI
without needing a real OpenH264 shared library.
"""

import ctypes

import pytest

from cvat_video_openh264.ctypes_structs import (
    BufferInfo,
    DecoderVTable,
    DecodingParameters,
    OpenH264Version,
    VideoProperty,
)
from cvat_video_openh264.errors import UnsupportedVideoChunkError
from cvat_video_openh264.utils.decoder import MAX_SUPPORTED_MAJOR, MIN_SUPPORTED_VERSION
from cvat_video_openh264.utils.i420 import copy_plane


def _field_names(structure: type[ctypes.Structure]) -> list[str]:
    return [name for name, *_ in structure._fields_]


def test_version_window_matches_post_1_6_abi() -> None:
    # The bindings model the post-1.6 SDecodingParam layout, so the accepted floor must
    # not drop back into the 1.0-1.5 ABI, and the ceiling must exclude unknown majors.
    assert MIN_SUPPORTED_VERSION >= (1, 6, 0)
    assert MAX_SUPPORTED_MAJOR == 2


def test_decoding_parameters_matches_post_1_6_layout() -> None:
    assert _field_names(DecodingParameters) == [
        "reconstructed_file_name",
        "cpu_load",
        "target_layer",
        "error_concealment",
        "parse_only",
        "video_property",
    ]
    # cpu_load must sit immediately after the leading pointer. OpenH264 1.0-1.5 placed an
    # extra eOutputColorFormat int here; if it crept back in, this offset would grow and
    # video_property would be written past where Initialize reads it.
    assert DecodingParameters.reconstructed_file_name.offset == 0
    assert DecodingParameters.cpu_load.offset == ctypes.sizeof(ctypes.c_void_p)
    # video_property is the trailing field the decoder reads back.
    last_field = max(
        _field_names(DecodingParameters),
        key=lambda name: getattr(DecodingParameters, name).offset,
    )
    assert last_field == "video_property"


def test_video_property_and_version_layout() -> None:
    assert _field_names(VideoProperty) == ["size", "bitstream_type"]
    assert VideoProperty.size.offset == 0
    assert VideoProperty.bitstream_type.offset == 4

    assert _field_names(OpenH264Version) == ["major", "minor", "revision", "reserved"]
    assert ctypes.sizeof(OpenH264Version) == 4 * ctypes.sizeof(ctypes.c_uint)


def test_vtable_and_buffer_info_layout() -> None:
    assert _field_names(DecoderVTable) == [
        "initialize",
        "uninitialize",
        "decode_frame",
        "decode_frame_no_delay",
    ]
    assert BufferInfo.buffer_status.offset == 0


@pytest.mark.parametrize(
    ("width", "height", "stride"),
    [
        (0, 2, 2),  # non-positive width
        (2, 0, 2),  # non-positive height
        (2, 2, 1),  # stride narrower than width would over-read
    ],
)
def test_copy_plane_rejects_invalid_metadata(width: int, height: int, stride: int) -> None:
    source = ctypes.create_string_buffer(16)
    with pytest.raises(UnsupportedVideoChunkError):
        copy_plane(ctypes.addressof(source), width=width, height=height, stride=stride)


def test_copy_plane_rejects_null_pointer() -> None:
    with pytest.raises(UnsupportedVideoChunkError):
        copy_plane(0, width=2, height=2, stride=2)
