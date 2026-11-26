# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Generator
from typing import BinaryIO

from cvat_sdk.datasets._video_chunks.mp4_demuxer import utils


class Mp4ChunkDemuxer:
    """
    Split a CVAT MP4 chunk into H.264 access units for the decoder.

    Only the MP4 chunks CVAT writes are supported. CVAT writes every video chunk with
    FFmpeg's MP4 muxer from libopenh264 constrained-baseline output, so all chunks share
    one layout, and only sizes and counts vary:

        ftyp | free | mdat | moov
        moov
          trak                              exactly one
            mdia / minf / stbl
              stsd                          one avc1 entry: avcC (+ btrt)
              stco, stsc, stsz              where each frame lies in mdat
              stts, stss                    not read
            edts                            not read
        a frame is H.264 NAL units, each prefixed by its 4-byte length

    The i-th sample must be the i-th frame of the chunk. The server passes the frames to
    the encoder in frame order, and the demuxer accepts only constrained-baseline H.264,
    which has no B-frames, so the encoder cannot reorder them. The samples are therefore
    stored in frame order and are yielded as stored.

    The sample table is parsed on construction, so an unsupported or broken chunk is
    rejected before any decoding starts. The caller owns ``file``; the demuxer never
    closes it. Iterating reads the access units lazily, starting from the first frame
    every time.
    """

    def __init__(self, file: BinaryIO) -> None:
        self._file = file
        self._sample_table = utils.read_sample_table(file=file)

    def __iter__(self) -> Generator[bytes, None, None]:
        """Yield the frames as Annex-B access units, the first one led by the SPS and PPS."""

        parameter_sets = self._sample_table.parameter_sets

        for sample in self._sample_table.samples:
            sample_data = utils.read_at(file=self._file, offset=sample.offset, size=sample.size)
            yield parameter_sets + utils.to_annex_b(sample=sample_data)
            parameter_sets = b""
