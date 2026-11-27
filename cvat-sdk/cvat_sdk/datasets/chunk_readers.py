# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import functools
import inspect
import zipfile
import zlib
from abc import ABC, abstractmethod
from collections.abc import Callable, Generator
from pathlib import Path
from typing import TypeVar

import PIL.Image


class ChunkReaderUnavailableError(Exception):
    """Indicates that task chunks of some type cannot be read in the current environment"""


class ChunkAccessModeNotSupportedError(Exception):
    """Indicates that a chunk reader does not support the requested access mode"""


class ChunkReadError(Exception):
    """Indicates that the contents of a chunk could not be read"""


_MethodT = TypeVar("_MethodT", bound=Callable)


def wrap_read_errors(*exception_types: type[Exception]) -> Callable[[_MethodT], _MethodT]:
    """
    Makes a chunk reader method raise ChunkReadError in place of the given exceptions.

    Works with both regular methods and generator methods.
    """

    def decorator(method: _MethodT) -> _MethodT:
        if inspect.isgeneratorfunction(method):

            @functools.wraps(method)
            def wrapper(*args, **kwargs):
                try:
                    yield from method(*args, **kwargs)
                except exception_types as e:
                    raise ChunkReadError(str(e)) from e

        else:

            @functools.wraps(method)
            def wrapper(*args, **kwargs):
                try:
                    return method(*args, **kwargs)
                except exception_types as e:
                    raise ChunkReadError(str(e)) from e

        return wrapper

    return decorator


class IChunkReader(ABC):
    """
    Reads the frames of a task chunk, in the order they are stored in the chunk.
    """

    def __init__(self, chunk_path: Path) -> None:
        self._chunk_path = chunk_path

    @classmethod
    def ensure_available(cls) -> None:
        """
        Raises ChunkReaderUnavailableError if chunks cannot be read with this reader
        in the current environment, for example, because a required library is missing.
        """

    @abstractmethod
    def __iter__(self) -> Generator[PIL.Image.Image, None, None]:
        """
        Yields all frames of the chunk sequentially.

        Raises ChunkAccessModeNotSupportedError if the reader doesn't support
        sequential reading (yet), and ChunkReadError if the chunk cannot be read.
        """

    @abstractmethod
    def __getitem__(self, index: int) -> PIL.Image.Image:
        """
        Returns the frame at the given position in the chunk.

        Raises ChunkAccessModeNotSupportedError if the reader doesn't support
        random access (yet), and ChunkReadError if the chunk cannot be read.
        """


class ZipChunkReader(IChunkReader):
    _READ_ERRORS = (zipfile.BadZipFile, zlib.error, OSError)

    @wrap_read_errors(*_READ_ERRORS)
    def __getitem__(self, index: int) -> PIL.Image.Image:
        with zipfile.ZipFile(self._chunk_path) as chunk_zip:
            with chunk_zip.open(chunk_zip.infolist()[index]) as member:
                image = PIL.Image.open(member)
                image.load()
        return image

    @wrap_read_errors(*_READ_ERRORS)
    def __iter__(self) -> Generator[PIL.Image.Image, None, None]:
        with zipfile.ZipFile(self._chunk_path) as chunk_zip:
            for member_info in chunk_zip.infolist():
                with chunk_zip.open(member_info) as member:
                    image = PIL.Image.open(member)
                    image.load()
                yield image


class VideoMp4ChunkReader(IChunkReader):
    @classmethod
    def ensure_available(cls) -> None:
        # The check that the OpenH264 library can be loaded will be added in a follow-up PR.
        pass

    def __getitem__(self, index: int) -> PIL.Image.Image:
        raise ChunkAccessModeNotSupportedError("Random access is not supported for video chunks")

    def __iter__(self) -> Generator[PIL.Image.Image, None, None]:
        # Decoding will be added in a follow-up PR.
        raise NotImplementedError
