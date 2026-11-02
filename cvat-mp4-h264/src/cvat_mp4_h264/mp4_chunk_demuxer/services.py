# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Iterator
from typing import BinaryIO

from . import utils


class Mp4ChunkDemuxer:
    """
    Split a CVAT MP4 chunk into H.264 access units for the decoder.

    The sample table is parsed on construction, so an unsupported or broken chunk is
    rejected before any decoding starts. The caller owns ``file``; the demuxer never
    closes it. Iterating reads the access units lazily, starting from the first frame
    every time.
    """

    def __init__(self, file: BinaryIO) -> None:
        self._file = file

        mdat, moov = utils.locate_top_level_boxes(file=file)
        moov_payload = utils.read_at(file=file, offset=moov.offset, size=moov.size)
        self._sample_table = utils.parse_moov(moov=memoryview(moov_payload), mdat=mdat)

    def __len__(self) -> int:
        """Return the frame count from the sample table, without reading frames."""

        return len(self._sample_table.samples)

    def __iter__(self) -> Iterator[bytes]:
        """
        Yield the frames as Annex-B access units, the first one led by the SPS and PPS.

        Only the MP4 chunks CVAT writes are supported. CVAT writes every video chunk with
        FFmpeg's MP4 muxer from libopenh264 constrained-baseline output, so all chunks share
        one layout, and only sizes and counts vary:

            ftyp | free | mdat | moov           every box size is 32-bit
            moov
              trak                              exactly one
                mdia / minf / stbl
                  stsd                          one avc1 entry: avcC (+ btrt)
                  stco, stsc, stsz              where each frame lies in mdat
                  stts, stss                    not read
                edts                            not read
            a frame is H.264 NAL units, each prefixed by its 4-byte length

        Constrained-baseline H.264 has no B-frames, so decode order is display order and
        neither the composition offsets (ctts) nor the edit list (edts) are needed.
        """

        parameter_sets = self._sample_table.parameter_sets

        for sample in self._sample_table.samples:
            sample_data = utils.read_at(file=self._file, offset=sample.offset, size=sample.size)
            yield parameter_sets + utils.to_annex_b(sample=sample_data)
            parameter_sets = b""
