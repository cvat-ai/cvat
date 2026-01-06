# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import itertools
import math
from abc import ABCMeta, abstractmethod
from bisect import bisect
from collections import OrderedDict
from collections.abc import Callable, Iterator, Sequence
from dataclasses import dataclass
from enum import Enum, auto
from io import BytesIO
from typing import Any, Generic, TypeAlias, TypeVar, overload

import av
import cv2
import numpy as np
from django.db.models import prefetch_related_objects
from PIL import Image
from rest_framework.exceptions import ValidationError

from cvat.apps.engine import models
from cvat.apps.engine.cache import Callback, DataWithMime, MediaCache, prepare_chunk
from cvat.apps.engine.media_extractors import (
    IMediaReader,
    RandomAccessIterator,
    VideoReader,
    ZipReader,
)
from cvat.apps.engine.mime_types import mimetypes
from cvat.apps.engine.utils import take_by

_T = TypeVar("_T")


class _ChunkLoader(metaclass=ABCMeta):
    def __init__(
        self,
        reader_class: type[IMediaReader],
        *,
        reader_params: dict | None = None,
    ) -> None:
        self.chunk_id: int | None = None
        self.chunk_reader: RandomAccessIterator | None = None
        self.reader_class = reader_class
        self.reader_params = reader_params

    def load(self, chunk_id: int) -> RandomAccessIterator[tuple[Any, str, int]]:
        if self.chunk_id != chunk_id:
            self.unload()

            self.chunk_id = chunk_id
            self.chunk_reader = RandomAccessIterator(
                self.reader_class(
                    [self.read_chunk(chunk_id)[0]],
                    **(self.reader_params or {}),
                )
            )
        return self.chunk_reader

    def unload(self):
        self.chunk_id = None
        if self.chunk_reader:
            self.chunk_reader.close()
            self.chunk_reader = None

    @abstractmethod
    def read_chunk(self, chunk_id: int) -> DataWithMime: ...


class _FileChunkLoader(_ChunkLoader):
    def __init__(
        self,
        reader_class: type[IMediaReader],
        get_chunk_path_callback: Callable[[int], str],
        *,
        reader_params: dict | None = None,
    ) -> None:
        super().__init__(reader_class, reader_params=reader_params)
        self.get_chunk_path = get_chunk_path_callback

    def read_chunk(self, chunk_id: int) -> DataWithMime:
        chunk_path = self.get_chunk_path(chunk_id)
        with open(chunk_path, "rb") as f:
            return (
                io.BytesIO(f.read()),
                mimetypes.guess_type(chunk_path)[0],
            )


class _BufferChunkLoader(_ChunkLoader):
    def __init__(
        self,
        reader_class: type[IMediaReader],
        get_chunk_callback: Callable[[int], DataWithMime],
        *,
        reader_params: dict | None = None,
    ) -> None:
        super().__init__(reader_class, reader_params=reader_params)
        self.get_chunk = get_chunk_callback

    def read_chunk(self, chunk_id: int) -> DataWithMime:
        return self.get_chunk(chunk_id)


class FrameOutputType(Enum):
    BUFFER = auto()
    PIL = auto()
    NUMPY_ARRAY = auto()


Frame2d: TypeAlias = BytesIO | np.ndarray | Image.Image
Frame3d: TypeAlias = BytesIO
AnyFrame: TypeAlias = Frame2d | Frame3d


@dataclass
class DataWithMeta(Generic[_T]):
    data: _T
    mime: str


