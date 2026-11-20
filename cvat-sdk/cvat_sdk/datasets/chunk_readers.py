# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import zipfile
from abc import ABC, abstractmethod
from collections.abc import Generator
from pathlib import Path

import PIL.Image

from cvat_sdk.core.exceptions import ChunkAccessModeNotSupportedException


class IChunkReader(ABC):
    """
    Reads the frames of a task chunk, in the order they are stored in the chunk.
    """

    def __init__(self, chunk_path: Path) -> None:
        self._chunk_path = chunk_path

    @classmethod
    def ensure_available(cls) -> None:
        """
        Raises ChunkReaderUnavailableException if chunks cannot be read with this reader
        in the current environment, for example, because a required library is missing.
        """

    @abstractmethod
    def __iter__(self) -> Generator[PIL.Image.Image, None, None]:
        """
        Yields all frames of the chunk sequentially.

        Raises ChunkAccessModeNotSupportedException if the reader doesn't support
        sequential reading (yet).
        """

    @abstractmethod
    def __getitem__(self, index: int) -> PIL.Image.Image:
        """
        Returns the frame at the given position in the chunk.

        Raises ChunkAccessModeNotSupportedException if the reader doesn't support
        random access (yet).
        """


class ZipChunkReader(IChunkReader):
    def __getitem__(self, index: int) -> PIL.Image.Image:
        with zipfile.ZipFile(self._chunk_path) as chunk_zip:
            with chunk_zip.open(chunk_zip.infolist()[index]) as member:
                image = PIL.Image.open(member)
                image.load()
        return image

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
        raise ChunkAccessModeNotSupportedException(
            "Random access is not supported for video chunks"
        )

    def __iter__(self) -> Generator[PIL.Image.Image, None, None]:
        # Decoding will be added in a follow-up PR.
        raise NotImplementedError
