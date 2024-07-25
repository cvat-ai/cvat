# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import math
import os
from dataclasses import dataclass
from enum import Enum, auto
from io import BytesIO
from typing import Any, Callable, Generic, Iterable, Iterator, Optional, Tuple, TypeVar, Union

import av
import cv2
import numpy as np
from PIL import Image
from rest_framework.exceptions import ValidationError

from cvat.apps.engine import models
from cvat.apps.engine.cache import DataWithMime, MediaCache, prepare_preview_image
from cvat.apps.engine.media_extractors import FrameQuality, IMediaReader, VideoReader, ZipReader
from cvat.apps.engine.mime_types import mimetypes

_T = TypeVar("_T")


class _RandomAccessIterator(Iterator[_T]):
    def __init__(self, iterable: Iterable[_T]):
        self.iterable: Iterable[_T] = iterable
        self.iterator: Optional[Iterator[_T]] = None
        self.pos: int = -1

    def __iter__(self):
        return self

    def __next__(self):
        return self[self.pos + 1]

    def __getitem__(self, idx: int) -> Optional[_T]:
        assert 0 <= idx
        if self.iterator is None or idx <= self.pos:
            self.reset()
        v = None
        while self.pos < idx:
            # NOTE: don't keep the last item in self, it can be expensive
            v = next(self.iterator)
            self.pos += 1
        return v

    def reset(self):
        self.close()
        self.iterator = iter(self.iterable)

    def close(self):
        if self.iterator is not None:
            if close := getattr(self.iterator, "close", None):
                close()
        self.iterator = None
        self.pos = -1


class _ChunkLoader:
    def __init__(
        self, reader_class: IMediaReader, path_getter: Callable[[int], DataWithMime]
    ) -> None:
        self.chunk_id: Optional[int] = None
        self.chunk_reader: Optional[_RandomAccessIterator] = None
        self.reader_class = reader_class
        self.get_chunk_path = path_getter

    def load(self, chunk_id: int) -> _RandomAccessIterator[Tuple[Any, str, int]]:
        if self.chunk_id != chunk_id:
            self.unload()

            self.chunk_id = chunk_id
            self.chunk_reader = _RandomAccessIterator(
                self.reader_class([self.get_chunk_path(chunk_id)])
            )
        return self.chunk_reader

    def unload(self):
        self.chunk_id = None
        if self.chunk_reader:
            self.chunk_reader.close()
            self.chunk_reader = None


class FrameOutputType(Enum):
    BUFFER = auto()
    PIL = auto()
    NUMPY_ARRAY = auto()


Frame2d = Union[BytesIO, np.ndarray, Image.Image]
Frame3d = BytesIO
AnyFrame = Union[Frame2d, Frame3d]


@dataclass
class DataWithMeta(Generic[_T]):
    data: _T
    mime: str
    checksum: int


class _FrameProvider:
    VIDEO_FRAME_EXT = ".PNG"
    VIDEO_FRAME_MIME = "image/png"

    def unload(self):
        pass

    @classmethod
    def _av_frame_to_png_bytes(cls, av_frame: av.VideoFrame) -> BytesIO:
        ext = cls.VIDEO_FRAME_EXT
        image = av_frame.to_ndarray(format="bgr24")
        success, result = cv2.imencode(ext, image)
        if not success:
            raise RuntimeError("Failed to encode image to '%s' format" % (ext))
        return BytesIO(result.tobytes())

    def _convert_frame(
        self, frame: Any, reader_class: IMediaReader, out_type: FrameOutputType
    ) -> AnyFrame:
        if out_type == FrameOutputType.BUFFER:
            return self._av_frame_to_png_bytes(frame) if reader_class is VideoReader else frame
        elif out_type == FrameOutputType.PIL:
            return frame.to_image() if reader_class is VideoReader else Image.open(frame)
        elif out_type == FrameOutputType.NUMPY_ARRAY:
            if reader_class is VideoReader:
                image = frame.to_ndarray(format="bgr24")
            else:
                image = np.array(Image.open(frame))
                if len(image.shape) == 3 and image.shape[2] in {3, 4}:
                    image[:, :, :3] = image[:, :, 2::-1]  # RGB to BGR
            return image
        else:
            raise RuntimeError("unsupported output type")


class TaskFrameProvider(_FrameProvider):
    def __init__(self, db_task: models.Task) -> None:
        self._db_task = db_task

    def _validate_frame_number(self, frame_number: int) -> int:
        if not (0 <= frame_number < self._db_task.data.size):
            raise ValidationError(f"Incorrect requested frame number: {frame_number}")

        return frame_number

    def get_preview(self) -> DataWithMeta[BytesIO]:
        return self._get_segment_frame_provider(self._db_task.data.start_frame).get_preview()

    def get_chunk(
        self, chunk_number: int, *, quality: FrameQuality = FrameQuality.ORIGINAL
    ) -> DataWithMeta[BytesIO]:
        # TODO: return a joined chunk. Find a solution for segment boundary video chunks
        return self._get_segment_frame_provider(frame_number).get_frame(
            frame_number, quality=quality, out_type=out_type
        )

    def get_frame(
        self,
        frame_number: int,
        *,
        quality: FrameQuality = FrameQuality.ORIGINAL,
        out_type: FrameOutputType = FrameOutputType.BUFFER,
    ) -> AnyFrame:
        return self._get_segment_frame_provider(frame_number).get_frame(
            frame_number, quality=quality, out_type=out_type
        )

    def iterate_frames(
        self,
        *,
        start_frame: Optional[int] = None,
        stop_frame: Optional[int] = None,
        quality: FrameQuality = FrameQuality.ORIGINAL,
        out_type: FrameOutputType = FrameOutputType.BUFFER,
    ) -> Iterator[AnyFrame]:
        # TODO: optimize segment access
        for idx in range(start_frame, (stop_frame + 1) if stop_frame else None):
            yield self.get_frame(idx, quality=quality, out_type=out_type)

    def _get_segment(self, validated_frame_number: int) -> models.Segment:
        return next(
            s
            for s in self._db_task.segments.all()
            if s.type == models.SegmentType.RANGE
            if validated_frame_number in s.frame_set
        )

    def _get_segment_frame_provider(self, frame_number: int) -> _SegmentFrameProvider:
        segment = self._get_segment(self._validate_frame_number(frame_number))
        return _SegmentFrameProvider(
            next(job for job in segment.jobs.all() if job.type == models.JobType.ANNOTATION)
        )


