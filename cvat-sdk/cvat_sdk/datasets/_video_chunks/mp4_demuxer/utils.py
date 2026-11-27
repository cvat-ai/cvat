# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import os
from typing import BinaryIO, TypeAlias

from cvat_sdk.datasets._video_chunks.exceptions import UnsupportedVideoError
from cvat_sdk.datasets._video_chunks.mp4_demuxer.consts import (
    ANNEX_B_START_CODE,
    BOX_HEADER_SIZE,
    LARGE_BOX_HEADER_SIZE,
    NAL_LENGTH_SIZE,
    VERSION_AND_FLAGS_SIZE,
)
from cvat_sdk.datasets._video_chunks.mp4_demuxer.schemas import (
    Box,
    BoxMapping,
    BoxType,
    ByteRange,
    SampleTable,
)

_BoxTree: TypeAlias = dict[BoxType, "_BoxTree"]

# The boxes of a CVAT chunk, nested as in the file. Only these boxes are read by the demuxer,
# the others are skipped.
_BOX_TREE: _BoxTree = {
    BoxType(b"mdat"): {},
    BoxType(b"moov"): {
        BoxType(b"trak"): {
            BoxType(b"mdia"): {
                BoxType(b"minf"): {
                    BoxType(b"stbl"): {
                        BoxType(b"stsd"): {BoxType(b"avc1"): {BoxType(b"avcC"): {}}},
                        BoxType(b"stsc"): {},
                        BoxType(b"stsz"): {},
                        BoxType(b"stco"): {},
                    },
                },
            },
        },
    },
}

# stsd and avc1 hold fixed fields before their child boxes
_CHILD_BOXES_OFFSET = {
    BoxType(b"stsd"): VERSION_AND_FLAGS_SIZE + 4,
    BoxType(b"avc1"): 78,  # video fields: width, height, resolution, compressor name, etc.
}


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


def _read_box_at(file: BinaryIO, offset: int, available: int) -> Box:
    if available < BOX_HEADER_SIZE:
        raise UnsupportedVideoError("The MP4 chunk has a truncated box")

    header = read_at(file=file, offset=offset, size=min(LARGE_BOX_HEADER_SIZE, available))
    box_type = BoxType(header[4:8])
    size = int.from_bytes(header[0:4], "big")
    header_size = BOX_HEADER_SIZE

    if size == 1:
        # A 64-bit size follows the type
        size = int.from_bytes(header[8:16], "big")
        header_size = LARGE_BOX_HEADER_SIZE
    elif size == 0:
        size = available

    if not header_size <= size <= available:
        raise UnsupportedVideoError(f"The MP4 chunk has an invalid {box_type} box")

    return Box(
        type=box_type,
        payload_range=ByteRange(offset=offset + header_size, size=size - header_size),
    )


def _find_boxes(file: BinaryIO, container: ByteRange, tree: _BoxTree, boxes: BoxMapping) -> None:
    """Add the boxes of ``tree`` found in ``container`` to ``boxes``, reading only box headers."""

    offset = container.offset

    while offset < container.end:
        box = _read_box_at(file=file, offset=offset, available=container.end - offset)
        offset = box.payload_range.end

        if box.type not in tree:
            continue

        boxes[box.type] = box

        children_tree = tree[box.type]
        if children_tree:
            children_offset = _CHILD_BOXES_OFFSET.get(box.type, 0)
            if box.payload_range.size < children_offset:
                raise UnsupportedVideoError("The MP4 chunk has a truncated box")

            _find_boxes(
                file=file,
                container=ByteRange(
                    offset=box.payload_range.offset + children_offset,
                    size=box.payload_range.size - children_offset,
                ),
                tree=children_tree,
                boxes=boxes,
            )


def _read_table(file: BinaryIO, table: ByteRange) -> memoryview:
    """Read a sample table box without its version and flags."""

    payload = read_at(file=file, offset=table.offset, size=table.size)
    return memoryview(payload)[VERSION_AND_FLAGS_SIZE:]


