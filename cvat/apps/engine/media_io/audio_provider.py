# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import math
from abc import ABCMeta, abstractmethod
from bisect import bisect
from collections.abc import Iterable, Sequence
from io import BytesIO

import av
import av.audio
import av.audio.frame
import numpy as np
from django.db.models import prefetch_related_objects
from rest_framework.exceptions import ValidationError

from cvat.apps.engine import models
from cvat.apps.engine.cache import Callback, DataWithMime, MediaCache
from cvat.apps.engine.media_extractors import (
    AudioReader,
    IMediaReader,
    Mp3ChunkWriter,
)
from cvat.apps.engine.media_io.media_chunks import (
    BufferChunkLoader,
    ChunkLoader,
    FileChunkLoader,
    ReaderFactory,
)
from cvat.apps.engine.media_io.media_provider import (
    DataWithMeta,
    IMediaProvider,
    PreviewNotAvailable,
    segment_has_media_derived_preview,
)
from cvat.apps.engine.utils import take_by


class IAudioProvider(IMediaProvider, metaclass=ABCMeta):
    @abstractmethod
    def validate_frame_number(self, frame_number: int) -> int: ...

    @abstractmethod
    def validate_chunk_number(self, chunk_number: int) -> int: ...

    @abstractmethod
    def get_chunk_number(self, frame_number: int) -> int: ...

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
        self._segment_media_provider_cache = {}

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

    def get_preview_image(self, *, allow_empty: bool = False) -> DataWithMeta[BytesIO]:
        return self._get_segment_audio_provider(0).get_preview_image(allow_empty=allow_empty)

    def _get_or_create_chunk(
        self, chunk_number: int, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL
    ) -> DataWithMeta[BytesIO]:
        return_type = DataWithMeta[BytesIO]
        chunk_number = self.validate_chunk_number(chunk_number)

        cache = MediaCache()
        cached_chunk = cache.get_task_chunk(self._db_task, chunk_number, quality=quality)
        if cached_chunk:
            return return_type(cached_chunk[0], cached_chunk[1])

        db_data = self._db_task.require_data()
        task_chunk_start_frame = chunk_number * db_data.chunk_size
        task_chunk_stop_frame = (chunk_number + 1) * db_data.chunk_size - 1
        task_chunk_frame_range = range(
            db_data.start_frame + task_chunk_start_frame,
            min(db_data.start_frame + task_chunk_stop_frame, db_data.stop_frame) + 1,
        )

        matching_segments: list[models.Segment] = sorted(
            [
                # Filter and sort here to avoid extra requests
                s
                for s in self._db_task.segment_set.all()
                if s.type == models.SegmentType.RANGE
                if ranges_overlap(task_chunk_frame_range, range(s.start_frame, s.stop_frame))
            ],
            key=lambda s: s.start_frame,
        )
        assert matching_segments

        # Don't put this into set_callback to avoid data duplication in the cache
        if len(matching_segments) == 1:
            segment_audio_provider = SegmentAudioProvider(matching_segments[0])
            matching_chunk_index = segment_audio_provider.find_matching_chunk(
                task_chunk_frame_range
            )
            if matching_chunk_index is not None:
                # The requested frames match one of the job chunks, we can use it directly
                return segment_audio_provider.get_chunk(matching_chunk_index, quality=quality)

        buffer, mime_type = cache.get_or_set_task_chunk(
            self._db_task,
            chunk_number,
            quality=quality,
            set_callback=Callback(
                self._chunk_create_callback,
                args=[
                    self._db_task,
                    (task_chunk_frame_range.start, task_chunk_frame_range.stop),
                    quality,
                ],
            ),
        )

        return return_type(data=buffer, mime=mime_type)

    def get_chunk(
        self, chunk_number: int, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL
    ) -> DataWithMeta[BytesIO]:
        return self._get_or_create_chunk(chunk_number=chunk_number, quality=quality)

    @classmethod
    def _chunk_create_callback(
        cls,
        db_task: models.Task | int,
        chunk_frames: tuple[int, int],
        quality: models.FrameQuality,
    ) -> DataWithMime:
        if isinstance(db_task, int):
            db_task = models.Task.objects.get(id=db_task)

        return cls._build_audio_chunk(
            db_task=db_task,
            chunk_frames=chunk_frames,
            quality=quality,
            cache=MediaCache(),
        )

    @classmethod
    def _build_audio_chunk(
        cls,
        db_task: models.Task,
        chunk_frames: tuple[int, int],
        *,
        quality: models.FrameQuality,
        cache: MediaCache,
    ):
        db_data = db_task.require_data()

        # Constant padding big enough for most cases.
        # 5000 samples is comfortably above libmp3lame's tail-flush requirement
        # (encoder delay + lookahead, ~1680 samples) at every common sample rate:
        # ~113 ms @ 44.1 kHz, ~104 ms @ 48 kHz, 625 ms @ 8 kHz.
        #
        # Left padding is 0: libmp3lame writes a Xing/Info+LAME header in the first
        # MPEG frame, describing the ~1102-sample builtin encoder delay. Decoders that honor
        # the tag skip those samples, so payload aligns at sample 0 without any
        # extra leading padding. It includes all mainstream browsers after 2020,
        # ffmpeg and the wavesurfer.js library we use.
        # If we reuse the input file and it misses the tag, recoding would not make it
        # any better - we just treat the padding as a part of the file itself.
        # https://wiki.hydrogenaudio.org/index.php?title=Gapless_playback
        right_padding = 5000

        source_audio_file, _ = cache.read_raw_audio(db_task)
        reader = AudioReader([source_audio_file], start=chunk_frames[0], stop=chunk_frames[1])

        return prepare_audio_chunk(db_data, reader, quality=quality, right_padding=right_padding)

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
                # Filter and sort here to avoid extra requests
                s
                for s in sorted(
                    self._db_task.segment_set.all(),
                    key=lambda s: s.type != models.SegmentType.RANGE,
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
        self._segment_media_provider_cache.clear()

    def _get_segment_audio_provider(self, frame_number: int) -> SegmentAudioProvider:
        segment = self._get_segment(self.validate_frame_number(frame_number))

        provider = self._segment_media_provider_cache.get(segment.id)
        if not provider:
            # A simple last result cache for iteration use cases (e.g. dataset export).
            # Avoid storing many providers in memory, each holds open chunks
            self._clear_segment_audio_provider_cache()
            provider = SegmentAudioProvider(segment)
            self._segment_media_provider_cache[segment.id] = provider

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

    def find_matching_chunk(self, frames: Sequence[int]) -> int | None:
        return next(
            (
                i
                for i, chunk_frames in enumerate(
                    take_by(self._db_segment.frame_set, self._db_segment.task.data.chunk_size)
                )
                if frames == set(chunk_frames)
            ),
            None,
        )

    def get_preview_image(self, *, allow_empty: bool = False) -> DataWithMeta[BytesIO]:
        if allow_empty and not segment_has_media_derived_preview(self._db_segment):
            raise PreviewNotAvailable

        task_audio_provider = TaskAudioProvider(self._db_segment.task)
        first_segment = task_audio_provider._get_segment(
            task_audio_provider.validate_frame_number(0)
        )
        if self._db_segment.task.data.audio.has_cover_image and (
            first_segment.id != self._db_segment.id
        ):
            # Reuse the cover image cached for the first segment
            return task_audio_provider.get_preview_image()

        cache = MediaCache()
        preview, mime = cache.get_or_set_segment_preview(self._db_segment)
        return DataWithMeta[BytesIO](preview, mime=mime)

    def get_chunk(
        self, chunk_number: int, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL
    ) -> DataWithMeta[BytesIO]:
        return self._get_or_create_chunk(chunk_number=chunk_number, quality=quality)

    def _get_or_create_chunk(
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

    def get_frame_index(self, frame_number: int) -> int | None:
        segment_frames = self._db_segment.frame_set
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

    def validate_chunk_number(self, chunk_number: int) -> int:
        segment_size = self._db_segment.frame_count
        last_chunk = math.ceil(segment_size / self._db_segment.task.data.chunk_size) - 1
        if not 0 <= chunk_number <= last_chunk:
            raise ValidationError(
                f"Invalid chunk number '{chunk_number}'. "
                f"The chunk number should be in the [0, {last_chunk}] range"
            )

        return chunk_number


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

        return self._get_or_create_task_chunk(chunk_number=chunk_number, quality=quality)

    def _get_or_create_task_chunk(
        self,
        chunk_number: int,
        *,
        quality: models.FrameQuality = models.FrameQuality.ORIGINAL,
    ) -> DataWithMeta[BytesIO]:
        # Backward compatibility for the "number" parameter
        # Reproduce the task chunks, limited by this job

        return_type = DataWithMeta[BytesIO]

        cache = MediaCache()
        cached_chunk = cache.get_segment_task_chunk(self._db_segment, chunk_number, quality=quality)
        if cached_chunk:
            return return_type(cached_chunk[0], cached_chunk[1])

        task_audio_provider = TaskAudioProvider(self._db_segment.task)
        segment_start_chunk = task_audio_provider.get_chunk_number(self._db_segment.start_frame)
        segment_stop_chunk = task_audio_provider.get_chunk_number(self._db_segment.stop_frame)
        if not segment_start_chunk <= chunk_number <= segment_stop_chunk:
            raise ValidationError(
                f"Invalid chunk number '{chunk_number}'. "
                "The chunk number should be in the "
                f"[{segment_start_chunk}, {segment_stop_chunk}] range"
            )

        db_data = self._db_segment.task.require_data()
        task_chunk_start_frame = chunk_number * db_data.chunk_size
        task_chunk_stop_frame = (chunk_number + 1) * db_data.chunk_size - 1
        task_chunk_frame_set = range(
            db_data.start_frame + task_chunk_start_frame,
            min(db_data.start_frame + task_chunk_stop_frame, db_data.stop_frame) + 1,
        )

        # Don't put this into set_callback to avoid data duplication in the cache
        matching_chunk = self.find_matching_chunk(task_chunk_frame_set)
        if matching_chunk is not None:
            return self.get_chunk(matching_chunk, quality=quality)

        if self._db_segment.type != models.SegmentType.RANGE:
            raise NotImplementedError

        segment_chunk_frame_ids = range_overlap(task_chunk_frame_set, self._db_segment.frame_set)

        buffer, mime_type = cache.get_or_set_segment_task_chunk(
            self._db_segment,
            chunk_number,
            quality=quality,
            set_callback=Callback(
                callable=self._chunk_create_callback,
                args=[
                    self._db_segment,
                    (segment_chunk_frame_ids[0], segment_chunk_frame_ids[-1]),
                    quality,
                ],
            ),
        )

        return return_type(data=buffer, mime=mime_type)

    @staticmethod
    def _chunk_create_callback(
        db_segment: models.Segment | int,
        segment_chunk_frame_ids: tuple[int, int],
        quality: models.FrameQuality,
    ) -> DataWithMime:
        if isinstance(db_segment, int):
            db_segment = models.Segment.objects.get(pk=db_segment)

        if db_segment.type != models.SegmentType.RANGE:
            assert False

        cache = MediaCache()
        return cache.prepare_custom_range_segment_chunk(
            db_task=db_segment.task,
            frame_ids=segment_chunk_frame_ids,
            quality=quality,
            cache=cache,
        )


def ranges_overlap(a: range, b: range) -> bool:
    return max(a.start, b.start) < min(a.stop, b.stop)


def range_overlap(a: range, b: range) -> range:
    return range(max(a.start, b.start), min(a.stop, b.stop) + 1)


def add_padding(
    payload_frames: Iterable[IMediaReader.AudioFrame],
    *,
    left_padding_samples: int = 0,
    right_padding_samples: int = 0,
) -> Iterable[IMediaReader.AudioFrame]:
    payload_iter = iter(payload_frames)

    first_frame = next(payload_iter)[0]
    payload_format = first_frame.format
    payload_layout = first_frame.layout

    output_frames = itertools.chain([(first_frame, None)], payload_iter)

    for insert_index, padded_samples_count in [
        (0, left_padding_samples),
        (-1, right_padding_samples),
    ]:
        if padded_samples_count == 0:
            continue

        padded_samples = np.zeros(
            (payload_layout.nb_channels, padded_samples_count),
            dtype=av.audio.frame.format_dtypes[payload_format.name],
        )

        if payload_format.is_packed:
            padded_samples = padded_samples.reshape((1, -1))

        padded_frame = av.AudioFrame.from_ndarray(
            padded_samples, format=payload_format, layout=payload_layout
        )
        padded_frame.sample_rate = first_frame.sample_rate
        padded_frame.time_base = first_frame.time_base

        if insert_index == 0:
            output_frames = itertools.chain([(padded_frame, None)], output_frames)
        elif insert_index == -1:
            output_frames = itertools.chain(output_frames, [(padded_frame, None)])
        else:
            raise NotImplementedError

    yield from output_frames


def prepare_audio_chunk(
    db_data: models.Data,
    payload_reader: AudioReader,
    *,
    quality: models.FrameQuality,
    right_padding: int = 0,
) -> DataWithMime:
    assert db_data.compressed_chunk_type == models.DataChoice.AUDIO_MP3
    assert db_data.original_chunk_type == models.DataChoice.AUDIO_MP3

    frame_quality_to_audio_quality = {
        models.FrameQuality.ORIGINAL: Mp3ChunkWriter.AudioQuality.high,
        models.FrameQuality.COMPRESSED: Mp3ChunkWriter.AudioQuality.medium,
    }

    writer = Mp3ChunkWriter(quality=frame_quality_to_audio_quality[quality])

    if (
        payload_reader.format_name == writer.FORMAT
        and right_padding == 0
        and payload_reader.start == 0
        and (payload_reader.stop is None or payload_reader.length <= payload_reader.stop)
    ):
        # Reuse the source file, if it matches the output format.
        chunk_data = BytesIO()
        with payload_reader._source_path.open("rb") as f:
            chunk_data.write(f.read())

        chunk_data.seek(0)

        # Writing still can fail with CacheTooLargeDataError.
        # TODO: add chunking for too large input files, when UI is able to render them
        return chunk_data, writer.CHUNK_MIME_TYPE

    payload = payload_reader.read_frames()

    if right_padding:
        payload = add_padding(payload, right_padding_samples=right_padding)

    chunk_data = BytesIO()
    writer.save_as_chunk(payload, chunk_data)

    chunk_data.seek(0)
    return chunk_data, writer.CHUNK_MIME_TYPE
