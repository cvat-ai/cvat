# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
from collections.abc import Callable
from pathlib import Path
from typing import TypeAlias

import PIL.Image

from cvat_sdk.core.media_extractors import (
    IChunkReader,
    RandomAccessIterator,
    VideoMp4ChunkReader,
    ZipChunkReader,
)

ChunkReaderFactory: TypeAlias = Callable[[Path], IChunkReader]
LoadedChunkReader: TypeAlias = ZipChunkReader | RandomAccessIterator[PIL.Image.Image]


class ChunkLoader:
    def __init__(
        self,
        *,
        reader_factory: ChunkReaderFactory,
    ) -> None:
        self.chunk_path: Path | None = None
        self.chunk_reader: LoadedChunkReader | None = None
        self.reader_factory = reader_factory
        self._reader_pid: int | None = None

    def load(self, chunk_path: Path) -> LoadedChunkReader:
        # NOTE: if a chunk was loaded before fork() (e.g. a sample was read before
        # a PyTorch DataLoader started its workers), the child process inherits the open reader.
        # Its file position is shared with the parent, so concurrent reads would corrupt
        # each other. A forked process must therefore open its own reader.
        if self.chunk_path != chunk_path or self._reader_pid != os.getpid():
            self.unload()

            reader = self.reader_factory(chunk_path)
            if isinstance(reader, VideoMp4ChunkReader):
                reader = RandomAccessIterator(reader)

            self.chunk_reader = reader
            self.chunk_path = chunk_path
            self._reader_pid = os.getpid()

        return self.chunk_reader

    def unload(self) -> None:
        self.chunk_path = None
        self._reader_pid = None
        if self.chunk_reader is not None:
            self.chunk_reader.close()
            self.chunk_reader = None
