# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

from .openh264.schemas import VideoFrame

__all__ = ["VideoMp4ChunkReader"]


class VideoMp4ChunkReader:
    """
    Decode a CVAT video chunk (MP4/H.264) into frames.

    The OpenH264 library is taken from ``library_path`` or, if it is not given, from the
    environment variable named by ``settings.OPENH264_LIBRARY_ENV_VAR``.
    """

    def __init__(
        self,
        path: os.PathLike[str] | str,
        *,
        library_path: os.PathLike[str] | str | None = None,
    ) -> None:
        self._path = Path(path)
        self._library_path = library_path

    def __len__(self) -> int:
        """Return the frame count from the MP4 sample tables, without decoding."""

        raise NotImplementedError

    def __iter__(self) -> Iterator[VideoFrame]:
        raise NotImplementedError
