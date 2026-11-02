# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import os
from collections.abc import Iterable, Mapping
from typing import BinaryIO, TypeVar

from ..exceptions import UnsupportedVideoError
from .consts import (
    ANNEX_B_START_CODE,
    BOX_HEADER_SIZE,
    NAL_LENGTH_SIZE,
    VISUAL_SAMPLE_ENTRY_SIZE,
)
from .schemas import ByteRange, SampleTable

_T = TypeVar("_T")


def _box_name(box_type: bytes) -> str:
    return repr(box_type.decode("latin-1"))


def read_at(file: BinaryIO, offset: int, size: int) -> bytes:
    """Read exactly ``size`` bytes at ``offset`` or reject the truncated chunk."""

    file.seek(offset)
    data = file.read(size)
    if len(data) != size:
        raise UnsupportedVideoError("The MP4 chunk is truncated")

    return data


def _bytes_at(data: memoryview, offset: int, size: int) -> bytes:
    """Return ``size`` bytes of ``data`` at ``offset`` or reject the truncated box."""

    field = data[offset : offset + size]
    if len(field) != size:
        raise UnsupportedVideoError("The MP4 chunk has a truncated box")

    return bytes(field)


def _uint_at(data: memoryview, offset: int, size: int) -> int:
    """Return the big-endian unsigned integer of ``size`` bytes at ``offset``."""

    return int.from_bytes(_bytes_at(data=data, offset=offset, size=size), "big")


def _check_box_size(box_type: bytes, size: int, available: int) -> None:
    # CVAT chunks have only 32-bit box sizes, so the special sizes 0 (the box runs to the end
    # of the file) and 1 (a 64-bit size follows) are rejected along with the invalid ones.
    if not BOX_HEADER_SIZE <= size <= available:
        raise UnsupportedVideoError(
            f"The MP4 chunk has an invalid {_box_name(box_type=box_type)} box"
        )


def _add_box(boxes: dict[bytes, _T], box_type: bytes, box: _T) -> None:
    if box_type in boxes:
        raise UnsupportedVideoError(
            f"The MP4 chunk has more than one {_box_name(box_type=box_type)} box"
        )

    boxes[box_type] = box


def _get_box(boxes: Mapping[bytes, _T], box_type: bytes) -> _T:
    try:
        return boxes[box_type]
    except KeyError:
        raise UnsupportedVideoError(
            f"The MP4 chunk has no {_box_name(box_type=box_type)} box"
        ) from None


def _get_full_box(boxes: Mapping[bytes, memoryview], box_type: bytes) -> memoryview:
    """Return the payload of a full box after its version and flags."""

    payload = _get_box(boxes=boxes, box_type=box_type)
    version = _uint_at(data=payload, offset=0, size=1)
    if version != 0:
        raise UnsupportedVideoError(
            f"The MP4 chunk has an unsupported version {version} "
            f"of the {_box_name(box_type=box_type)} box"
        )

    return payload[4:]


def locate_top_level_boxes(file: BinaryIO) -> tuple[ByteRange, ByteRange]:
    """Return the payloads of the ``mdat`` and ``moov`` boxes, reading only box headers."""

    file_size = file.seek(0, os.SEEK_END)
    boxes: dict[bytes, ByteRange] = {}
    offset = 0

    while offset < file_size:
        header = read_at(file=file, offset=offset, size=BOX_HEADER_SIZE)
        size = int.from_bytes(header[0:4], "big")
        box_type = header[4:8]
        _check_box_size(box_type=box_type, size=size, available=file_size - offset)
        _add_box(
            boxes=boxes,
            box_type=box_type,
            box=ByteRange(offset=offset + BOX_HEADER_SIZE, size=size - BOX_HEADER_SIZE),
        )
        offset += size

    return _get_box(boxes=boxes, box_type=b"mdat"), _get_box(boxes=boxes, box_type=b"moov")