class IFrameProvider(metaclass=ABCMeta):
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
            raise RuntimeError(f"Failed to encode image to '{ext}' format")
        return BytesIO(result.tobytes())

    def _convert_frame(
        self, frame: Any, reader_class: type[IMediaReader], out_type: FrameOutputType
    ) -> AnyFrame:
        if out_type == FrameOutputType.BUFFER:
            return (
                self._av_frame_to_png_bytes(frame)
                if issubclass(reader_class, VideoReader)
                else frame
            )
        elif out_type == FrameOutputType.PIL:
            return frame.to_image() if issubclass(reader_class, VideoReader) else Image.open(frame)
        elif out_type == FrameOutputType.NUMPY_ARRAY:
            if issubclass(reader_class, VideoReader):
                image = frame.to_ndarray(format="bgr24")
            else:
                image = np.array(Image.open(frame))
                if len(image.shape) == 3 and image.shape[2] in {3, 4}:
                    image[:, :, :3] = image[:, :, 2::-1]  # RGB to BGR
            return image
        else:
            raise RuntimeError("unsupported output type")

    @abstractmethod
    def validate_frame_number(self, frame_number: int) -> int: ...

    @abstractmethod
    def validate_chunk_number(self, chunk_number: int) -> int: ...

    @abstractmethod
    def get_chunk_number(self, frame_number: int) -> int: ...

    @abstractmethod
    def get_preview(self) -> DataWithMeta[BytesIO]: ...

    @abstractmethod
    def get_chunk(
        self, chunk_number: int, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL
    ) -> DataWithMeta[BytesIO]: ...

    @abstractmethod
    def get_frame(
        self,
        frame_number: int,
        *,
        quality: models.FrameQuality = models.FrameQuality.ORIGINAL,
        out_type: FrameOutputType = FrameOutputType.BUFFER,
    ) -> DataWithMeta[AnyFrame]: ...

    @abstractmethod
    def get_frame_context_images_chunk(
        self,
        frame_number: int,
    ) -> DataWithMeta[BytesIO] | None: ...

    @abstractmethod
    def iterate_frames(
        self,
        *,
        start_frame: int | None = None,
        stop_frame: int | None = None,
        quality: models.FrameQuality = models.FrameQuality.ORIGINAL,
        out_type: FrameOutputType = FrameOutputType.BUFFER,
    ) -> Iterator[DataWithMeta[AnyFrame]]: ...

    def _get_abs_frame_number(self, db_data: models.Data, rel_frame_number: int) -> int:
        return db_data.start_frame + rel_frame_number * db_data.get_frame_step()

    def _get_rel_frame_number(self, db_data: models.Data, abs_frame_number: int) -> int:
        return (abs_frame_number - db_data.start_frame) // db_data.get_frame_step()


