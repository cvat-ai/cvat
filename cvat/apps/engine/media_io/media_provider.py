# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from abc import ABCMeta, abstractmethod
from dataclasses import dataclass
from io import BytesIO
from typing import Generic, TypeVar

from cvat.apps.engine import models

_T = TypeVar("_T")


@dataclass
class DataWithMeta(Generic[_T]):
    data: _T
    mime: str


class IMediaProvider(metaclass=ABCMeta):
    def unload(self):
        pass

    @abstractmethod
    def get_preview_image(self, *, allow_empty: bool = False) -> DataWithMeta[BytesIO]: ...


class PreviewNotAvailable(Exception):
    """
    Raised by get_preview_image() when there is no media-derived preview for
    an entity (e.g. point cloud task, audio task without a cover image) and the
    caller has opted in via ``allow_empty``.
    """


def segment_has_media_derived_preview(db_segment: models.Segment) -> bool:
    media_type = db_segment.task.media_type
    if media_type == models.MediaType.POINT_CLOUD:
        return False
    if media_type == models.MediaType.AUDIO:
        return db_segment.task.data.audio.has_cover_image
    return True
