# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import zipfile
from collections.abc import Iterable, Sequence
from concurrent.futures import ThreadPoolExecutor
from typing import Iterator

import PIL.Image

import cvat_sdk.core
import cvat_sdk.core.exceptions
import cvat_sdk.models as models
from cvat_sdk.datasets.caching import CacheManager, UpdatePolicy, make_cache_manager
from cvat_sdk.datasets.common import (
    FrameAnnotations,
    MediaDownloadPolicy,
    MediaElement,
    Sample,
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

    * Only tasks with image (not video) data are supported at the moment.
    * Track annotations are currently not accessible.
    """

    class _TaskMediaElement(MediaElement):
        def __init__(self, dataset: TaskDataset, frame_index: int) -> None:
            self._dataset = dataset
            self._frame_index = frame_index

        def load_image(self) -> PIL.Image.Image:
            return self._dataset._load_frame_image(self._frame_index)

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

        self._logger = client.logger
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
            self._load_frame_image = self._load_frame_image_from_chunk_cache
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

    def _init_chunk_dir(self) -> None:
        if self._task.data_original_chunk_type != "imageset":
            raise UnsupportedDatasetError(
                f"Chunk-based media access is only supported for tasks with image chunks;"
                f" current chunk type is {self._task.data_original_chunk_type!r}"
            )

        self._chunk_dir = self._cache_manager.chunk_dir(self._task.id)
        self._chunk_dir.mkdir(exist_ok=True, parents=True)

    def _ensure_chunks(self, chunk_indexes: Iterable[int]) -> None:
        self._logger.info("Downloading chunks...")

        with ThreadPoolExecutor(_NUM_DOWNLOAD_THREADS) as pool:

            def ensure_chunk(chunk_index):
                self._cache_manager.ensure_chunk(self._task, chunk_index)

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

    def iter_sample_chunks(
        self, *, delete_finished_chunks: bool = False
    ) -> Iterator[Sequence[Sample]]:
        """
        Iterates over the task samples chunk by chunk.

        The current chunk is ensured before it is yielded, and the next chunk is downloaded
        in the background while the caller processes the current one.

        If `delete_finished_chunks` is true, each chunk file is deleted after iteration
        advances past that chunk. Callers should therefore consume the yielded samples
        sequentially and not keep references for later media access.
        """

        if self._media_download_policy == MediaDownloadPolicy.FETCH_FRAMES_ON_DEMAND:
            raise UnsupportedDatasetError(
                "iter_sample_chunks is not supported with FETCH_FRAMES_ON_DEMAND"
            )

        if self._task.data_original_chunk_type != "imageset":
            raise UnsupportedDatasetError(
                f"Chunk iteration is only supported for tasks with image chunks;"
                f" current chunk type is {self._task.data_original_chunk_type!r}"
            )

        sample_chunks: list[tuple[int, list[Sample]]] = []
        current_chunk_index: int | None = None
        current_chunk_samples: list[Sample] = []

        for sample in self._samples:
            sample_chunk_index = sample.frame_index // self._task.data_chunk_size

            if sample_chunk_index != current_chunk_index:
                if current_chunk_samples:
                    assert current_chunk_index is not None
                    sample_chunks.append((current_chunk_index, current_chunk_samples))

                current_chunk_index = sample_chunk_index
                current_chunk_samples = [sample]
            else:
                current_chunk_samples.append(sample)

        if current_chunk_samples:
            assert current_chunk_index is not None
            sample_chunks.append((current_chunk_index, current_chunk_samples))

        if not sample_chunks:
            return

        with ThreadPoolExecutor(max_workers=1) as pool:
            next_chunk_future = pool.submit(
                self._cache_manager.ensure_chunk,
                self._task,
                sample_chunks[0][0],
            )

            for chunk_offset, (chunk_index, chunk_samples) in enumerate(sample_chunks):
                next_chunk_future.result()

                if chunk_offset + 1 < len(sample_chunks):
                    next_chunk_future = pool.submit(
                        self._cache_manager.ensure_chunk,
                        self._task,
                        sample_chunks[chunk_offset + 1][0],
                    )

                yield chunk_samples

                if delete_finished_chunks:
                    (self._chunk_dir / f"{chunk_index}.zip").unlink(missing_ok=True)

    def _load_frame_image_from_cache(self, frame_index: int) -> PIL.Image:
        assert frame_index in self._frame_annotations

        chunk_index = frame_index // self._task.data_chunk_size
        member_index = frame_index % self._task.data_chunk_size

        with zipfile.ZipFile(self._chunk_dir / f"{chunk_index}.zip", "r") as chunk_zip:
            with chunk_zip.open(chunk_zip.infolist()[member_index]) as chunk_member:
                image = PIL.Image.open(chunk_member)
                image.load()

        return image

    def _load_frame_image_from_chunk_cache(self, frame_index: int) -> PIL.Image:
        chunk_index = frame_index // self._task.data_chunk_size
        self._cache_manager.ensure_chunk(self._task, chunk_index)
        return self._load_frame_image_from_cache(frame_index)

    def _load_frame_image_from_server(self, frame_index: int) -> PIL.Image:
        assert frame_index in self._frame_annotations

        return PIL.Image.open(self._task.get_frame(frame_index, quality="original"))
