# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import zipfile
from abc import ABC, abstractmethod
from collections.abc import Iterable, Iterator
from pathlib import Path
from typing import TYPE_CHECKING, TypeAlias, TypeVar

if TYPE_CHECKING:
    import cvat_mp4_h264

_T = TypeVar("_T")


class RandomAccessIterator(Iterator[_T]):
    def __init__(self, iterable: Iterable[_T]):
        self.iterable: Iterable[_T] = iterable
        self.iterator: Iterator[_T] | None = None
        self.pos: int = -1

    def __next__(self) -> _T:
        return self[self.pos + 1]

    def __getitem__(self, idx: int) -> _T:
        assert 0 <= idx
        if self.iterator is None or idx <= self.pos:
            self.reset()

        while True:
            # NOTE: don't keep the last item in self, it can be expensive
            v = next(self.iterator)
            self.pos += 1

            if self.pos == idx:
                return v

    def reset(self) -> None:
        self.close()
        self.iterator = iter(self.iterable)

    def close(self) -> None:
        if self.iterator is not None:
            if close := getattr(self.iterator, "close", None):
                close()
        self.iterator = None
        self.pos = -1


class IChunkReader(ABC):
    """
    Reads the frames of a task chunk, in the order they are stored in the chunk.
    """

    ImageFrame: TypeAlias = tuple[io.BytesIO, str]
    """
    The first element is the contents of the image.
    The second element is the name of the image file in the chunk.
    """

    VideoFrame: TypeAlias = "tuple[cvat_mp4_h264.VideoFrame, None]"

    def __init__(self, chunk_path: Path) -> None:
        self._chunk_path = chunk_path

    @abstractmethod
    def __iter__(self) -> Iterator[ImageFrame] | Iterator[VideoFrame]: ...


class ZipChunkReader(IChunkReader):
    def __init__(self, chunk_path: Path) -> None:
        super().__init__(chunk_path)
        self._zip_source = zipfile.ZipFile(self._chunk_path, "r")

    def __del__(self):
        self._zip_source.close()

    def __iter__(self) -> Iterator[IChunkReader.ImageFrame]:
        for name in self._zip_source.namelist():
            yield (io.BytesIO(self._zip_source.read(name)), name)


class VideoMp4ChunkReader(IChunkReader):
    def __iter__(self) -> Iterator[IChunkReader.VideoFrame]:
        try:
            import cvat_mp4_h264
        except ImportError as e:
            raise ImportError(
                "Reading video chunks requires the video extra: pip install 'cvat-sdk[video]'"
            ) from e

        for frame in cvat_mp4_h264.VideoMp4ChunkReader(self._chunk_path):
            yield (frame, None)
