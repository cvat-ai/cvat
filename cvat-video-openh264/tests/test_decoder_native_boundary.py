# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Drive the real OpenH264Decoder across the ctypes/vtable boundary.

These tests build an in-process fake OpenH264 library: real ``ctypes`` foreign-callable
``Wels*`` entry points plus a real ``ISVCDecoder`` vtable whose slots point at Python
callbacks. The production ``OpenH264Decoder`` is constructed against it unchanged, so the
actual pointer casts, ``initialize``/``decode``/``uninitialize`` calls, and cleanup paths
run without a compiled codec binary.
"""

from __future__ import annotations

import ctypes

import pytest

from cvat_video_openh264 import (
    DecoderInfo,
    UnsupportedVideoChunkError,
    VideoDecoderUnavailableError,
)
from cvat_video_openh264.ctypes_structs import (
    DecoderVTable,
    _DecodeFrameNoDelay,
    _InitializeDecoder,
    _UninitializeDecoder,
    _UnusedDecoderMethod,
)
from cvat_video_openh264.utils.decoder import OpenH264Decoder

_INFO = DecoderInfo(library_path="fake-openh264", version=(2, 4, 1))


class FakeOpenH264Library:
    """In-process stand-in exposing the two Wels* entry points the adapter binds."""

    def __init__(
        self,
        *,
        create_result: int = 0,
        init_result: int = 0,
        decode_state: int = 0,
        buffer_status: int = 0,
        pixel_format: int | None = None,
    ) -> None:
        self._keepalive: list[object] = []
        self.events = {"init": 0, "uninit": 0, "destroy": 0, "decode": 0}

        def _create(pp: ctypes.Array) -> int:
            if create_result == 0:
                pp[0] = self._make_decoder_handle(
                    init_result, decode_state, buffer_status, pixel_format
                )
            return create_result

        def _destroy(_handle: int | None) -> None:
            self.events["destroy"] += 1

        self.WelsCreateDecoder = ctypes.CFUNCTYPE(ctypes.c_long, ctypes.POINTER(ctypes.c_void_p))(
            _create
        )
        self.WelsDestroyDecoder = ctypes.CFUNCTYPE(None, ctypes.c_void_p)(_destroy)
        self._keepalive += [self.WelsCreateDecoder, self.WelsDestroyDecoder]

    def _make_decoder_handle(
        self, init_result: int, decode_state: int, buffer_status: int, pixel_format: int | None
    ) -> int:
        def _init(_decoder: int | None, _params: object) -> int:
            self.events["init"] += 1
            return init_result

        def _uninit(_decoder: int | None) -> int:
            self.events["uninit"] += 1
            return 0

        def _decode(
            _decoder: int | None,
            _data: object,
            _length: int,
            _planes: object,
            info: object,
        ) -> int:
            self.events["decode"] += 1
            info.contents.buffer_status = buffer_status
            if pixel_format is not None:
                info.contents.user_data.system_buffer.format = pixel_format
            return decode_state

        init_cb = _InitializeDecoder(_init)
        uninit_cb = _UninitializeDecoder(_uninit)
        unused_cb = _UnusedDecoderMethod(lambda: None)
        decode_cb = _DecodeFrameNoDelay(_decode)
        vtable = DecoderVTable(init_cb, uninit_cb, unused_cb, decode_cb)
        vtable_ptr = ctypes.pointer(vtable)
        # An ISVCDecoder handle is a pointer to a pointer-to-vtable; expose &vtable_ptr.
        handle_slot = ctypes.pointer(vtable_ptr)
        self._keepalive += [
            init_cb,
            uninit_cb,
            unused_cb,
            decode_cb,
            vtable,
            vtable_ptr,
            handle_slot,
        ]
        return ctypes.cast(handle_slot, ctypes.c_void_p).value


def test_construction_traverses_vtable_and_close_releases_once() -> None:
    library = FakeOpenH264Library()

    decoder = OpenH264Decoder(_INFO, library=library)
    assert library.events["init"] == 1

    decoder.close()
    assert library.events["uninit"] == 1
    assert library.events["destroy"] == 1

    # Repeated close must be an idempotent no-op.
    decoder.close()
    assert library.events["uninit"] == 1
    assert library.events["destroy"] == 1


def test_initialization_failure_destroys_decoder_and_raises() -> None:
    library = FakeOpenH264Library(init_result=1)

    with pytest.raises(VideoDecoderUnavailableError, match="initialization failed"):
        OpenH264Decoder(_INFO, library=library)

    # The half-created decoder must be destroyed even though construction failed.
    assert library.events["destroy"] == 1


def test_creation_failure_raises() -> None:
    library = FakeOpenH264Library(create_result=3)

    with pytest.raises(VideoDecoderUnavailableError, match="creation failed"):
        OpenH264Decoder(_INFO, library=library)


def test_decode_rejects_error_state() -> None:
    # 0x02 is an error bit outside the 0x01 frame-pending mask.
    library = FakeOpenH264Library(decode_state=0x02)
    decoder = OpenH264Decoder(_INFO, library=library)
    try:
        with pytest.raises(UnsupportedVideoChunkError, match="failed to decode"):
            decoder.decode(b"\x00\x00\x00\x01")
    finally:
        decoder.close()


def test_decode_rejects_missing_picture() -> None:
    library = FakeOpenH264Library(decode_state=0, buffer_status=0)
    decoder = OpenH264Decoder(_INFO, library=library)
    try:
        with pytest.raises(UnsupportedVideoChunkError, match="produced no picture"):
            decoder.decode(b"\x00\x00\x00\x01")
    finally:
        decoder.close()


def test_decode_rejects_unsupported_pixel_format() -> None:
    library = FakeOpenH264Library(decode_state=1, buffer_status=1, pixel_format=99)
    decoder = OpenH264Decoder(_INFO, library=library)
    try:
        with pytest.raises(UnsupportedVideoChunkError, match="unsupported pixel format"):
            decoder.decode(b"\x00\x00\x00\x01")
    finally:
        decoder.close()


@pytest.mark.parametrize("empty", ["", "   "])
def test_empty_explicit_path_reports_configuration_error(empty: str) -> None:
    from cvat_video_openh264.utils.decoder import _discover_library_path

    with pytest.raises(VideoDecoderUnavailableError, match="is empty"):
        _discover_library_path(empty)


def test_empty_environment_path_reports_configuration_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from cvat_video_openh264.utils.decoder import _discover_library_path

    monkeypatch.setenv("CVAT_OPENH264_LIBRARY", "")

    with pytest.raises(VideoDecoderUnavailableError, match="is empty"):
        _discover_library_path(None)