def _get_children_boxes(payload: memoryview) -> dict[bytes, memoryview]:
    """Return the payloads of the boxes inside ``payload`` by their type."""

    children: dict[bytes, memoryview] = {}
    offset = 0

    while offset < len(payload):
        # A header cut short by the end of the payload fails the size check below
        header = payload[offset : offset + BOX_HEADER_SIZE]
        size = int.from_bytes(header[0:4], "big")
        box_type = bytes(header[4:8])
        _check_box_size(box_type=box_type, size=size, available=len(payload) - offset)
        _add_box(
            boxes=children,
            box_type=box_type,
            box=payload[offset + BOX_HEADER_SIZE : offset + size],
        )
        offset += size

    return children


def _parse_avc_configuration(avcc: memoryview) -> bytes:
    """Validate the AVC decoder configuration and return its SPS and PPS in Annex-B form."""

    version = _uint_at(data=avcc, offset=0, size=1)
    profile = _uint_at(data=avcc, offset=1, size=1)
    constraint_flags = _uint_at(data=avcc, offset=2, size=1)
    nal_length_size = (_uint_at(data=avcc, offset=4, size=1) & 0x03) + 1
    if version != 1:
        raise UnsupportedVideoError("The MP4 chunk has an invalid AVC decoder configuration")
    if profile != 66 or not constraint_flags & 0x40:
        raise UnsupportedVideoError("Only constrained-baseline H.264 video chunks are supported")
    if nal_length_size != NAL_LENGTH_SIZE:
        raise UnsupportedVideoError("Only H.264 video chunks with 4-byte NAL lengths are supported")

    parameter_sets = bytearray()
    offset = 5

    # The SPS count shares its byte with reserved bits, the PPS count after the SPSs does not
    for count_mask in (0x1F, 0xFF):
        count = _uint_at(data=avcc, offset=offset, size=1) & count_mask
        offset += 1
        if not count:
            raise UnsupportedVideoError("The MP4 chunk has no H.264 SPS or PPS")

        for _ in range(count):
            size = _uint_at(data=avcc, offset=offset, size=2)
            parameter_set = _bytes_at(data=avcc, offset=offset + 2, size=size)
            parameter_sets += ANNEX_B_START_CODE + parameter_set
            offset += 2 + size

    return bytes(parameter_sets)


def _parse_sample_description(stsd: memoryview) -> bytes:
    """Return the SPS and PPS of the single ``avc1`` sample entry in Annex-B form."""

    entry_count = _uint_at(data=stsd, offset=0, size=4)
    entries = _get_children_boxes(payload=stsd[4:])
    if entry_count != 1 or entries.keys() != {b"avc1"}:
        raise UnsupportedVideoError("The MP4 chunk is not a single H.264 (avc1) video track")

    # The avc1 child boxes follow its fixed VisualSampleEntry fields
    avc1_children = _get_children_boxes(payload=entries[b"avc1"][VISUAL_SAMPLE_ENTRY_SIZE:])
    return _parse_avc_configuration(avcc=_get_box(boxes=avc1_children, box_type=b"avcC"))


def _parse_chunk_offsets(stco: memoryview) -> tuple[int, ...]:
    """Parse the ``stco`` table; ``co64`` is only needed for files over 4 GiB."""

    entry_count = _uint_at(data=stco, offset=0, size=4)
    return tuple(_uint_at(data=stco, offset=4 + 4 * index, size=4) for index in range(entry_count))


def _expand_samples_per_chunk(stsc: memoryview, chunk_count: int) -> list[int]:
    """Return the sample count of each MP4 chunk, which ``stsc`` stores run-length encoded."""

    entry_count = _uint_at(data=stsc, offset=0, size=4)
    # Each 12-byte entry: first_chunk (counted from 1), samples_per_chunk, description index
    entry_offsets = range(4, 4 + 12 * entry_count, 12)
    first_chunks = [_uint_at(data=stsc, offset=entry, size=4) for entry in entry_offsets]
    samples_per_chunk = [_uint_at(data=stsc, offset=entry + 4, size=4) for entry in entry_offsets]
    chunk_ranges = list(itertools.pairwise([*first_chunks, chunk_count + 1]))

    if (
        not chunk_ranges
        or chunk_ranges[0][0] != 1
        or any(start >= stop for start, stop in chunk_ranges)
    ):
        raise UnsupportedVideoError("The MP4 chunk has an invalid sample-to-chunk table")

    return [
        count
        for count, (start, stop) in zip(samples_per_chunk, chunk_ranges, strict=True)
        for _ in range(start, stop)
    ]


