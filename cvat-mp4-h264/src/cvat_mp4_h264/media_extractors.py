# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

from .mp4_chunk_demuxer.services import Mp4ChunkDemuxer
from .openh264.schemas import VideoFrame
from .openh264.services import OpenH264Decoder, load_library

__all__ = ["VideoMp4ChunkReader"]


class VideoMp4ChunkReader:
    """Decode a CVAT video chunk (MP4/H.264) into frames."""

    def __init__(self, path: os.PathLike[str] | str) -> None:
        self._path = Path(path)
        self._library_info = load_library()

    def __len__(self) -> int:
        """Return the frame count from the MP4 sample tables, without decoding."""

        with self._path.open("rb") as file:
            return len(Mp4ChunkDemuxer(file))

    def __iter__(self) -> Iterator[VideoFrame]:
        with self._path.open("rb") as file:
            demuxer = Mp4ChunkDemuxer(file)

            with OpenH264Decoder(self._library_info.library) as native_decoder:
                for access_unit in demuxer:
                    yield native_decoder.decode(access_unit)
