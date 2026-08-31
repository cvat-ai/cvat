# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path

import PIL.Image
import pytest

import cvat_video_openh264.reader as reader
from cvat_video_openh264 import UnsupportedVideoChunkError

from tests.fixtures.mp4_factory import make_cvat_chunk
from tests.helpers import install_fake_decoder


def test_frame_count_mismatch_is_reported(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(make_cvat_chunk())
    install_fake_decoder(monkeypatch, decode_result=PIL.Image.new("RGB", (16, 16)))
    # Force the access-unit stream to yield nothing so the decoded count disagrees with
    # the single AVC sample the parser found for the chunk.
    monkeypatch.setattr(reader, "iter_access_units_from_stream", lambda _file, _track: iter(()))

    with pytest.raises(
        UnsupportedVideoChunkError,
        match="Decoded 0 frames from 1 AVC samples",
    ):
        list(reader.iter_frames(chunk_path))


def test_early_close_skips_frame_count_check(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(make_cvat_chunk())
    frame = PIL.Image.new("RGB", (16, 16))
    state = install_fake_decoder(monkeypatch, decode_result=frame)
    # Two access units but one AVC sample: exhausting would trip the count check, so an
    # early close must release resources without raising it.
    monkeypatch.setattr(
        reader,
        "iter_access_units_from_stream",
        lambda _file, _track: iter((b"au1", b"au2")),
    )

    frames = reader.iter_frames(chunk_path)
    assert next(frames) is frame
    frames.close()

    assert state["closed"]
