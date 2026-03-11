# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
import math
from abc import ABCMeta, abstractmethod
from bisect import bisect
from collections import OrderedDict
from collections.abc import Iterable, Iterator, Sequence
from dataclasses import dataclass
from io import BytesIO
from typing import Literal, TypeVar

from attrs import define
import av
from django.db.models import prefetch_related_objects
import numpy as np
from rest_framework.exceptions import ValidationError

from cvat.apps.engine import models
from cvat.apps.engine.cache import Callback, DataWithMime, MediaCache, prepare_chunk
from cvat.apps.engine.media_providers.media_chunks import (
    BufferChunkLoader,
    ChunkLoader,
    FileChunkLoader,
    ReaderFactory,
)
from cvat.apps.engine.media_extractors import (
    AudioReader,
    IChunkWriter,
    IMediaReader,
    Mp3ChunkWriter,
)
from cvat.apps.engine.media_providers.media_provider import DataWithMeta, IMediaProvider
from cvat.apps.engine.utils import take_by

_T = TypeVar("_T")


@dataclass
class AudioDataWithMeta(DataWithMeta[_T]):
    start_offset: int


class IAudioProvider(IMediaProvider, metaclass=ABCMeta):
    @abstractmethod
    def validate_frame_number(self, frame_number: int) -> int: ...

    @abstractmethod
    def validate_chunk_number(self, chunk_number: int) -> int: ...

    @abstractmethod
    def get_chunk_number(self, frame_number: int) -> int: ...

    @abstractmethod
    def get_preview(self) -> AudioDataWithMeta[BytesIO]: ...

    @abstractmethod
    def get_chunk(
        self, chunk_number: int, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL
    ) -> AudioDataWithMeta[BytesIO]: ...

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

    def get_preview(self) -> AudioDataWithMeta[BytesIO]:
        return self._get_segment_audio_provider(0).get_preview()

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

        matching_segments: list[models.Segment] = [
            s
            for s in (
                self._db_task.segment_set.filter(type=models.SegmentType.RANGE)
                .order_by("start_frame")
                .all()
            )
            if ranges_overlap(task_chunk_frame_range, range(s.start_frame, s.stop_frame))
        ]
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
                    chunk_number,
                    quality,
                ],
            ),
        )

        return return_type(data=buffer, mime=mime_type)

    def get_chunk(
        self, chunk_number: int, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL
    ) -> AudioDataWithMeta[BytesIO]:
        return_type = AudioDataWithMeta[BytesIO]

        chunk = self._get_or_create_chunk(chunk_number=chunk_number, quality=quality)

        cache = MediaCache()
        chunk_key = cache._make_chunk_key(self._db_task, chunk_number=chunk_number, quality=quality)
        chunk_info = self._db_task.data.audio_chunks.get(key=chunk_key)
        assert chunk_info

        return return_type(
            data=chunk.data,
            mime=chunk.mime,
            start_offset=chunk_info.content_offset,
        )

    @staticmethod
    def _chunk_create_callback(
        db_task: models.Task | int,
        chunk_frames: tuple[int, int],
        index: int,
        quality: models.FrameQuality,
    ) -> DataWithMime:
        # Create and return a joined / cleaned chunk
        if isinstance(db_task, int):
            db_task = models.Task.objects.get(id=db_task)

        db_data = db_task.require_data()

        cache = MediaCache()
        chunk_key = cache._make_chunk_key(db_task, chunk_number=index, quality=quality)

        try:
            chunk_info = db_data.audio_chunks.get(key=chunk_key)
        except models.AudioChunkInfo.DoesNotExist:
            chunk_info = models.AudioChunkInfo(data=db_data, audio=db_data.audio, key=chunk_key)
            chunk_info_created = True

            # TODO: implement padding optimization
            padding = "auto"
        else:
            chunk_info_created = False
            padding = (chunk_info.left_padding, chunk_info.right_padding)

        source_audio_file, _ = cache.read_raw_audio(db_task)
        reader = AudioReader([source_audio_file])

        chunk_data, padding = create_audio_chunk(
            db_data, reader, payload_range=chunk_frames, quality=quality, padding=padding
        )

        if chunk_info_created:
            # TODO: handle possible existing value
            chunk_info.left_padding = padding[0]
            chunk_info.right_padding = padding[1]
            chunk_info.content_offset = padding[2]
            chunk_info.save()

        return chunk_data

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

    def get_preview(self) -> AudioDataWithMeta[BytesIO]:
        cache = MediaCache()
        preview, mime = cache.get_or_set_segment_preview(self._db_segment)
        return AudioDataWithMeta[BytesIO](preview, mime=mime)

    def get_chunk(
        self, chunk_number: int, *, quality: models.FrameQuality = models.FrameQuality.ORIGINAL
    ) -> AudioDataWithMeta[BytesIO]:
        chunk_number = self.validate_chunk_number(chunk_number)
        chunk_data, mime = self._loaders[quality].read_chunk(chunk_number)
        return AudioDataWithMeta[BytesIO](chunk_data, mime=mime)

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
    ) -> AudioDataWithMeta[BytesIO]:
        if not is_task_chunk:
            return super().get_chunk(chunk_number, quality=quality)

        # Backward compatibility for the "number" parameter
        # Reproduce the task chunks, limited by this job
        return_type = AudioDataWithMeta[BytesIO]

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
                callable=self._chunk_create_callback,
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
    def _chunk_create_callback(
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


def ranges_overlap(a: range, b: range) -> bool:
    return max(a.start, b.start) < min(a.stop, b.stop)


def range_overlap(a: range, b: range) -> range:
    return range(max(a.start, b.start), min(a.stop, b.stop))


def add_padding(
    payload_frames: Iterable[IMediaReader.AudioFrame],
    *,
    left_padding_ms: int = 0,
    right_padding_ms: int = 0,
) -> Iterable[IMediaReader.AudioFrame]:
    payload_iter = iter(payload_frames)

    first_frame = next(payload_iter)[0]
    assert first_frame.layout.nb_channels == 1 or first_frame.format.is_planar
    payload_format = first_frame.format
    payload_layout = first_frame.layout

    output_frames = itertools.chain([(first_frame, None)], payload_iter)

    def _ms_to_samples(ms: int) -> int:
        return math.ceil(ms / 1000 * first_frame.sample_rate)

    left_padding_samples_count = _ms_to_samples(left_padding_ms)
    right_padding_samples_count = _ms_to_samples(right_padding_ms)

    for insert_index, padded_samples_count in [
        (0, left_padding_samples_count),
        (-1, right_padding_samples_count),
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


def create_audio_chunk(
    db_data: models.Data,
    payload_reader: AudioReader,
    *,
    quality: models.FrameQuality,
    payload_range: tuple[int, int] | None = None,
    padding: tuple[int, int] | Literal["auto"] | None = None,
) -> tuple[DataWithMime, tuple[int, int, int]]:
    assert db_data.compressed_chunk_type == models.DataChoice.AUDIO_MP3
    assert db_data.original_chunk_type == models.DataChoice.AUDIO_MP3

    frame_quality_to_audio_quality = {
        models.FrameQuality.ORIGINAL: Mp3ChunkWriter.AudioQuality.high,
        models.FrameQuality.COMPRESSED: Mp3ChunkWriter.AudioQuality.medium,
    }

    writer = Mp3ChunkWriter(quality=frame_quality_to_audio_quality[quality])

    payload_start, payload_stop = payload_range or (None, None)

    if padding == "auto":
        left_padding, right_padding, payload_offset = find_best_padding(
            payload_reader=payload_reader,
            payload_start=payload_start,
            payload_stop=payload_stop,
            writer=writer,
            step=500,
        )
    else:
        left_padding, right_padding = padding or (0, 0)

    payload = payload_reader.read_frames(start=payload_start, stop=payload_stop)

    if left_padding or right_padding:
        payload = add_padding(payload, left_padding_ms=left_padding, right_padding_ms=right_padding)

    chunk_data = BytesIO()
    writer.save_as_chunk(payload, chunk_data)

    chunk_data.seek(0)
    mime = writer.CHUNK_MIME_TYPE

    return (chunk_data, mime), (left_padding, right_padding, payload_offset)


@define
class SampleMatcher:
    matching_sampling_rate = 8000

    def get_samples_for_matching(self, frames: Iterator[IMediaReader.AudioFrame]) -> np.ndarray:
        resampler = av.AudioResampler(format="s16p", rate=self.matching_sampling_rate)
        output_frames = [
            (resampled_frame, None)
            for input_frame, _ in frames
            for resampled_frame in resampler.resample(input_frame)
        ]
        return collect_samples(output_frames)


def collect_samples(frames: Iterator[AudioReader.AudioFrame]) -> np.ndarray:
    samples = None
    for frame, _ in frames:
        frame_samples = frame.to_ndarray()
        if samples is None:
            samples = frame_samples
        else:
            samples = np.append(samples, frame_samples, axis=1)

    return samples


def find_best_padding(
    payload_reader: AudioReader,
    payload_start: int,
    payload_stop: int,
    *,
    writer: IChunkWriter,
    step: int = 20,
    min_left_padding: int = 0,
    min_right_padding: int = 0,
    max_left_padding: int = 1000,
    max_right_padding: int = 1000,
    debug: bool = False,
) -> tuple[int, int]:
    assert max_left_padding >= 0 and max_right_padding >= 0
    assert min_left_padding >= 0 and min_right_padding >= 0

    def payload_frames_factory():
        return payload_reader.read_frames(start=payload_start, stop=payload_stop)

    sample_matcher = SampleMatcher()
    payload_samples_for_matching = sample_matcher.get_samples_for_matching(payload_frames_factory())

    def check_padding(
        left_padding: int, right_padding: int
    ) -> tuple[float | None, int | None, tuple[np.ndarray, np.ndarray, int, int, int] | None]:
        result_file = BytesIO()

        def _cvat_frame_to_sample(frame: int) -> int:
            return math.ceil(frame / payload_reader.FRAME_RATE * payload_reader.sampling_rate)

        chunk_payload_left_padding = _cvat_frame_to_sample(left_padding)
        chunk_payload_frames = list(
            add_padding(
                payload_frames_factory(),
                left_padding_ms=left_padding,
                right_padding_ms=right_padding,
            )
        )

        writer.save_as_chunk(chunk_payload_frames, result_file)
        result_file.seek(0)

        result_reader = AudioReader([result_file])
        if result_reader.length < payload_stop - payload_start + 1:
            return None, None, None

        result_samples_for_matching = sample_matcher.get_samples_for_matching(
            result_reader.read_frames()
        )
        left_padding_samples = math.ceil(
            sample_matcher.matching_sampling_rate * left_padding / payload_reader.FRAME_RATE
        )
        match_score, match_offset = match_samples(
            haystack=result_samples_for_matching,
            needle=payload_samples_for_matching,
            max_offset=left_padding_samples,
        )

        if debug:
            chunk_payload_left_padding_for_preview = int(
                chunk_payload_left_padding
                / payload_reader.sampling_rate
                * sample_matcher.matching_sampling_rate
            )
            match_preview = (
                result_samples_for_matching,
                sample_matcher.get_samples_for_matching(chunk_payload_frames),
                payload_samples_for_matching.shape[-1],
                match_offset,
                chunk_payload_left_padding_for_preview,
            )
        else:
            match_preview = None

        match_offset = int(
            match_offset / sample_matcher.matching_sampling_rate * payload_reader.FRAME_RATE
        )

        return match_score, match_offset, match_preview

    # Find the minimal right padding to preserve all the payload
    result_table = {}

    best_score = None
    best_result_payload_offset = None
    best_left_padding = min_left_padding
    best_right_padding = min_right_padding

    right_padding = min_right_padding
    while right_padding < max_right_padding + 1:
        match_score, match_offset, match_preview = check_padding(best_left_padding, right_padding)
        result_table[(best_left_padding, right_padding)] = (
            match_offset,
            match_score,
            match_preview,
        )
        if match_offset is None:
            right_padding += step
            continue

        if best_score is None or match_score < best_score:
            best_score = match_score
            best_right_padding = right_padding
            best_result_payload_offset = match_offset

        right_padding += step

    # Find the minimal left padding to preserve all the payload
    left_padding = min_left_padding
    while left_padding < max_left_padding + 1:
        match_score, match_offset, match_preview = check_padding(left_padding, best_right_padding)
        result_table[(left_padding, best_right_padding)] = (
            match_offset,
            match_score,
            match_preview,
        )
        if match_offset is None:
            left_padding += step
            continue

        if best_score is None or match_score < best_score:
            best_score = match_score
            best_left_padding = left_padding
            best_result_payload_offset = match_offset

        left_padding += step

    return best_left_padding, best_right_padding, best_result_payload_offset


def match_samples(
    haystack: np.ndarray,
    needle: np.ndarray,
    *,
    max_offset: int | None = None,
) -> tuple[float, int]:
    best_score = -1
    best_offset = -1

    window_size = needle.shape[-1]

    max_window_pos = haystack.shape[-1] - window_size - 1
    if max_offset is not None:
        max_window_pos = max(0, min(max_window_pos, max_offset))

    for offset in range(0, max_window_pos + 1):
        # TODO: maybe downsample, but it can lead to imprecise results
        haystack_frame = haystack[..., offset : offset + window_size]
        score = np.sum(np.abs(haystack_frame - needle))

        if best_score == -1 or score < best_score:
            best_score = score
            best_offset = offset

    return best_score, best_offset
