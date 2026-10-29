# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
from abc import ABCMeta, abstractmethod
from collections.abc import Callable
from pathlib import Path
from typing import TypeAlias

from cvat_sdk.core.media_extractors import IChunkReader, RandomAccessIterator

ChunkReaderFactory: TypeAlias = Callable[[Path], IChunkReader]
ChunkFrame: TypeAlias = "IChunkReader.ImageFrame | IChunkReader.VideoFrame"


class ChunkLoader(metaclass=ABCMeta):
    def __init__(
        self,
        *,
        reader_factory: ChunkReaderFactory,
    ) -> None:
        self.chunk_id: int | None = None
        self.chunk_reader: RandomAccessIterator[ChunkFrame] | None = None
        self.reader_factory = reader_factory
        self._reader_pid: int | None = None

    def load(self, chunk_id: int) -> RandomAccessIterator[ChunkFrame]:
        # NOTE @sosov: if a chunk was loaded before fork() (e.g. a sample was read before
        # a PyTorch DataLoader started its workers), the child process inherits the open reader.
        # Its file position is shared with the parent, so concurrent reads would corrupt
        # each other. A forked process must therefore open its own reader.
        if self.chunk_id != chunk_id or self._reader_pid != os.getpid():
            self.unload()

            self.chunk_reader = RandomAccessIterator(self.reader_factory(self.read_chunk(chunk_id)))
            self.chunk_id = chunk_id
            self._reader_pid = os.getpid()

        return self.chunk_reader

    def unload(self) -> None:
        self.chunk_id = None
        self._reader_pid = None
        if self.chunk_reader is not None:
            self.chunk_reader.close()
            self.chunk_reader = None

    @abstractmethod
    def read_chunk(self, chunk_id: int) -> Path: ...


class FileChunkLoader(ChunkLoader):
    def __init__(
        self,
        *,
        reader_factory: ChunkReaderFactory,
        get_chunk_path_callback: Callable[[int], Path],
    ) -> None:
        super().__init__(reader_factory=reader_factory)
        self.get_chunk_path = get_chunk_path_callback

    def read_chunk(self, chunk_id: int) -> Path:
        return self.get_chunk_path(chunk_id)
