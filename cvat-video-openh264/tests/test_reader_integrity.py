# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path

import PIL.Image
import pytest

import cvat_video_openh264.reader as reader
from cvat_video_openh264 import DecoderInfo

from tests.fixtures.mp4_factory import make_cvat_chunk
from tests.helpers import install_fake_decoder


def test_early_close_releases_decoder(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(make_cvat_chunk())
    frame = PIL.Image.new("RGB", (16, 16))
    state = install_fake_decoder(monkeypatch, decode_result=frame)
    monkeypatch.setattr(
        reader,
        "iter_access_units_from_stream",
        lambda _file, _track: iter((b"au1", b"au2")),
    )

    frames = reader.iter_frames(chunk_path)
    assert next(frames) is frame
    frames.close()

    assert state["closed"]


def test_a_supplied_decoder_info_is_reused_without_reloading_the_library(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(make_cvat_chunk())
    frame = PIL.Image.new("RGB", (16, 16))
    library = object()
    decoder_info = DecoderInfo(library_path="fake-openh264", version=(1, 6, 0), library=library)
    decoded_with: list[object] = []

    class FakeDecoder:
        def __init__(self, library: object) -> None:
            decoded_with.append(library)

        def __enter__(self) -> "FakeDecoder":
            return self

        def __exit__(self, *_exception_info: object) -> None:
            pass

        def decode(self, _access_unit: bytes) -> PIL.Image.Image:
            return frame

    def fail(*_args: object, **_kwargs: object) -> None:
        raise AssertionError("A supplied decoder must not trigger library resolution")

    monkeypatch.setattr(reader, "OpenH264Decoder", FakeDecoder)
    monkeypatch.setattr(reader, "resolve_decoder_info", fail)

    for _ in range(2):
        assert list(reader.iter_frames(chunk_path, decoder=decoder_info)) == [frame]

    assert decoded_with == [library, library]
