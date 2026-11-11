# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import contextlib
import importlib
import zipfile
from abc import ABC, abstractmethod
from collections.abc import Iterable, Iterator
from pathlib import Path
from typing import TypeVar

import PIL.Image

from cvat_sdk.core.exceptions import ChunkReaderUnavailableException

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

    def __init__(self, chunk_path: Path) -> None:
        self.ensure_available()
        self._chunk_path = chunk_path

    @classmethod
    def ensure_available(cls) -> None:
        """
        Raises an exception if chunks cannot be read with this reader in the current environment,
        for example, because an optional dependency is not installed.
        """

    @abstractmethod
    def __iter__(self) -> Iterator[PIL.Image.Image]: ...


class ZipChunkReader(IChunkReader):
    def __init__(self, chunk_path: Path) -> None:
        super().__init__(chunk_path)
        self._zip_source = zipfile.ZipFile(self._chunk_path, "r")
        self._members = self._zip_source.infolist()

    def __getitem__(self, index: int) -> PIL.Image.Image:
        with self._zip_source.open(self._members[index]) as member:
            image = PIL.Image.open(member)
            image.load()
        return image

    def __iter__(self) -> Iterator[PIL.Image.Image]:
        for index in range(len(self._members)):
            yield self[index]

    def close(self) -> None:
        self._zip_source.close()


class VideoMp4ChunkReader(IChunkReader):
    @classmethod
    def ensure_available(cls) -> None:
        try:
            importlib.import_module("cvat_mp4_h264")
        except ImportError as e:
            raise ChunkReaderUnavailableException(
                "Reading video chunks requires the video extra: pip install 'cvat-sdk[video]'"
            ) from e

    def __iter__(self) -> Iterator[PIL.Image.Image]:
        import cvat_mp4_h264

        reader = cvat_mp4_h264.VideoMp4ChunkReader(self._chunk_path)
        with contextlib.closing(iter(reader)) as frames:
            for frame in frames:
                yield frame.to_image()
