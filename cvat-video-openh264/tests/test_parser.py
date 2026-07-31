# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import struct
from pathlib import Path

import PIL.Image
import pytest

import cvat_video_openh264._reader as reader
from cvat_video_openh264 import DecoderInfo, UnsupportedVideoChunkError

from tests._mp4_fixtures import make_avc_configuration, make_cvat_chunk


def test_valid_cvat_chunk_yields_one_annex_b_access_unit(tmp_path: Path) -> None:
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(make_cvat_chunk())

    track = reader._read_video_track(chunk_path)
    access_units = list(reader._iter_access_units(chunk_path, track))

    assert len(track.samples) == 1
    assert len(access_units) == 1
    assert access_units[0].count(reader._ANNEX_B_START_CODE) == 3
    assert access_units[0].endswith(b"\x65\x88\x84")


def test_invalid_box_size_is_rejected() -> None:
    invalid_box = struct.pack(">I4s", 64, b"free")

    with pytest.raises(UnsupportedVideoChunkError, match="invalid 'free' box"):
        list(reader._iter_boxes(io.BytesIO(invalid_box), 0, len(invalid_box)))


def test_sample_offset_arithmetic_is_checked() -> None:
    with pytest.raises(UnsupportedVideoChunkError, match="outside the MP4 chunk"):
        reader._build_samples(
            sample_sizes=(8,),
            chunk_offsets=(13,),
            sample_to_chunk=((1, 1, 1),),
            file_size=20,
        )


def test_sample_count_limit_is_enforced_before_allocation() -> None:
    payload = bytes(4) + struct.pack(">II", 1, reader._MAX_SAMPLE_COUNT + 1)
    box = reader._Box(type=b"stsz", offset=0, payload_offset=0, end_offset=len(payload))

    with pytest.raises(UnsupportedVideoChunkError, match="Unsupported MP4 sample count"):
        reader._parse_sample_sizes(io.BytesIO(payload), box)


def test_sample_size_limit_is_enforced() -> None:
    payload = bytes(4) + struct.pack(">II", reader._MAX_SAMPLE_SIZE + 1, 1)
    box = reader._Box(type=b"stsz", offset=0, payload_offset=0, end_offset=len(payload))

    with pytest.raises(UnsupportedVideoChunkError, match="invalid AVC sample size"):
        reader._parse_sample_sizes(io.BytesIO(payload), box)


def test_non_constrained_baseline_profile_is_rejected() -> None:
    with pytest.raises(UnsupportedVideoChunkError, match="constrained-baseline"):
        reader._parse_avcc(make_avc_configuration(profile=77))


def test_decoded_frame_count_mismatch_is_reported(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(make_cvat_chunk())
    decoder_closed = False

    class FakeDecoder:
        def __init__(self, decoder_info: DecoderInfo) -> None:
            assert decoder_info.library_path == "fake-openh264"

        def decode(self, access_unit: bytes) -> PIL.Image.Image | None:
            assert access_unit.startswith(reader._ANNEX_B_START_CODE)
            return None

        def close(self) -> None:
            nonlocal decoder_closed
            decoder_closed = True

    monkeypatch.setattr(
        reader,
        "resolve_decoder",
        lambda **_: DecoderInfo(library_path="fake-openh264", version=None),
    )
    monkeypatch.setattr(reader, "_OpenH264Decoder", FakeDecoder)

    with pytest.raises(
        UnsupportedVideoChunkError,
        match="Decoded 0 frames from 1 AVC samples",
    ):
        list(reader.iter_frames(chunk_path))

    assert decoder_closed