def _parse_sample_sizes(stsz: memoryview, sample_count: int) -> Iterable[int]:
    """
    Parse the ``stsz`` table, which must list ``sample_count`` samples.

    The compact ``stz2`` variant is not supported: FFmpeg's MP4 muxer never writes it.
    """

    common_size = _uint_at(data=stsz, offset=0, size=4)
    entry_count = _uint_at(data=stsz, offset=4, size=4)
    if entry_count != sample_count:
        raise UnsupportedVideoError("The MP4 chunk has inconsistent sample tables")

    if common_size:
        # FFmpeg writes a common size when all samples have it, e.g. in a 1-frame chunk
        return itertools.repeat(common_size, sample_count)

    return tuple(_uint_at(data=stsz, offset=8 + 4 * index, size=4) for index in range(sample_count))


def _build_samples(
    chunk_offsets: tuple[int, ...],
    samples_per_chunk: list[int],
    sample_sizes: Iterable[int],
    mdat: ByteRange,
) -> tuple[ByteRange, ...]:
    """Place the samples back to back from the start of their chunk, inside ``mdat``."""

    sizes = iter(sample_sizes)
    samples = []

    for offset, count in zip(chunk_offsets, samples_per_chunk, strict=True):
        for size in itertools.islice(sizes, count):
            sample = ByteRange(offset=offset, size=size)
            if sample.offset < mdat.offset or sample.end > mdat.end:
                raise UnsupportedVideoError("An MP4 sample points outside the media data")

            samples.append(sample)
            offset = sample.end

    return tuple(samples)


def parse_moov(moov: memoryview, mdat: ByteRange) -> SampleTable:
    """Read the sample table of the chunk's single H.264 track."""

    trak = _get_box(boxes=_get_children_boxes(payload=moov), box_type=b"trak")
    mdia = _get_box(boxes=_get_children_boxes(payload=trak), box_type=b"mdia")
    minf = _get_box(boxes=_get_children_boxes(payload=mdia), box_type=b"minf")
    stbl = _get_children_boxes(
        payload=_get_box(boxes=_get_children_boxes(payload=minf), box_type=b"stbl")
    )

    chunk_offsets = _parse_chunk_offsets(stco=_get_full_box(boxes=stbl, box_type=b"stco"))
    samples_per_chunk = _expand_samples_per_chunk(
        stsc=_get_full_box(boxes=stbl, box_type=b"stsc"), chunk_count=len(chunk_offsets)
    )
    sample_sizes = _parse_sample_sizes(
        stsz=_get_full_box(boxes=stbl, box_type=b"stsz"), sample_count=sum(samples_per_chunk)
    )
    samples = _build_samples(
        chunk_offsets=chunk_offsets,
        samples_per_chunk=samples_per_chunk,
        sample_sizes=sample_sizes,
        mdat=mdat,
    )
    if not samples:
        raise UnsupportedVideoError("The MP4 chunk has no frames")

    return SampleTable(
        parameter_sets=_parse_sample_description(stsd=_get_full_box(boxes=stbl, box_type=b"stsd")),
        samples=samples,
    )


def to_annex_b(sample: bytes) -> bytes:
    """Replace the 4-byte length in front of each NAL unit with an Annex-B start code."""

    access_unit = bytearray(sample)
    offset = 0

    while offset + NAL_LENGTH_SIZE <= len(access_unit):
        nal_size = int.from_bytes(access_unit[offset : offset + NAL_LENGTH_SIZE], "big")
        access_unit[offset : offset + NAL_LENGTH_SIZE] = ANNEX_B_START_CODE
        offset += NAL_LENGTH_SIZE + nal_size

    if offset != len(access_unit):
        raise UnsupportedVideoError("An H.264 sample has an invalid NAL length")

    return bytes(access_unit)
