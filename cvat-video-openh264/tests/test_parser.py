# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import struct
from pathlib import Path

import PIL.Image
import pytest

import cvat_video_openh264.reader as reader
import cvat_video_openh264.utils.mp4 as mp4
from cvat_video_openh264 import UnsupportedVideoChunkError
from cvat_video_openh264.models import Box

from tests.fixtures.mp4_factory import make_cvat_chunk
from tests.helpers import install_fake_decoder


def test_valid_cvat_chunk_reaches_decoder_with_one_annex_b_access_unit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(make_cvat_chunk())
    frame = PIL.Image.new("RGB", (16, 16))
    captured: list[bytes] = []
    install_fake_decoder(monkeypatch, decode_result=frame, captured_units=captured)

    frames = list(reader.iter_frames(chunk_path))

    assert frames == [frame]
    assert len(captured) == 1
    assert captured[0].count(mp4.ANNEX_B_START_CODE) == 3
    assert captured[0].endswith(b"\x65\x88\x84")


def test_non_constrained_baseline_profile_is_rejected_via_public_api(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(make_cvat_chunk(profile=77))
    install_fake_decoder(monkeypatch)

    with pytest.raises(UnsupportedVideoChunkError, match="constrained-baseline"):
        list(reader.iter_frames(chunk_path))


def test_decoder_no_picture_is_reported(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(make_cvat_chunk())
    state = install_fake_decoder(monkeypatch, decode_result=None)

    with pytest.raises(
        UnsupportedVideoChunkError,
        match="OpenH264 produced no picture",
    ):
        list(reader.iter_frames(chunk_path))

    assert state["closed"]


# The following tests exercise parser guards whose triggering inputs cannot be
# expressed as valid CVAT chunk files without allocating megabytes of test data
# (sample-count / sample-size limits) or without touching top-level container
# framing that iter_frames rejects at an earlier layer. Testing the internal
# helpers directly keeps the boundary checks fast and unambiguous.


def test_invalid_box_size_is_rejected() -> None:
    invalid_box = struct.pack(">I4s", 64, b"free")

    with pytest.raises(UnsupportedVideoChunkError, match="invalid 'free' box"):
        list(mp4.iter_boxes(io.BytesIO(invalid_box), 0, len(invalid_box)))


def test_sample_offset_arithmetic_is_checked() -> None:
    with pytest.raises(UnsupportedVideoChunkError, match="outside the MP4 chunk"):
        mp4.build_samples(
            sample_sizes=(8,),
            chunk_offsets=(13,),
            sample_to_chunk=(mp4.SampleToChunkEntry(1, 1, 1),),
            file_size=20,
        )


def test_sample_count_limit_is_enforced_before_allocation() -> None:
    payload = bytes(4) + struct.pack(">II", 1, mp4.MAX_SAMPLE_COUNT + 1)
    box = Box(type=b"stsz", offset=0, payload_offset=0, end_offset=len(payload))

    with pytest.raises(UnsupportedVideoChunkError, match="Unsupported MP4 sample count"):
        mp4.parse_sample_sizes(io.BytesIO(payload), box)


def test_sample_size_limit_is_enforced() -> None:
    payload = bytes(4) + struct.pack(">II", mp4.MAX_SAMPLE_SIZE + 1, 1)
    box = Box(type=b"stsz", offset=0, payload_offset=0, end_offset=len(payload))

    with pytest.raises(UnsupportedVideoChunkError, match="invalid sample size"):
        mp4.parse_sample_sizes(io.BytesIO(payload), box)


def test_hdlr_non_zero_version_is_rejected(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(make_cvat_chunk(hdlr_version=1))
    install_fake_decoder(monkeypatch)

    with pytest.raises(UnsupportedVideoChunkError, match="handler-reference box version"):
        list(reader.iter_frames(chunk_path))


def test_sample_size_table_trailing_data_is_rejected() -> None:
    payload = (
        bytes(4)
        + struct.pack(">II", 0, 1)  # common_sample_size=0 -> table branch, sample_count=1
        + struct.pack(">I", 8)  # one 4-byte table entry
        + b"\x00"  # trailing byte that must be rejected
    )
    box = Box(type=b"stsz", offset=0, payload_offset=0, end_offset=len(payload))

    with pytest.raises(UnsupportedVideoChunkError, match="unexpected trailing data"):
        mp4.parse_sample_sizes(io.BytesIO(payload), box)