def _parse_avc_configuration(avcc: memoryview) -> bytes:
    """Validate the AVC decoder configuration and return its SPS and PPS in Annex-B form."""

    version = _uint_at(data=avcc, offset=0, size=1)
    profile = _uint_at(data=avcc, offset=1, size=1)
    constraint_flags = _uint_at(data=avcc, offset=2, size=1)
    nal_length_size = (_uint_at(data=avcc, offset=4, size=1) & 0x03) + 1
    if version != 1:
        raise UnsupportedVideoError("The MP4 chunk has an invalid AVC decoder configuration")
    # A CVAT chunk is always constrained-baseline H.264: profile 66 with constraint_set1_flag
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


def _parse_chunk_offsets(stco: memoryview) -> tuple[int, ...]:
    """Parse the ``stco`` table."""

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


def _parse_sample_sizes(stsz: memoryview, sample_count: int) -> tuple[int, ...]:
    """
    Parse the ``stsz`` table, which must list ``sample_count`` samples.

    The compact ``stz2`` variant is not supported: FFmpeg's MP4 muxer never writes it.
    """

    common_size = _uint_at(data=stsz, offset=0, size=4)
    entry_count = _uint_at(data=stsz, offset=4, size=4)
    if entry_count != sample_count:
        raise UnsupportedVideoError("The MP4 chunk has inconsistent sample tables")

    if common_size:
        return (common_size,) * sample_count

    return tuple(_uint_at(data=stsz, offset=8 + 4 * index, size=4) for index in range(sample_count))


def _build_samples(
    chunk_offsets: tuple[int, ...],
    samples_per_chunk: list[int],
    sample_sizes: tuple[int, ...],
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


def read_sample_table(file: BinaryIO) -> SampleTable:
    """Read the sample table of the chunk's single H.264 track."""

    boxes = BoxMapping()

    file_size = file.seek(0, os.SEEK_END)
    _find_boxes(
        file=file,
        container=ByteRange(offset=0, size=file_size),
        tree=_BOX_TREE,
        boxes=boxes,
    )

    mdat = boxes[BoxType(b"mdat")].payload_range
    chunk_offsets = _parse_chunk_offsets(
        stco=_read_table(file=file, table=boxes[BoxType(b"stco")].payload_range)
    )
    samples_per_chunk = _expand_samples_per_chunk(
        stsc=_read_table(file=file, table=boxes[BoxType(b"stsc")].payload_range),
        chunk_count=len(chunk_offsets),
    )
    sample_sizes = _parse_sample_sizes(
        stsz=_read_table(file=file, table=boxes[BoxType(b"stsz")].payload_range),
        sample_count=sum(samples_per_chunk),
    )
    samples = _build_samples(
        chunk_offsets=chunk_offsets,
        samples_per_chunk=samples_per_chunk,
        sample_sizes=sample_sizes,
        mdat=mdat,
    )
    if not samples:
        raise UnsupportedVideoError("The MP4 chunk has no frames")

    avcc = boxes[BoxType(b"avcC")].payload_range
    return SampleTable(
        parameter_sets=_parse_avc_configuration(
            avcc=memoryview(read_at(file=file, offset=avcc.offset, size=avcc.size))
        ),
        samples=samples,
    )


def to_annex_b(sample: bytes) -> bytes:
    """Replace the 4-byte length in front of each NAL unit with an Annex-B start code."""

    access_unit = bytearray(sample)
    offset = 0

    while offset + NAL_LENGTH_SIZE <= len(access_unit):
        nal_size = int.from_bytes(access_unit[offset : offset + NAL_LENGTH_SIZE], "big")
        access_unit[offset : offset + NAL_LENGTH_SIZE] = ANNEX_B_START_CODE
        offset += len(ANNEX_B_START_CODE) + nal_size

    if offset != len(access_unit):
        raise UnsupportedVideoError("An H.264 sample has an invalid NAL length")

    return bytes(access_unit)
