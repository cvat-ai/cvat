# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Deterministic synthetic MP4 fixtures for parser-boundary tests."""

import struct


def _box(box_type: bytes, payload: bytes) -> bytes:
    return struct.pack(">I4s", len(payload) + 8, box_type) + payload


def _u32(value: int) -> bytes:
    return struct.pack(">I", value)


def make_avc_configuration(*, profile: int = 66) -> bytes:
    """Build the minimal AVC configuration consumed by the package parser."""

    sequence_parameter_set = b"\x67\x42\xc0\x1e\xda\x02\x80\x2d\xd2"
    picture_parameter_set = b"\x68\xce\x3c\x80"
    return b"".join(
        [
            bytes((1, profile, 0x40, 30, 0xFF, 0xE1)),
            struct.pack(">H", len(sequence_parameter_set)),
            sequence_parameter_set,
            b"\x01",
            struct.pack(">H", len(picture_parameter_set)),
            picture_parameter_set,
        ]
    )


def make_cvat_chunk(*, profile: int = 66) -> bytes:
    """Build a one-sample CVAT-style MP4 parser fixture (constrained baseline by default)."""

    nal_unit = b"\x65\x88\x84"
    sample = _u32(len(nal_unit)) + nal_unit
    media_data = _box(b"mdat", sample)

    avc_configuration = _box(b"avcC", make_avc_configuration(profile=profile))
    visual_sample_entry = bytearray(78)
    struct.pack_into(">HH", visual_sample_entry, 24, 16, 16)
    avc_sample_entry = _box(b"avc1", bytes(visual_sample_entry) + avc_configuration)
    sample_description = _box(b"stsd", bytes(4) + _u32(1) + avc_sample_entry)
    sample_sizes = _box(b"stsz", bytes(4) + _u32(0) + _u32(1) + _u32(len(sample)))
    sample_to_chunk = _box(
        b"stsc",
        bytes(4) + _u32(1) + _u32(1) + _u32(1) + _u32(1),
    )
    chunk_offsets = _box(b"stco", bytes(4) + _u32(1) + _u32(8))

    sample_table = _box(
        b"stbl",
        sample_description + sample_sizes + sample_to_chunk + chunk_offsets,
    )
    media_information = _box(b"minf", sample_table)
    handler = _box(b"hdlr", bytes(8) + b"vide")
    media = _box(b"mdia", handler + media_information)
    track = _box(b"trak", media)
    movie = _box(b"moov", track)
    return media_data + movie