class _SegmentFrameProvider(_FrameProvider):
    def __init__(self, db_segment: models.Segment) -> None:
        super().__init__()
        self._db_segment = db_segment

        db_data = db_segment.task.data

        reader_class: dict[models.DataChoice, IMediaReader] = {
            models.DataChoice.IMAGESET: ZipReader,
            models.DataChoice.VIDEO: VideoReader,
        }

        self._loaders: dict[FrameQuality, _ChunkLoader] = {}
        if db_data.storage_method == models.StorageMethodChoice.CACHE:
            cache = MediaCache()

            self._loaders[FrameQuality.COMPRESSED] = _ChunkLoader(
                reader_class[db_data.compressed_chunk_type],
                lambda chunk_idx: cache.get_segment_chunk(
                    db_segment, chunk_idx, quality=FrameQuality.COMPRESSED
                ),
            )

            self._loaders[FrameQuality.ORIGINAL] = _ChunkLoader(
                reader_class[db_data.original_chunk_type],
                lambda chunk_idx: cache.get_segment_chunk(
                    db_segment, chunk_idx, quality=FrameQuality.ORIGINAL
                ),
            )
        else:
            self._loaders[FrameQuality.COMPRESSED] = _ChunkLoader(
                reader_class[db_data.compressed_chunk_type], db_data.get_compressed_chunk_path
            )

            self._loaders[FrameQuality.ORIGINAL] = _ChunkLoader(
                reader_class[db_data.original_chunk_type], db_data.get_original_chunk_path
            )

    def unload(self):
        for loader in self._loaders.values():
            loader.unload()

    def __len__(self):
        return self._db_segment.frame_count

    def _validate_frame_number(self, frame_number: int) -> Tuple[int, int, int]:
        # TODO: check for masked range segment

        if frame_number not in self._db_segment.frame_set:
            raise ValidationError(f"Incorrect requested frame number: {frame_number}")

        chunk_number, frame_position = divmod(frame_number, self._db_segment.task.data.chunk_size)
        return frame_number, chunk_number, frame_position

    def get_chunk_number(self, frame_number: int) -> int:
        return int(frame_number) // self._db_segment.task.data.chunk_size

    def _validate_chunk_number(self, chunk_number: int) -> int:
        segment_size = len(self._db_segment.frame_count)
        if chunk_number < 0 or chunk_number >= math.ceil(
            segment_size / self._db_segment.task.data.chunk_size
        ):
            raise ValidationError("requested chunk does not exist")

        return chunk_number

    def get_preview(self) -> DataWithMeta[BytesIO]:
        if self._db_segment.task.dimension == models.DimensionType.DIM_3D:
            # TODO
            preview = Image.open(os.path.join(os.path.dirname(__file__), "assets/3d_preview.jpeg"))
        else:
            preview, _ = self.get_frame(
                min(self._db_segment.frame_set),
                frame_number=FrameQuality.COMPRESSED,
                out_type=FrameOutputType.PIL,
            )

        return prepare_preview_image(preview)

    def get_chunk(
        self, chunk_number: int, *, quality: FrameQuality = FrameQuality.ORIGINAL
    ) -> DataWithMeta[BytesIO]:
        return self._loaders[quality].get_chunk_path(self._validate_chunk_number(chunk_number))

    def get_frame(
        self,
        frame_number: int,
        *,
        quality: FrameQuality = FrameQuality.ORIGINAL,
        out_type: FrameOutputType = FrameOutputType.BUFFER,
    ) -> AnyFrame:
        _, chunk_number, frame_offset = self._validate_frame_number(frame_number)
        loader = self._loaders[quality]
        chunk_reader = loader.load(chunk_number)
        frame, frame_name, _ = chunk_reader[frame_offset]

        frame = self._convert_frame(frame, loader.reader_class, out_type)
        if loader.reader_class is VideoReader:
            return (frame, self.VIDEO_FRAME_MIME)
        return (frame, mimetypes.guess_type(frame_name)[0])

    def iterate_frames(
        self,
        *,
        start_frame: Optional[int] = None,
        stop_frame: Optional[int] = None,
        quality: FrameQuality = FrameQuality.ORIGINAL,
        out_type: FrameOutputType = FrameOutputType.BUFFER,
    ) -> Iterator[AnyFrame]:
        for idx in range(start_frame, (stop_frame + 1) if stop_frame else None):
            yield self.get_frame(idx, quality=quality, out_type=out_type)


class JobFrameProvider(_SegmentFrameProvider):
    def __init__(self, db_job: models.Job) -> None:
        super().__init__(db_job.segment)
