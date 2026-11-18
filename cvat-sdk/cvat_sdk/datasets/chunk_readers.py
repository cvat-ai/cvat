# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import contextlib
import importlib
import zipfile
from abc import ABC, abstractmethod
from collections.abc import Generator
from pathlib import Path

import PIL.Image

from cvat_sdk.core.exceptions import ChunkReaderUnavailableException


class IChunkReader(ABC):
    """
    Reads the frames of a task chunk, in the order they are stored in the chunk.
    """

    def __init__(self, chunk_path: Path) -> None:
        self._chunk_path = chunk_path

    @classmethod
    def ensure_available(cls) -> None:
        """
        Raises an exception if chunks cannot be read with this reader in the current environment,
        for example, because an optional dependency is not installed.
        """

    @abstractmethod
    def __iter__(self) -> Generator[PIL.Image.Image, None, None]: ...


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
        try:
            importlib.import_module("cvat_mp4_h264")
        except ImportError as e:
            raise ChunkReaderUnavailableException(
                "Reading video chunks requires the video extra: pip install 'cvat-sdk[video]'"
            ) from e

    def __iter__(self) -> Generator[PIL.Image.Image, None, None]:
        import cvat_mp4_h264

        reader = cvat_mp4_h264.VideoMp4ChunkReader(path=self._chunk_path)
        with contextlib.closing(iter(reader)) as frames:
            for frame in frames:
                yield frame.to_image()