class TaskFrameProvider(IFrameProvider):
    def __init__(self, db_task: models.Task) -> None:
        self._db_task = db_task
        self._segment_frame_provider_cache = {}

    def validate_frame_number(self, frame_number: int) -> int:
        if frame_number not in range(0, self._db_task.data.size):
            raise ValidationError(
                f"Invalid frame '{frame_number}'. "
                f"The frame number should be in the [0, {self._db_task.data.size}] range"
            )

        return frame_number

    def validate_chunk_number(self, chunk_number: int) -> int:
        last_chunk = math.ceil(self._db_task.data.size / self._db_task.data.chunk_size) - 1
        if not 0 <= chunk_number <= last_chunk:
            raise ValidationError(
                f"Invalid chunk number '{chunk_number}'. "
                f"The chunk number should be in the [0, {last_chunk}] range"
            )

        return chunk_number

    def get_chunk_number(self, frame_number: int) -> int:
        return int(frame_number) // self._db_task.data.chunk_size

    def get_abs_frame_number(self, rel_frame_number: int) -> int:
        "Returns absolute frame number in the task (in the range [start, stop, step])"
        return super()._get_abs_frame_number(self._db_task.data, rel_frame_number)

    def get_rel_frame_number(self, abs_frame_number: int) -> int:
        """
        Returns relative frame number in the task (in the range [0, task_size - 1]).
        This is the "normal" frame number, expected in other methods.
        """
        return super()._get_rel_frame_number(self._db_task.data, abs_frame_number)

    def get_preview(self) -> DataWithMeta[BytesIO]:
        return self._get_segment_frame_provider(0).get_preview()

    def get_chunk(
        self, chunk_number: int, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL
    ) -> DataWithMeta[BytesIO]:
        return_type = DataWithMeta[BytesIO]
        chunk_number = self.validate_chunk_number(chunk_number)

        cache = MediaCache()
        cached_chunk = cache.get_task_chunk(self._db_task, chunk_number, quality=quality)
        if cached_chunk:
            return return_type(cached_chunk[0], cached_chunk[1])

        db_data = self._db_task.data
        step = db_data.get_frame_step()
        task_chunk_start_frame = chunk_number * db_data.chunk_size
        task_chunk_stop_frame = (chunk_number + 1) * db_data.chunk_size - 1
        task_chunk_frame_set = set(
            range(
                db_data.start_frame + task_chunk_start_frame * step,
                min(db_data.start_frame + task_chunk_stop_frame * step, db_data.stop_frame) + step,
                step,
            )
        )

        matching_segments: list[models.Segment] = sorted(
            [
                s
                for s in self._db_task.segment_set.all()
                if not task_chunk_frame_set.isdisjoint(s.frame_set)
            ],
            key=lambda s: (
                s.type != models.SegmentType.RANGE,  # prioritize RANGE segments,
                s.start_frame,
            ),
        )
        assert matching_segments

        # Don't put this into set_callback to avoid data duplication in the cache

        if len(matching_segments) == 1:
            segment_frame_provider = SegmentFrameProvider(matching_segments[0])
            matching_chunk_index = segment_frame_provider.find_matching_chunk(
                sorted(task_chunk_frame_set)
            )
            if matching_chunk_index is not None:
                # The requested frames match one of the job chunks, we can use it directly
                return segment_frame_provider.get_chunk(matching_chunk_index, quality=quality)

        buffer, mime_type = cache.get_or_set_task_chunk(
            self._db_task,
            chunk_number,
            quality=quality,
            set_callback=Callback(
                callable=self._get_chunk_create_callback,
                args=[
                    self._db_task,
                    matching_segments,
                    {f: self.get_rel_frame_number(f) for f in task_chunk_frame_set},
                    quality,
                ],
            ),
        )

        return return_type(data=buffer, mime=mime_type)

    @staticmethod
    def _get_chunk_create_callback(
        db_task: models.Task | int,
        matching_segments: list[models.Segment],
        task_chunk_frames_with_rel_numbers: dict[int, int],
        quality: models.FrameQuality,
    ) -> DataWithMime:
        # Create and return a joined / cleaned chunk
        task_chunk_frames = OrderedDict()
        for db_segment in matching_segments:
            if isinstance(db_segment, int):
                db_segment = models.Segment.objects.get(pk=db_segment)
            segment_frame_provider = SegmentFrameProvider(db_segment)
            segment_frame_set = db_segment.frame_set

            for task_chunk_frame_id in sorted(task_chunk_frames_with_rel_numbers.keys()):
                if (
                    task_chunk_frame_id not in segment_frame_set
                    or task_chunk_frame_id in task_chunk_frames
                ):
                    continue

                frame, frame_name, _ = segment_frame_provider._get_raw_frame(
                    task_chunk_frames_with_rel_numbers[task_chunk_frame_id], quality=quality
                )
                task_chunk_frames[task_chunk_frame_id] = (frame, frame_name, None)

        if isinstance(db_task, int):
            db_task = models.Task.objects.get(pk=db_task)

        return prepare_chunk(
            task_chunk_frames.values(),
            quality=quality,
            db_task=db_task,
            dump_unchanged=True,
        )

    def get_frame(
        self,
        frame_number: int,
        *,
        quality: models.FrameQuality = models.FrameQuality.ORIGINAL,
        out_type: FrameOutputType = FrameOutputType.BUFFER,
    ) -> DataWithMeta[AnyFrame]:
        return self._get_segment_frame_provider(frame_number).get_frame(
            frame_number, quality=quality, out_type=out_type
        )

    def get_frame_context_images_chunk(
        self,
        frame_number: int,
    ) -> DataWithMeta[BytesIO] | None:
        return self._get_segment_frame_provider(frame_number).get_frame_context_images_chunk(
            frame_number
        )

    def iterate_frames(
        self,
        *,
        start_frame: int | None = None,
        stop_frame: int | None = None,
        quality: models.FrameQuality = models.FrameQuality.ORIGINAL,
        out_type: FrameOutputType = FrameOutputType.BUFFER,
    ) -> Iterator[DataWithMeta[AnyFrame]]:
        frame_range = itertools.count(start_frame)
        if stop_frame:
            frame_range = itertools.takewhile(lambda x: x <= stop_frame, frame_range)

        db_segment = None
        db_segment_frame_set = None
        db_segment_frame_provider = None
        for idx in frame_range:
            if (
                db_segment
                and self._get_abs_frame_number(self._db_task.data, idx) not in db_segment_frame_set
            ):
                db_segment = None
                db_segment_frame_set = None
                db_segment_frame_provider = None

            if not db_segment:
                db_segment = self._get_segment(idx)
                db_segment_frame_set = set(db_segment.frame_set)
                db_segment_frame_provider = SegmentFrameProvider(db_segment)

            yield db_segment_frame_provider.get_frame(idx, quality=quality, out_type=out_type)

    def _get_segment(self, validated_frame_number: int) -> models.Segment:
        if not self._db_task.data or not self._db_task.data.size:
            raise ValidationError("Task has no data")

        abs_frame_number = self.get_abs_frame_number(validated_frame_number)

        # Task's prefetch cache doesn't get populated after the following
        # call to task.segment_set.all() and the result traversal, resulting in extra requests.
        # Prefetch segments explicitly to fix this.
        prefetch_related_objects([self._db_task], "segment_set")

        segment = next(
            (
                s
                for s in sorted(
                    self._db_task.segment_set.all(),
                    key=lambda s: s.type != models.SegmentType.RANGE,  # prioritize RANGE segments
                )
                if abs_frame_number in s.frame_set
            ),
            None,
        )
        if segment is None:
            raise AssertionError(
                f"Can't find a segment with frame {validated_frame_number} "
                f"in task {self._db_task.id}"
            )

        return segment

    def unload(self):
        self._clear_segment_frame_provider_cache()

    def _clear_segment_frame_provider_cache(self):
        self._segment_frame_provider_cache.clear()

    def _get_segment_frame_provider(self, frame_number: int) -> SegmentFrameProvider:
        segment = self._get_segment(self.validate_frame_number(frame_number))

        provider = self._segment_frame_provider_cache.get(segment.id)
        if not provider:
            # A simple last result cache for iteration use cases (e.g. dataset export).
            # Avoid storing many providers in memory, each holds open chunks
            self._clear_segment_frame_provider_cache()
            provider = SegmentFrameProvider(segment)
            self._segment_frame_provider_cache[segment.id] = provider

        return provider

    def invalidate_chunks(self, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL):
        cache = MediaCache()

        number_of_chunks = math.ceil(self._db_task.data.size / self._db_task.data.chunk_size)
        for chunk_number in range(number_of_chunks):
            cache.remove_task_chunk(self._db_task, chunk_number, quality=quality)

        for segment in self._db_task.segment_set.all():
            segment_frame_provider = SegmentFrameProvider(segment)
            segment_frame_provider.invalidate_chunks(quality=quality)


