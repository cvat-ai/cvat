# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
from abc import ABCMeta, abstractmethod
from collections.abc import Callable
from io import BytesIO
from typing import Any, TypeAlias

from cvat.apps.engine.cache import DataWithMime
from cvat.apps.engine.media_extractors import IMediaReader, RandomAccessIterator
from cvat.apps.engine.mime_types import mimetypes

ReaderFactory: TypeAlias = Callable[[BytesIO], IMediaReader]


class ChunkLoader(metaclass=ABCMeta):
    def __init__(
        self,
        *,
        reader_factory: ReaderFactory,
    ) -> None:
        self.chunk_id: int | None = None
        self.chunk_reader: RandomAccessIterator | None = None
        self.reader_factory = reader_factory

    def load(self, chunk_id: int) -> RandomAccessIterator[tuple[Any, str]]:
        if self.chunk_id != chunk_id:
            self.unload()

            self.chunk_id = chunk_id
            self.chunk_reader = RandomAccessIterator(
                self.reader_factory(self.read_chunk(chunk_id)[0])
            )

        return self.chunk_reader

    def unload(self):
        self.chunk_id = None
        if self.chunk_reader:
            self.chunk_reader.close()
            self.chunk_reader = None

    @abstractmethod
    def read_chunk(self, chunk_id: int) -> DataWithMime: ...


class FileChunkLoader(ChunkLoader):
    def __init__(
        self,
        *,
        reader_factory: ReaderFactory,
        get_chunk_path_callback: Callable[[int], str],
    ) -> None:
        super().__init__(reader_factory=reader_factory)
        self.get_chunk_path = get_chunk_path_callback

    def read_chunk(self, chunk_id: int) -> DataWithMime:
        chunk_path = self.get_chunk_path(chunk_id)
        with open(chunk_path, "rb") as f:
            return (
                io.BytesIO(f.read()),
                mimetypes.guess_type(chunk_path)[0],
            )


class BufferChunkLoader(ChunkLoader):
    def __init__(
        self,
        *,
        reader_factory: ReaderFactory,
        get_chunk_callback: Callable[[int], DataWithMime],
    ) -> None:
        super().__init__(reader_factory=reader_factory)
        self.get_chunk = get_chunk_callback

    def read_chunk(self, chunk_id: int) -> DataWithMime:
        return self.get_chunk(chunk_id)
