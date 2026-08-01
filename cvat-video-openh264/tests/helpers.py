# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Reusable helpers for package tests."""

import ctypes

import PIL.Image
import pytest

import cvat_video_openh264._reader as reader
from cvat_video_openh264 import DecoderInfo
from cvat_video_openh264.ctypes_structs import BufferInfo


def convert_single_i420_pixel(y: int, u: int = 128, v: int = 128) -> tuple[int, int, int]:
    """Convert one I420 pixel through the package's decoded-frame conversion path."""

    y_source = ctypes.create_string_buffer(bytes((y,)))
    u_source = ctypes.create_string_buffer(bytes((u,)))
    v_source = ctypes.create_string_buffer(bytes((v,)))
    planes = (ctypes.c_void_p * 3)(
        ctypes.addressof(y_source),
        ctypes.addressof(u_source),
        ctypes.addressof(v_source),
    )
    buffer_info = BufferInfo()
    system_buffer = buffer_info.user_data.system_buffer
    system_buffer.width = 1
    system_buffer.height = 1
    system_buffer.format = 23
    system_buffer.stride[0] = 1
    system_buffer.stride[1] = 1

    return reader._i420_to_rgb(planes, buffer_info).getpixel((0, 0))


def install_fake_decoder(
    monkeypatch: pytest.MonkeyPatch,
    *,
    decode_result: PIL.Image.Image | None = None,
    captured_units: list[bytes] | None = None,
) -> dict[str, bool]:
    """Replace decoder discovery and construction with an in-process test double."""

    state = {"closed": False}

    class FakeDecoder:
        def __init__(self, decoder_info: DecoderInfo, library: ctypes.CDLL | None = None) -> None:
            assert decoder_info.library_path == "fake-openh264"

        def decode(self, access_unit: bytes) -> PIL.Image.Image | None:
            if captured_units is not None:
                captured_units.append(access_unit)
            return decode_result

        def close(self) -> None:
            state["closed"] = True

    monkeypatch.setattr(
        reader,
        "_resolve_decoder_and_library",
        lambda _library_path: (DecoderInfo(library_path="fake-openh264", version=None), None),
    )
    monkeypatch.setattr(reader, "_OpenH264Decoder", FakeDecoder)
    return state
