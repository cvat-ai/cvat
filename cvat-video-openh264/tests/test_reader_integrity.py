# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path

import PIL.Image
import pytest

import cvat_video_openh264.reader as reader

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
