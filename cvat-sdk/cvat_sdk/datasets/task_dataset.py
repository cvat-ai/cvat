# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import contextlib
import tempfile
from collections.abc import Generator, Iterable, Iterator, Sequence
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import attrs
import PIL.Image

import cvat_sdk.core
import cvat_sdk.models as models
from cvat_sdk.datasets.caching import CacheManager, UpdatePolicy, make_cache_manager
from cvat_sdk.datasets.chunk_readers import (
    ChunkAccessModeNotSupportedError,
    ChunkReadError,
    ChunkReaderUnavailableError,
    IChunkReader,
    VideoMp4ChunkReader,
    ZipChunkReader,
)
from cvat_sdk.datasets.common import (
    FrameAnnotations,
    MediaDownloadPolicy,
    MediaElement,
    Sample,
    UnreadableMediaError,
    UnsupportedDatasetError,
)

_NUM_DOWNLOAD_THREADS = 4


class TaskDataset:
    """
    Represents a task on a CVAT server as a collection of samples.

    Each sample corresponds to one frame in the task, and provides access to
    the corresponding annotations and media data. Deleted frames are omitted.

    This class caches task metadata for the task on the local file system
    during construction. Media data caching depends on `media_download_policy`.

    Limitations:

    * Media of tasks whose original chunks are videos can only be read through `iter_samples`,
      unless `media_download_policy` is `FETCH_FRAMES_ON_DEMAND`.
    * Track annotations are currently not accessible.
    """

    _READER_CLASSES: dict[str, type[IChunkReader]] = {
        "imageset": ZipChunkReader,
        "video": VideoMp4ChunkReader,
    }

    class _TaskMediaElement(MediaElement):
        def __init__(self, dataset: TaskDataset, frame_index: int) -> None:
            self._dataset = dataset
            self._frame_index = frame_index

        def load_image(self) -> PIL.Image.Image:
            return self._dataset._load_frame_image(self._frame_index)

    class _TaskLoadedMediaElement(MediaElement):
        def __init__(self, image: PIL.Image.Image) -> None:
            self._image = image

        def load_image(self) -> PIL.Image.Image:
            return self._image

    def __init__(
        self,
        client: cvat_sdk.core.Client,
        task_id: int,
        *,
        update_policy: UpdatePolicy = UpdatePolicy.IF_MISSING_OR_STALE,
        load_annotations: bool = True,
        media_download_policy: MediaDownloadPolicy = MediaDownloadPolicy.PRELOAD_ALL,
    ) -> None:
        """
        Creates a dataset corresponding to the task with ID `task_id` on the
        server that `client` is connected to.

        `update_policy` determines when and if the local cache will be updated.

        `load_annotations` determines whether annotations will be loaded from
        the server. If set to False, the `annotations` field in the samples will
        be set to None.

        `media_download_policy` determines when media data is downloaded.

        `MediaDownloadPolicy.FETCH_FRAMES_ON_DEMAND` may not be used with `UpdatePolicy.NEVER`,
        as it requires network access.
        """

        self._client = client
        self._logger = client.logger
        self._update_policy = update_policy
        self._media_download_policy = media_download_policy

        self._cache_manager = make_cache_manager(client, update_policy)
        self._task = self._cache_manager.retrieve_task(task_id)

        if not self._task.size or not self._task.data_chunk_size:
            raise UnsupportedDatasetError("The task has no data")

        self._logger.info("Fetching labels...")
        self._labels = tuple(self._task.get_labels())

        data_meta = self._cache_manager.ensure_task_model(
            self._task.id,
            "data_meta.json",
            models.DataMetaRead,
            self._task.get_meta,
            "data metadata",
        )

        active_frame_indexes = set(range(self._task.size)) - set(data_meta.deleted_frames)

        if media_download_policy == MediaDownloadPolicy.PRELOAD_ALL:
            self._init_chunk_dir()
            needed_chunks = {index // self._task.data_chunk_size for index in active_frame_indexes}
            self._ensure_chunks(needed_chunks)
            self._load_frame_image = self._load_frame_image_from_cache
        elif media_download_policy == MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND:
            self._init_chunk_dir()
            self._load_frame_image = self._load_frame_image_from_cache
        elif media_download_policy == MediaDownloadPolicy.FETCH_FRAMES_ON_DEMAND:
            assert update_policy != UpdatePolicy.NEVER
            self._load_frame_image = self._load_frame_image_from_server
        else:
            assert False, "Unknown media download policy"

        if load_annotations:
            self._load_annotations(self._cache_manager, sorted(active_frame_indexes))
        else:
            self._frame_annotations = {
                frame_index: None for frame_index in sorted(active_frame_indexes)
            }

        # TODO: tracks?

        is_imageset = self._task.data_original_chunk_type == "imageset"

        self._samples = [
            Sample(
                frame_index=k,
                frame_name=data_meta.frames[k if is_imageset else 0].name,
                annotations=v,
                media=self._TaskMediaElement(self, k),
            )
            for k, v in self._frame_annotations.items()
        ]
        self._samples_by_frame_index = {sample.frame_index: sample for sample in self._samples}

    def _init_chunk_dir(self) -> None:
        if self._task.data_original_chunk_type not in self._READER_CLASSES:
            raise UnsupportedDatasetError(
                "Chunk-based media access is not supported for tasks whose original chunk type "
                f"is {self._task.data_original_chunk_type!r}"
            )

        try:
            self._READER_CLASSES[self._task.data_original_chunk_type].ensure_available()
        except ChunkReaderUnavailableError as e:
            raise UnsupportedDatasetError(str(e)) from e

        self._cache_manager.chunk_dir(task_id=self._task.id).mkdir(exist_ok=True, parents=True)

    def _ensure_chunks(self, chunk_indexes: Iterable[int]) -> None:
        self._logger.info("Downloading chunks...")

        with ThreadPoolExecutor(_NUM_DOWNLOAD_THREADS) as pool:

            def ensure_chunk(chunk_index):
                self._cache_manager.ensure_chunk(task=self._task, chunk_index=chunk_index)

            for _ in pool.map(ensure_chunk, sorted(chunk_indexes)):
                # just need to loop through all results so that any exceptions are propagated
                pass

        self._logger.info("All chunks downloaded")

    def _load_annotations(self, cache_manager: CacheManager, frame_indexes: Iterable[int]) -> None:
        annotations = cache_manager.ensure_task_model(
            self._task.id,
            "annotations.json",
            models.LabeledData,
            self._task.get_annotations,
            "annotations",
        )

        self._frame_annotations = {frame_index: FrameAnnotations() for frame_index in frame_indexes}

        for tag in annotations.tags:
            # Some annotations may belong to deleted frames; skip those.
            if tag.frame in self._frame_annotations:
                self._frame_annotations[tag.frame].tags.append(tag)

        for shape in annotations.shapes:
            if shape.frame in self._frame_annotations:
                self._frame_annotations[shape.frame].shapes.append(shape)

    @property
    def labels(self) -> Sequence[models.ILabel]:
        """
        Returns the labels configured in the task.

        Clients must not modify the object returned by this property or its components.
        """
        return self._labels

    @property
    def samples(self) -> Sequence[Sample]:
        """
        Returns a sequence of all samples, in order of their frame indices.

        Note that the frame indices may not be contiguous, as deleted frames will not be included.

        Clients must not modify the object returned by this property or its components.
        """
        return self._samples

    @contextlib.contextmanager
    def iter_samples(
        self, *, temporary_chunks: bool = False
    ) -> Generator[Iterator[Sample], Any, None]:
        """
        Returns a context manager yielding an iterator over the task samples.

        When `media_download_policy` is `FETCH_CHUNKS_ON_DEMAND`, the iterator downloads the first
        chunk, then starts prefetching the next chunk while the caller processes samples
        from the current chunk.

        If `temporary_chunks` is true and `media_download_policy` is `FETCH_CHUNKS_ON_DEMAND`,
        chunk files are materialized in a temporary directory separate from the shared cache
        and deleted after the iterator advances past them.

        Media of tasks whose original chunks are videos can only be read through this method,
        unless `media_download_policy` is `FETCH_FRAMES_ON_DEMAND`.

        WARNING: Callers should finish using each sample's media data before advancing the iterator.
        Keeping references to previous samples after requesting the next sample is unsupported.
        """

        if self._media_download_policy == MediaDownloadPolicy.FETCH_FRAMES_ON_DEMAND:
            assert not temporary_chunks
            yield iter(self._samples)
            return

        if self._media_download_policy == MediaDownloadPolicy.PRELOAD_ALL:
            assert not temporary_chunks

        if temporary_chunks:
            assert self._update_policy == UpdatePolicy.IF_MISSING_OR_STALE

            with tempfile.TemporaryDirectory(
                prefix=f"cvat-task-{self._task.id}-chunks-"
            ) as temp_dir:
                temp_cache_manager = make_cache_manager(
                    client=self._client,
                    update_policy=self._update_policy,
                    cache_dir=Path(temp_dir),
                )
                temp_cache_manager.chunk_dir(task_id=self._task.id).mkdir(parents=True)

                samples_iterator = self._iter_samples_by_chunks(
                    cache_manager=temp_cache_manager, temporary_chunks=True
                )
                try:
                    yield samples_iterator
                finally:
                    samples_iterator.close()
            return

        samples_iterator = self._iter_samples_by_chunks(
            cache_manager=self._cache_manager, temporary_chunks=False
        )
        try:
            yield samples_iterator
        finally:
            samples_iterator.close()

    def _iter_samples_by_chunks(
        self, cache_manager: CacheManager, temporary_chunks: bool
    ) -> Generator[Sample, None, None]:
        chunk_indexes = sorted(
            {sample.frame_index // self._task.data_chunk_size for sample in self._samples}
        )
        if not chunk_indexes:
            return

        with ThreadPoolExecutor(max_workers=1) as download_pool:
            next_chunk_download = download_pool.submit(
                cache_manager.ensure_chunk, task=self._task, chunk_index=chunk_indexes[0]
            )

            for chunk_offset, chunk_index in enumerate(chunk_indexes):
                next_chunk_download.result()

                if chunk_offset + 1 < len(chunk_indexes):
                    next_chunk_download = download_pool.submit(
                        cache_manager.ensure_chunk,
                        task=self._task,
                        chunk_index=chunk_indexes[chunk_offset + 1],
                    )

                chunk_path = cache_manager.chunk_path(task=self._task, chunk_index=chunk_index)

                yield from self._iter_chunk_samples(chunk_index=chunk_index, chunk_path=chunk_path)

                if temporary_chunks:
                    chunk_path.unlink(missing_ok=True)

    def _iter_chunk_samples(
        self, chunk_index: int, chunk_path: Path
    ) -> Generator[Sample, None, None]:
        first_frame_index = chunk_index * self._task.data_chunk_size
        frame_indexes = range(
            first_frame_index,
            min(first_frame_index + self._task.data_chunk_size, self._task.size),
        )
        reader = self._READER_CLASSES[self._task.data_original_chunk_type](chunk_path=chunk_path)

        try:
            with contextlib.closing(iter(reader)) as images:
                for frame_index, image in zip(frame_indexes, images, strict=True):
                    sample = self._samples_by_frame_index.get(frame_index)
                    if sample is not None:
                        yield attrs.evolve(sample, media=self._TaskLoadedMediaElement(image=image))
        except ChunkAccessModeNotSupportedError as e:
            raise UnsupportedDatasetError(
                "Media of tasks whose original chunk type is "
                f"{self._task.data_original_chunk_type!r} cannot be read through iter_samples"
            ) from e
        except ChunkReadError as e:
            raise UnreadableMediaError(
                f"Failed to read chunk {chunk_index} of task {self._task.id}: {e}"
            ) from e

    def _load_frame_image_from_cache(self, frame_index: int) -> PIL.Image:
        assert frame_index in self._frame_annotations

        chunk_index, member_index = divmod(frame_index, self._task.data_chunk_size)
        self._cache_manager.ensure_chunk(task=self._task, chunk_index=chunk_index)
        chunk_path = self._cache_manager.chunk_path(task=self._task, chunk_index=chunk_index)
        reader = self._READER_CLASSES[self._task.data_original_chunk_type](chunk_path=chunk_path)

        try:
            return reader[member_index]
        except ChunkAccessModeNotSupportedError as e:
            raise UnsupportedDatasetError(
                "Media of tasks whose original chunk type is "
                f"{self._task.data_original_chunk_type!r} can only be read through iter_samples"
            ) from e
        except ChunkReadError as e:
            raise UnreadableMediaError(
                f"Failed to read chunk {chunk_index} of task {self._task.id}: {e}"
            ) from e

    def _load_frame_image_from_server(self, frame_index: int) -> PIL.Image:
        assert frame_index in self._frame_annotations

        return PIL.Image.open(self._task.get_frame(frame_index, quality="original"))
