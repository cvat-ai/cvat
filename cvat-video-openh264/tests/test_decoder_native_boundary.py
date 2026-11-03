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
    UnsupportedVideoChunkError,
    VideoDecoderUnavailableError,
)
from cvat_video_openh264.ctypes_structs import (
    DecoderHandle,
    DecoderVTable,
    _DecodeFrameNoDelay,
    _InitializeDecoder,
    _UninitializeDecoder,
    _UnusedDecoderMethod,
)
from cvat_video_openh264.utils.decoder import OpenH264Decoder


class FakeOpenH264Library:
    """In-process stand-in exposing the two Wels* entry points ``OpenH264Decoder`` calls."""

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
        self.decoded: list[bytes] = []

        def _create(pp: object) -> int:
            if create_result == 0:
                pp[0] = self._make_decoder_handle(
                    init_result, decode_state, buffer_status, pixel_format
                )
            return create_result

        def _destroy(_handle: int | None) -> None:
            self.events["destroy"] += 1

        self.WelsCreateDecoder = ctypes.CFUNCTYPE(ctypes.c_long, ctypes.POINTER(DecoderHandle))(
            _create
        )
        self.WelsDestroyDecoder = ctypes.CFUNCTYPE(None, ctypes.c_void_p)(_destroy)
        self._keepalive += [self.WelsCreateDecoder, self.WelsDestroyDecoder]

    def _make_decoder_handle(
        self, init_result: int, decode_state: int, buffer_status: int, pixel_format: int | None
    ) -> DecoderHandle:
        def _init(_decoder: int | None, _params: object) -> int:
            self.events["init"] += 1
            return init_result

        def _uninit(_decoder: int | None) -> int:
            self.events["uninit"] += 1
            return 0

        def _decode(
            _decoder: int | None,
            data: object,
            length: int,
            _planes: object,
            info: object,
        ) -> int:
            self.events["decode"] += 1
            self.decoded.append(bytes(data[:length]))
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
        return handle_slot


def test_construction_traverses_vtable_and_close_releases_once() -> None:
    library = FakeOpenH264Library()

    decoder = OpenH264Decoder(library)
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
        OpenH264Decoder(library)

    # The half-created decoder must be destroyed even though construction failed.
    assert library.events["destroy"] == 1


def test_creation_failure_raises() -> None:
    library = FakeOpenH264Library(create_result=3)

    with pytest.raises(VideoDecoderUnavailableError, match="creation failed"):
        OpenH264Decoder(library)


def test_leaving_the_context_manager_releases_the_decoder() -> None:
    library = FakeOpenH264Library()

    with OpenH264Decoder(library) as decoder:
        assert library.events["init"] == 1
        assert library.events["destroy"] == 0
        assert isinstance(decoder, OpenH264Decoder)

    assert library.events["uninit"] == 1
    assert library.events["destroy"] == 1


def test_decode_passes_the_access_unit_through_unchanged() -> None:
    library = FakeOpenH264Library(decode_state=0, buffer_status=0)
    access_unit = b"\x00\x00\x00\x01\x67\x42\xc0\x1e"

    with OpenH264Decoder(library) as decoder:
        with pytest.raises(UnsupportedVideoChunkError, match="produced no picture"):
            decoder.decode(access_unit)

    # The adapter hands OpenH264 a pointer into the caller's bytes rather than a copy, so
    # the bytes the codec sees must still match what was passed in.
    assert library.decoded == [access_unit]


def test_decode_rejects_error_state() -> None:
    # 0x02 is an error bit outside the 0x01 frame-pending mask.
    library = FakeOpenH264Library(decode_state=0x02)
    with OpenH264Decoder(library) as decoder:
        with pytest.raises(UnsupportedVideoChunkError, match="failed to decode"):
            decoder.decode(b"\x00\x00\x00\x01")


def test_decode_rejects_missing_picture() -> None:
    library = FakeOpenH264Library(decode_state=0, buffer_status=0)
    with OpenH264Decoder(library) as decoder:
        with pytest.raises(UnsupportedVideoChunkError, match="produced no picture"):
            decoder.decode(b"\x00\x00\x00\x01")


def test_decode_rejects_unsupported_pixel_format() -> None:
    library = FakeOpenH264Library(decode_state=1, buffer_status=1, pixel_format=99)
    with OpenH264Decoder(library) as decoder:
        with pytest.raises(UnsupportedVideoChunkError, match="unsupported pixel format"):
            decoder.decode(b"\x00\x00\x00\x01")


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