class SegmentFrameProvider(IFrameProvider):
    def __init__(self, db_segment: models.Segment) -> None:
        super().__init__()
        self._db_segment = db_segment

        db_data = db_segment.task.data

        reader_class: dict[models.DataChoice, tuple[type[IMediaReader], dict | None]] = {
            models.DataChoice.IMAGESET: (ZipReader, None),
            models.DataChoice.VIDEO: (
                VideoReader,
                {
                    "allow_threading": False
                    # disable threading to avoid unpredictable server
                    # resource consumption during reading in endpoints
                    # can be enabled for other clients
                },
            ),
        }

        if (
            db_data.storage_method
            == models.StorageMethodChoice.CACHE
            # TODO: separate handling, extract cache creation logic from media cache
        ):
            cache = MediaCache()

            def make_loader(quality: models.FrameQuality) -> _ChunkLoader:
                chunk_type = db_data.get_chunk_type(quality)
                return _BufferChunkLoader(
                    reader_class=reader_class[chunk_type][0],
                    reader_params=reader_class[chunk_type][1],
                    get_chunk_callback=lambda chunk_idx: cache.get_or_set_segment_chunk(
                        db_segment, chunk_idx, quality=quality
                    ),
                )

        else:

            def make_loader(quality: models.FrameQuality) -> _ChunkLoader:
                chunk_type = db_data.get_chunk_type(quality)
                return _FileChunkLoader(
                    reader_class=reader_class[chunk_type][0],
                    reader_params=reader_class[chunk_type][1],
                    get_chunk_path_callback=lambda chunk_idx: db_data.get_static_segment_chunk_path(
                        chunk_idx, segment_id=db_segment.id, quality=quality
                    ),
                )

        self._loaders = {quality: make_loader(quality) for quality in models.FrameQuality}

    def unload(self):
        for loader in self._loaders.values():
            loader.unload()

    def __len__(self):
        return self._db_segment.frame_count

    def get_frame_index(self, frame_number: int) -> int | None:
        segment_frames = sorted(self._db_segment.frame_set)
        abs_frame_number = self._get_abs_frame_number(self._db_segment.task.data, frame_number)
        frame_index = bisect(segment_frames, abs_frame_number) - 1
        if not (
            0 <= frame_index < len(segment_frames)
            and segment_frames[frame_index] == abs_frame_number
        ):
            return None

        return frame_index

    def validate_frame_number(self, frame_number: int) -> tuple[int, int, int]:
        frame_index = self.get_frame_index(frame_number)
        if frame_index is None:
            raise ValidationError(f"Incorrect requested frame number: {frame_number}")

        chunk_number, frame_position = divmod(frame_index, self._db_segment.task.data.chunk_size)
        return frame_number, chunk_number, frame_position

    def get_chunk_number(self, frame_number: int) -> int:
        return self.get_frame_index(frame_number) // self._db_segment.task.data.chunk_size

    def find_matching_chunk(self, frames: Sequence[int]) -> int | None:
        return next(
            (
                i
                for i, chunk_frames in enumerate(
                    take_by(
                        sorted(self._db_segment.frame_set), self._db_segment.task.data.chunk_size
                    )
                )
                if frames == set(chunk_frames)
            ),
            None,
        )

    def validate_chunk_number(self, chunk_number: int) -> int:
        segment_size = self._db_segment.frame_count
        last_chunk = math.ceil(segment_size / self._db_segment.task.data.chunk_size) - 1
        if not 0 <= chunk_number <= last_chunk:
            raise ValidationError(
                f"Invalid chunk number '{chunk_number}'. "
                f"The chunk number should be in the [0, {last_chunk}] range"
            )

        return chunk_number

    def get_preview(self) -> DataWithMeta[BytesIO]:
        cache = MediaCache()
        preview, mime = cache.get_or_set_segment_preview(self._db_segment)
        return DataWithMeta[BytesIO](preview, mime=mime)

    def get_chunk(
        self, chunk_number: int, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL
    ) -> DataWithMeta[BytesIO]:
        chunk_number = self.validate_chunk_number(chunk_number)
        chunk_data, mime = self._loaders[quality].read_chunk(chunk_number)
        return DataWithMeta[BytesIO](chunk_data, mime=mime)

    def invalidate_chunks(self, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL):
        cache = MediaCache()
        cache.remove_segment_preview(self._db_segment)
        number_of_chunks = math.ceil(
            self._db_segment.frame_count / self._db_segment.task.data.chunk_size
        )
        cache.remove_segments_chunks(
            [
                {"db_segment": self._db_segment, "chunk_number": chunk_id, "quality": quality}
                for chunk_id in range(number_of_chunks)
            ]
        )

    def _get_raw_frame(
        self,
        frame_number: int,
        *,
        quality: models.FrameQuality = models.FrameQuality.ORIGINAL,
    ) -> tuple[Any, str, type[IMediaReader]]:
        _, chunk_number, frame_offset = self.validate_frame_number(frame_number)
        loader = self._loaders[quality]
        chunk_reader = loader.load(chunk_number)
        frame, frame_name, _ = chunk_reader[frame_offset]
        return frame, frame_name, loader.reader_class

    def get_frame(
        self,
        frame_number: int,
        *,
        quality: models.FrameQuality = models.FrameQuality.ORIGINAL,
        out_type: FrameOutputType = FrameOutputType.BUFFER,
    ) -> DataWithMeta[AnyFrame]:
        return_type = DataWithMeta[AnyFrame]

        frame, frame_name, reader_class = self._get_raw_frame(frame_number, quality=quality)

        frame = self._convert_frame(frame, reader_class, out_type)
        if issubclass(reader_class, VideoReader):
            return return_type(frame, mime=self.VIDEO_FRAME_MIME)

        return return_type(frame, mime=mimetypes.guess_type(frame_name)[0])

    def get_frame_context_images_chunk(
        self,
        frame_number: int,
    ) -> DataWithMeta[BytesIO] | None:
        self.validate_frame_number(frame_number)

        db_data = self._db_segment.task.data

        cache = MediaCache()
        if db_data.storage_method == models.StorageMethodChoice.CACHE:
            data, mime = cache.get_or_set_frame_context_images_chunk(db_data, frame_number)
        else:
            data, mime = cache.prepare_context_images_chunk(db_data, frame_number)

        if not data.getvalue():
            return None

        return DataWithMeta[BytesIO](data, mime=mime)

    def iterate_frames(
        self,
        *,
        start_frame: int | None = None,
        stop_frame: int | None = None,
        quality: models.FrameQuality = models.FrameQuality.ORIGINAL,
        out_type: FrameOutputType = FrameOutputType.BUFFER,
    ) -> Iterator[DataWithMeta[AnyFrame]]:
        frame_range = itertools.count(start_frame)
        if stop_frame:
            frame_range = itertools.takewhile(lambda x: x <= stop_frame, frame_range)

        segment_frame_set = set(self._db_segment.frame_set)
        for idx in frame_range:
            if self._get_abs_frame_number(self._db_segment.task.data, idx) in segment_frame_set:
                yield self.get_frame(idx, quality=quality, out_type=out_type)


