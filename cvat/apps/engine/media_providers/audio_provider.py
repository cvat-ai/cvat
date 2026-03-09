# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import math
from abc import ABCMeta, abstractmethod
from bisect import bisect
from collections import OrderedDict
from collections.abc import Sequence
from dataclasses import dataclass
from io import BytesIO
from typing import Generic, TypeVar

from django.db.models import prefetch_related_objects
from rest_framework.exceptions import ValidationError

from cvat.apps.engine import models
from cvat.apps.engine.cache import Callback, DataWithMime, MediaCache, prepare_chunk
from cvat.apps.engine.media_providers.media_chunks import (
    BufferChunkLoader,
    ChunkLoader,
    FileChunkLoader,
    ReaderFactory,
)
from cvat.apps.engine.media_extractors import AudioReader
from cvat.apps.engine.media_providers.media_provider import IMediaProvider
from cvat.apps.engine.utils import take_by

_T = TypeVar("_T")


@dataclass
class DataWithMeta(Generic[_T]):
    data: _T
    mime: str


class IAudioProvider(IMediaProvider, metaclass=ABCMeta):
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

    def _get_abs_frame_number(self, db_data: models.Data, rel_frame_number: int) -> int:
        return db_data.start_frame + rel_frame_number * db_data.get_frame_step()

    def _get_rel_frame_number(self, db_data: models.Data, abs_frame_number: int) -> int:
        return (abs_frame_number - db_data.start_frame) // db_data.get_frame_step()


class TaskAudioProvider(IAudioProvider):
    def __init__(self, db_task: models.Task) -> None:
        self._db_task = db_task
        self._segment_audio_provider_cache = {}

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
        return self._get_segment_audio_provider(0).get_preview()

    def get_chunk(
        self, chunk_number: int, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL
    ) -> DataWithMeta[BytesIO]:
        return_type = DataWithMeta[BytesIO]
        chunk_number = self.validate_chunk_number(chunk_number)

        cache = MediaCache()
        cached_chunk = cache.get_task_chunk(self._db_task, chunk_number, quality=quality)
        if cached_chunk:
            return return_type(cached_chunk[0], cached_chunk[1])

        db_data = self._db_task.require_data()
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
            segment_audio_provider = SegmentAudioProvider(matching_segments[0])
            matching_chunk_index = segment_audio_provider.find_matching_chunk(
                sorted(task_chunk_frame_set)
            )
            if matching_chunk_index is not None:
                # The requested frames match one of the job chunks, we can use it directly
                return segment_audio_provider.get_chunk(matching_chunk_index, quality=quality)

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
            segment_audio_provider = SegmentAudioProvider(db_segment)
            segment_frame_set = db_segment.frame_set

            for task_chunk_frame_id in sorted(task_chunk_frames_with_rel_numbers.keys()):
                if (
                    task_chunk_frame_id not in segment_frame_set
                    or task_chunk_frame_id in task_chunk_frames
                ):
                    continue

                frame, frame_name = segment_audio_provider._get_raw_frame(
                    task_chunk_frames_with_rel_numbers[task_chunk_frame_id], quality=quality
                )
                task_chunk_frames[task_chunk_frame_id] = (frame, frame_name)

        if isinstance(db_task, int):
            db_task = models.Task.objects.get(pk=db_task)

        return prepare_chunk(
            task_chunk_frames.values(),
            quality=quality,
            db_task=db_task,
            dump_unchanged=True,
        )

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
        self._clear_segment_audio_provider_cache()

    def _clear_segment_audio_provider_cache(self):
        self._segment_audio_provider_cache.clear()

    def _get_segment_audio_provider(self, frame_number: int) -> SegmentAudioProvider:
        segment = self._get_segment(self.validate_frame_number(frame_number))

        provider = self._segment_audio_provider_cache.get(segment.id)
        if not provider:
            # A simple last result cache for iteration use cases (e.g. dataset export).
            # Avoid storing many providers in memory, each holds open chunks
            self._clear_segment_audio_provider_cache()
            provider = SegmentAudioProvider(segment)
            self._segment_audio_provider_cache[segment.id] = provider

        return provider

    def invalidate_chunks(self, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL):
        cache = MediaCache()

        number_of_chunks = math.ceil(self._db_task.data.size / self._db_task.data.chunk_size)
        for chunk_number in range(number_of_chunks):
            cache.remove_task_chunk(self._db_task, chunk_number, quality=quality)

        for segment in self._db_task.segment_set.all():
            segment_audio_provider = SegmentAudioProvider(segment)
            segment_audio_provider.invalidate_chunks(quality=quality)


class SegmentAudioProvider(IAudioProvider):
    _READER_FACTORIES: dict[models.DataChoice, ReaderFactory] = {
        # disable threading to avoid unpredictable server
        # resource consumption during reading in endpoints
        # can be enabled for other clients
        models.DataChoice.AUDIO_MP3: lambda source: AudioReader([source], allow_threading=False),
    }

    def __init__(self, db_segment: models.Segment) -> None:
        super().__init__()
        self._db_segment = db_segment

        db_data = db_segment.task.require_data()

        if (
            db_data.storage_method
            == models.StorageMethodChoice.CACHE
            # TODO: separate handling, extract cache creation logic from media cache
        ):
            cache = MediaCache()

            def make_loader(quality: models.FrameQuality) -> ChunkLoader:
                chunk_type = db_data.get_chunk_type(quality)
                return BufferChunkLoader(
                    reader_factory=self._READER_FACTORIES[chunk_type],
                    get_chunk_callback=lambda chunk_idx: cache.get_or_set_segment_chunk(
                        db_segment, chunk_idx, quality=quality
                    ),
                )

        else:

            def make_loader(quality: models.FrameQuality) -> ChunkLoader:
                chunk_type = db_data.get_chunk_type(quality)
                return FileChunkLoader(
                    reader_factory=self._READER_FACTORIES[chunk_type],
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


class JobAudioProvider(SegmentAudioProvider):
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

        task_audio_provider = TaskAudioProvider(self._db_segment.task)
        segment_start_chunk = task_audio_provider.get_chunk_number(self._db_segment.start_frame)
        segment_stop_chunk = task_audio_provider.get_chunk_number(self._db_segment.stop_frame)
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

        db_data = self._db_segment.task.require_data()
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
