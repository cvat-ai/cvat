# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Reusable helpers for package tests."""

import ctypes

import PIL.Image
import pytest

import cvat_video_openh264.reader as reader
from cvat_video_openh264 import DecoderInfo, UnsupportedVideoChunkError
from cvat_video_openh264.ctypes_structs import BufferInfo
from cvat_video_openh264.utils.i420 import i420_to_rgb


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

    return i420_to_rgb(planes, buffer_info).getpixel((0, 0))


def install_fake_decoder(
    monkeypatch: pytest.MonkeyPatch,
    *,
    decode_result: PIL.Image.Image | None = None,
    captured_units: list[bytes] | None = None,
) -> dict[str, bool]:
    """Replace decoder discovery and construction with an in-process test double."""

    state = {"closed": False}
    fake_library = object()

    class FakeDecoder:
        def __init__(self, library: ctypes.CDLL) -> None:
            # The reader must hand the decoder the library it just resolved.
            assert library is fake_library

        def __enter__(self) -> "FakeDecoder":
            return self

        def __exit__(self, *_exception_info: object) -> None:
            self.close()

        def decode(self, access_unit: bytes) -> PIL.Image.Image:
            if captured_units is not None:
                captured_units.append(access_unit)
            if decode_result is None:
                raise UnsupportedVideoChunkError(
                    "OpenH264 produced no picture for a CVAT access unit"
                )
            return decode_result

        def close(self) -> None:
            state["closed"] = True

    monkeypatch.setattr(
        reader,
        "resolve_decoder_and_library",
        lambda _library_path: (
            DecoderInfo(library_path="fake-openh264", version=(1, 6, 0)),
            fake_library,
        ),
    )
    monkeypatch.setattr(reader, "OpenH264Decoder", FakeDecoder)
    return state