class JobFrameProvider(SegmentFrameProvider):
    def __init__(self, db_job: models.Job) -> None:
        super().__init__(db_job.segment)

    def get_chunk(
        self,
        chunk_number: int,
        *,
        quality: models.FrameQuality = models.FrameQuality.ORIGINAL,
        is_task_chunk: bool = False,
    ) -> DataWithMeta[BytesIO]:
        if not is_task_chunk:
            return super().get_chunk(chunk_number, quality=quality)

        # Backward compatibility for the "number" parameter
        # Reproduce the task chunks, limited by this job
        return_type = DataWithMeta[BytesIO]

        task_frame_provider = TaskFrameProvider(self._db_segment.task)
        segment_start_chunk = task_frame_provider.get_chunk_number(self._db_segment.start_frame)
        segment_stop_chunk = task_frame_provider.get_chunk_number(self._db_segment.stop_frame)
        if not segment_start_chunk <= chunk_number <= segment_stop_chunk:
            raise ValidationError(
                f"Invalid chunk number '{chunk_number}'. "
                "The chunk number should be in the "
                f"[{segment_start_chunk}, {segment_stop_chunk}] range"
            )

        cache = MediaCache()
        cached_chunk = cache.get_segment_task_chunk(self._db_segment, chunk_number, quality=quality)
        if cached_chunk:
            return return_type(cached_chunk[0], cached_chunk[1])

        db_data = self._db_segment.task.data
        step = db_data.get_frame_step()
        task_chunk_start_frame = chunk_number * db_data.chunk_size
        task_chunk_stop_frame = (chunk_number + 1) * db_data.chunk_size - 1
        task_chunk_frame_set = set(
            range(
                db_data.start_frame + task_chunk_start_frame * step,
                min(db_data.start_frame + task_chunk_stop_frame * step, db_data.stop_frame) + step,
                step,
            )
        )

        # Don't put this into set_callback to avoid data duplication in the cache
        matching_chunk = self.find_matching_chunk(sorted(task_chunk_frame_set))
        if matching_chunk is not None:
            return self.get_chunk(matching_chunk, quality=quality)

        segment_chunk_frame_ids = sorted(
            task_chunk_frame_set.intersection(self._db_segment.frame_set)
        )

        buffer, mime_type = cache.get_or_set_segment_task_chunk(
            self._db_segment,
            chunk_number,
            quality=quality,
            set_callback=Callback(
                callable=self._get_chunk_create_callback,
                args=[
                    self._db_segment,
                    segment_chunk_frame_ids,
                    chunk_number,
                    quality,
                ],
            ),
        )

        return return_type(data=buffer, mime=mime_type)

    @staticmethod
    def _get_chunk_create_callback(
        db_segment: models.Segment | int,
        segment_chunk_frame_ids: list[int],
        chunk_number: int,
        quality: models.FrameQuality,
    ) -> DataWithMime:
        # Create and return a joined / cleaned chunk
        if isinstance(db_segment, int):
            db_segment = models.Segment.objects.get(pk=db_segment)

        if db_segment.type == models.SegmentType.RANGE:
            return MediaCache.prepare_custom_range_segment_chunk(
                db_task=db_segment.task,
                frame_ids=segment_chunk_frame_ids,
                quality=quality,
            )
        elif db_segment.type == models.SegmentType.SPECIFIC_FRAMES:
            return MediaCache.prepare_custom_masked_range_segment_chunk(
                db_task=db_segment.task,
                frame_ids=segment_chunk_frame_ids,
                chunk_number=chunk_number,
                quality=quality,
                insert_placeholders=True,
            )
        else:
            assert False


@overload
def make_frame_provider(data_source: models.Job) -> JobFrameProvider: ...


@overload
def make_frame_provider(data_source: models.Segment) -> SegmentFrameProvider: ...


@overload
def make_frame_provider(data_source: models.Task) -> TaskFrameProvider: ...


def make_frame_provider(
    data_source: models.Job | models.Segment | models.Task | Any,
) -> IFrameProvider:
    if isinstance(data_source, models.Task):
        frame_provider = TaskFrameProvider(data_source)
    elif isinstance(data_source, models.Segment):
        frame_provider = SegmentFrameProvider(data_source)
    elif isinstance(data_source, models.Job):
        frame_provider = JobFrameProvider(data_source)
    else:
        raise TypeError(f"Unexpected data source type {type(data_source)}")

    return frame_provider
