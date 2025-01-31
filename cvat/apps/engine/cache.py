# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import os
import os.path
import pickle  # nosec
import tempfile
import time
import zipfile
import zlib
from collections.abc import Collection, Generator, Iterator, Sequence
from contextlib import ExitStack, closing
from datetime import datetime, timezone
from itertools import groupby, pairwise
from typing import Any, Callable, Optional, Union, overload

import attrs
import av
import cv2
import django_rq
import PIL.Image
import PIL.ImageOps
import rq
from django.conf import settings
from django.core.cache import caches
from django.db import models as django_models
from django.utils import timezone as django_tz
from redis.exceptions import LockError
from rest_framework.exceptions import NotFound, ValidationError
from rq.job import JobStatus as RQJobStatus

from cvat.apps.engine import models
from cvat.apps.engine.cloud_provider import (
    Credentials,
    db_storage_to_storage_instance,
    get_cloud_storage_instance,
)
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.media_extractors import (
    FrameQuality,
    IChunkWriter,
    ImageReaderWithManifest,
    Mpeg4ChunkWriter,
    Mpeg4CompressedChunkWriter,
    VideoReader,
    VideoReaderWithManifest,
    ZipChunkWriter,
    ZipCompressedChunkWriter,
    load_image,
)
from cvat.apps.engine.rq_job_handler import RQJobMetaField
from cvat.apps.engine.utils import (
    CvatChunkTimestampMismatchError,
    format_list,
    get_rq_lock_for_job,
    md5_hash,
)
from utils.dataset_manifest import ImageManifestManager

slogger = ServerLogManager(__name__)


DataWithMime = tuple[io.BytesIO, str]
_CacheItem = tuple[io.BytesIO, str, int, Union[datetime, None]]


def enqueue_create_chunk_job(
    queue: rq.Queue,
    rq_job_id: str,
    create_callback: Callback,
    *,
    rq_job_result_ttl: int = 60,
    rq_job_failure_ttl: int = 3600 * 24 * 14,  # 2 weeks
) -> rq.job.Job:
    try:
        with get_rq_lock_for_job(queue, rq_job_id):
            rq_job = queue.fetch_job(rq_job_id)

            if not rq_job or (
                # Enqueue the job if the chunk was deleted but the RQ job still exists.
                # This can happen in cases involving jobs with honeypots and
                # if the job wasn't collected by the requesting process for any reason.
                rq_job.get_status(refresh=False)
                in {RQJobStatus.FINISHED, RQJobStatus.FAILED, RQJobStatus.CANCELED}
            ):
                rq_job = queue.enqueue(
                    create_callback,
                    job_id=rq_job_id,
                    result_ttl=rq_job_result_ttl,
                    failure_ttl=rq_job_failure_ttl,
                )
    except LockError:
        raise TimeoutError(f"Cannot acquire lock for {rq_job_id}")

    return rq_job


def wait_for_rq_job(rq_job: rq.job.Job):
    retries = settings.CVAT_CHUNK_CREATE_TIMEOUT // settings.CVAT_CHUNK_CREATE_CHECK_INTERVAL or 1
    while retries > 0:
        job_status = rq_job.get_status()
        if job_status in ("finished",):
            return
        elif job_status in ("failed",):
            job_meta = rq_job.get_meta()
            exc_type = job_meta.get(RQJobMetaField.EXCEPTION_TYPE, Exception)
            exc_args = job_meta.get(RQJobMetaField.EXCEPTION_ARGS, ("Cannot create chunk",))
            raise exc_type(*exc_args)

        time.sleep(settings.CVAT_CHUNK_CREATE_CHECK_INTERVAL)
        retries -= 1

    raise TimeoutError(f"Chunk processing takes too long {rq_job.id}")


def _is_run_inside_rq() -> bool:
    return rq.get_current_job() is not None


def _convert_args_for_callback(func_args: list[Any]) -> list[Any]:
    result = []
    for func_arg in func_args:
        if _is_run_inside_rq():
            result.append(func_arg)
        else:
            if isinstance(
                func_arg,
                django_models.Model,
            ):
                result.append(func_arg.id)
            elif isinstance(func_arg, list):
                result.append(_convert_args_for_callback(func_arg))
            else:
                result.append(func_arg)

    return result


@attrs.frozen
class Callback:
    _callable: Callable[..., DataWithMime] = attrs.field(
        validator=attrs.validators.is_callable(),
    )
    _args: list[Any] = attrs.field(
        factory=list,
        validator=attrs.validators.instance_of(list),
        converter=_convert_args_for_callback,
    )
    _kwargs: dict[str, Union[bool, int, float, str, None]] = attrs.field(
        factory=dict,
        validator=attrs.validators.deep_mapping(
            key_validator=attrs.validators.instance_of(str),
            value_validator=attrs.validators.instance_of((bool, int, float, str, type(None))),
            mapping_validator=attrs.validators.instance_of(dict),
        ),
    )

    def __call__(self) -> DataWithMime:
        return self._callable(*self._args, **self._kwargs)


class MediaCache:
    _QUEUE_NAME = settings.CVAT_QUEUES.CHUNKS.value
    _QUEUE_JOB_PREFIX_TASK = "chunks:prepare-item-"
    _CACHE_NAME = "media"
    _PREVIEW_TTL = settings.CVAT_PREVIEW_CACHE_TTL

    @staticmethod
    def _cache():
        return caches[MediaCache._CACHE_NAME]

    @staticmethod
    def _get_checksum(value: bytes) -> int:
        return zlib.crc32(value)

    def _get_or_set_cache_item(
        self,
        key: str,
        create_callback: Callback,
        *,
        cache_item_ttl: Optional[int] = None,
    ) -> _CacheItem:
        item = self._get_cache_item(key)
        if item:
            return item

        return self._create_cache_item(
            key,
            create_callback,
            cache_item_ttl=cache_item_ttl,
        )

    @classmethod
    def _get_queue(cls) -> rq.Queue:
        return django_rq.get_queue(cls._QUEUE_NAME)

    @classmethod
    def _make_queue_job_id(cls, key: str) -> str:
        return f"{cls._QUEUE_JOB_PREFIX_TASK}{key}"

    @staticmethod
    def _drop_return_value(func: Callable[..., DataWithMime], *args: Any, **kwargs: Any):
        func(*args, **kwargs)

    @classmethod
    def _create_and_set_cache_item(
        cls,
        key: str,
        create_callback: Callback,
        cache_item_ttl: Optional[int] = None,
    ) -> DataWithMime:
        timestamp = django_tz.now()
        item_data = create_callback()
        item_data_bytes = item_data[0].getvalue()
        item = (item_data[0], item_data[1], cls._get_checksum(item_data_bytes), timestamp)

        # allow empty data to be set in cache to prevent
        # future rq jobs from being enqueued to prepare the item
        cache = cls._cache()
        with get_rq_lock_for_job(
            cls._get_queue(),
            key,
        ):
            cached_item = cache.get(key)
            if cached_item is not None and timestamp <= cached_item[3]:
                item = cached_item
            else:
                cache.set(key, item, timeout=cache_item_ttl or cache.default_timeout)

        return item

    def _create_cache_item(
        self,
        key: str,
        create_callback: Callback,
        *,
        cache_item_ttl: Optional[int] = None,
    ) -> _CacheItem:
        slogger.glob.info(f"Starting to prepare chunk: key {key}")
        if _is_run_inside_rq():
            item = self._create_and_set_cache_item(
                key,
                create_callback,
                cache_item_ttl=cache_item_ttl,
            )
        else:
            rq_job = enqueue_create_chunk_job(
                queue=self._get_queue(),
                rq_job_id=self._make_queue_job_id(key),
                create_callback=Callback(
                    callable=self._drop_return_value,
                    args=[
                        self._create_and_set_cache_item,
                        key,
                        create_callback,
                    ],
                    kwargs={
                        "cache_item_ttl": cache_item_ttl,
                    },
                ),
            )
            wait_for_rq_job(rq_job)
            item = self._get_cache_item(key)

        slogger.glob.info(f"Ending to prepare chunk: key {key}")

        return item

    def _delete_cache_item(self, key: str):
        self._cache().delete(key)
        slogger.glob.info(f"Removed the cache key {key}")

    def _bulk_delete_cache_items(self, keys: Sequence[str]):
        self._cache().delete_many(keys)
        slogger.glob.info(f"Removed the cache keys {format_list(keys)}")

    def _get_cache_item(self, key: str) -> Optional[_CacheItem]:
        try:
            item = self._cache().get(key)
        except pickle.UnpicklingError:
            slogger.glob.error(f"Unable to get item from cache: key {key}", exc_info=True)
            item = None

        if not item:
            return None

        item_data = item[0].getbuffer() if isinstance(item[0], io.BytesIO) else item[0]
        item_checksum = item[2] if len(item) == 4 else None
        if item_checksum != self._get_checksum(item_data):
            slogger.glob.info(f"Cache item {key} checksum mismatch")
            return None

        return item

    def _validate_cache_item_timestamp(
        self, item: _CacheItem, expected_timestamp: datetime
    ) -> _CacheItem:
        if item[3] < expected_timestamp:
            raise CvatChunkTimestampMismatchError(
                f"Cache timestamp mismatch. Item_ts: {item[3]}, expected_ts: {expected_timestamp}"
            )

        return item

    @classmethod
    def _has_key(cls, key: str) -> bool:
        return cls._cache().has_key(key)

    @staticmethod
    def _make_cache_key_prefix(
        obj: Union[models.Task, models.Segment, models.Job, models.CloudStorage],
    ) -> str:
        if isinstance(obj, models.Task):
            return f"task_{obj.id}"
        elif isinstance(obj, models.Segment):
            return f"segment_{obj.id}"
        elif isinstance(obj, models.Job):
            return f"job_{obj.id}"
        elif isinstance(obj, models.CloudStorage):
            return f"cloudstorage_{obj.id}"
        else:
            assert False, f"Unexpected object type {type(obj)}"

    @classmethod
    def _make_chunk_key(
        cls,
        db_obj: Union[models.Task, models.Segment, models.Job],
        chunk_number: int,
        *,
        quality: FrameQuality,
    ) -> str:
        return f"{cls._make_cache_key_prefix(db_obj)}_chunk_{chunk_number}_{quality}"

    def _make_preview_key(self, db_obj: Union[models.Segment, models.CloudStorage]) -> str:
        return f"{self._make_cache_key_prefix(db_obj)}_preview"

    def _make_segment_task_chunk_key(
        self,
        db_obj: models.Segment,
        chunk_number: int,
        *,
        quality: FrameQuality,
    ) -> str:
        return f"{self._make_cache_key_prefix(db_obj)}_task_chunk_{chunk_number}_{quality}"

    def _make_frame_context_images_chunk_key(self, db_data: models.Data, frame_number: int) -> str:
        return f"context_images_{db_data.id}_{frame_number}"

    @overload
    def _to_data_with_mime(self, cache_item: _CacheItem) -> DataWithMime: ...

    @overload
    def _to_data_with_mime(
        self, cache_item: Optional[_CacheItem], *, allow_none: bool = False
    ) -> Optional[DataWithMime]: ...

    def _to_data_with_mime(
        self, cache_item: Optional[_CacheItem], *, allow_none: bool = False
    ) -> Optional[DataWithMime]:
        if not cache_item:
            if allow_none:
                return None

            raise ValueError("A cache item is not allowed to be None")

        return cache_item[:2]

    def get_or_set_segment_chunk(
        self, db_segment: models.Segment, chunk_number: int, *, quality: FrameQuality
    ) -> DataWithMime:

        item = self._get_or_set_cache_item(
            self._make_chunk_key(db_segment, chunk_number, quality=quality),
            Callback(
                callable=self.prepare_segment_chunk,
                args=[db_segment, chunk_number],
                kwargs={"quality": quality},
            ),
        )
        db_segment.refresh_from_db(fields=["chunks_updated_date"])

        return self._to_data_with_mime(
            self._validate_cache_item_timestamp(item, db_segment.chunks_updated_date)
        )

    def get_task_chunk(
        self, db_task: models.Task, chunk_number: int, *, quality: FrameQuality
    ) -> Optional[DataWithMime]:
        return self._to_data_with_mime(
            self._get_cache_item(
                key=self._make_chunk_key(db_task, chunk_number, quality=quality),
            ),
            allow_none=True,
        )

    def get_or_set_task_chunk(
        self,
        db_task: models.Task,
        chunk_number: int,
        set_callback: Callback,
        *,
        quality: FrameQuality,
    ) -> DataWithMime:

        item = self._get_or_set_cache_item(
            self._make_chunk_key(db_task, chunk_number, quality=quality),
            set_callback,
        )
        db_task.refresh_from_db(fields=["segment_set"])

        return self._to_data_with_mime(
            self._validate_cache_item_timestamp(item, db_task.get_chunks_updated_date())
        )

    def get_segment_task_chunk(
        self, db_segment: models.Segment, chunk_number: int, *, quality: FrameQuality
    ) -> Optional[DataWithMime]:
        return self._to_data_with_mime(
            self._get_cache_item(
                key=self._make_segment_task_chunk_key(db_segment, chunk_number, quality=quality),
            ),
            allow_none=True,
        )

    def get_or_set_segment_task_chunk(
        self,
        db_segment: models.Segment,
        chunk_number: int,
        *,
        quality: FrameQuality,
        set_callback: Callback,
    ) -> DataWithMime:

        item = self._get_or_set_cache_item(
            self._make_segment_task_chunk_key(db_segment, chunk_number, quality=quality),
            set_callback,
        )
        db_segment.refresh_from_db(fields=["chunks_updated_date"])

        return self._to_data_with_mime(
            self._validate_cache_item_timestamp(item, db_segment.chunks_updated_date),
        )

    def get_or_set_selective_job_chunk(
        self, db_job: models.Job, chunk_number: int, *, quality: FrameQuality
    ) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                self._make_chunk_key(db_job, chunk_number, quality=quality),
                Callback(
                    callable=self.prepare_masked_range_segment_chunk,
                    args=[db_job.segment, chunk_number],
                    kwargs={
                        "quality": quality,
                    },
                ),
            )
        )

    def get_or_set_segment_preview(self, db_segment: models.Segment) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                self._make_preview_key(db_segment),
                Callback(
                    callable=self._prepare_segment_preview,
                    args=[db_segment],
                ),
                cache_item_ttl=self._PREVIEW_TTL,
            )
        )

    def remove_segment_chunk(
        self, db_segment: models.Segment, chunk_number: str, *, quality: str
    ) -> None:
        self._delete_cache_item(
            self._make_chunk_key(db_segment, chunk_number=chunk_number, quality=quality)
        )

    def remove_context_images_chunk(self, db_data: models.Data, frame_number: str) -> None:
        self._delete_cache_item(
            self._make_frame_context_images_chunk_key(db_data, frame_number=frame_number)
        )

    def remove_segments_chunks(self, params: Sequence[dict[str, Any]]) -> None:
        """
        Removes several segment chunks from the cache.

        The function expects a sequence of remove_segment_chunk() parameters as dicts.
        """
        # TODO: add a version of this function
        # that removes related cache elements as well (context images, previews, ...)
        # to provide encapsulation

        # TODO: add a generic bulk cleanup function for different objects, including related ones
        # (likely a bulk key aggregator should be used inside to reduce requests count)

        keys_to_remove = []
        for item_params in params:
            db_obj = item_params.pop("db_segment")
            keys_to_remove.append(self._make_chunk_key(db_obj, **item_params))

        self._bulk_delete_cache_items(keys_to_remove)

    def remove_context_images_chunks(self, params: Sequence[dict[str, Any]]) -> None:
        """
        Removes several context image chunks from the cache.

        The function expects a sequence of remove_context_images_chunk() parameters as dicts.
        """

        keys_to_remove = []
        for item_params in params:
            db_obj = item_params.pop("db_data")
            keys_to_remove.append(self._make_frame_context_images_chunk_key(db_obj, **item_params))

        self._bulk_delete_cache_items(keys_to_remove)

    def get_cloud_preview(self, db_storage: models.CloudStorage) -> Optional[DataWithMime]:
        return self._to_data_with_mime(
            self._get_cache_item(self._make_preview_key(db_storage)), allow_none=True
        )

    def get_or_set_cloud_preview(self, db_storage: models.CloudStorage) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                self._make_preview_key(db_storage),
                Callback(
                    callable=self._prepare_cloud_preview,
                    args=[db_storage],
                ),
                cache_item_ttl=self._PREVIEW_TTL,
            )
        )

    def get_or_set_frame_context_images_chunk(
        self, db_data: models.Data, frame_number: int
    ) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                self._make_frame_context_images_chunk_key(db_data, frame_number),
                Callback(
                    callable=self.prepare_context_images_chunk,
                    args=[db_data, frame_number],
                ),
            )
        )

    @staticmethod
    def _read_raw_images(
        db_task: models.Task,
        frame_ids: Sequence[int],
        *,
        manifest_path: str,
    ):
        db_data = db_task.data

        if os.path.isfile(manifest_path) and db_data.storage == models.StorageChoice.CLOUD_STORAGE:
            reader = ImageReaderWithManifest(manifest_path)
            with ExitStack() as es:
                db_cloud_storage = db_data.cloud_storage
                assert db_cloud_storage, "Cloud storage instance was deleted"
                credentials = Credentials()
                credentials.convert_from_db(
                    {
                        "type": db_cloud_storage.credentials_type,
                        "value": db_cloud_storage.credentials,
                    }
                )
                details = {
                    "resource": db_cloud_storage.resource,
                    "credentials": credentials,
                    "specific_attributes": db_cloud_storage.get_specific_attributes(),
                }
                cloud_storage_instance = get_cloud_storage_instance(
                    cloud_provider=db_cloud_storage.provider_type, **details
                )

                tmp_dir = es.enter_context(tempfile.TemporaryDirectory(prefix="cvat"))
                files_to_download = []
                checksums = []
                media = []
                for item in reader.iterate_frames(frame_ids):
                    file_name = f"{item['name']}{item['extension']}"
                    fs_filename = os.path.join(tmp_dir, file_name)

                    files_to_download.append(file_name)
                    checksums.append(item.get("checksum", None))
                    media.append((fs_filename, fs_filename, None))

                cloud_storage_instance.bulk_download_to_dir(
                    files=files_to_download, upload_dir=tmp_dir
                )

                for checksum, media_item in zip(checksums, media):
                    if checksum and not md5_hash(media_item[1]) == checksum:
                        slogger.cloud_storage[db_cloud_storage.id].warning(
                            "Hash sums of files {} do not match".format(file_name)
                        )
                    yield load_image(media_item)
        else:
            requested_frame_iter = iter(frame_ids)
            next_requested_frame_id = next(requested_frame_iter, None)
            if next_requested_frame_id is None:
                return

            # TODO: find a way to use prefetched results, if provided
            db_images = (
                db_data.images.order_by("frame")
                .filter(frame__gte=frame_ids[0], frame__lte=frame_ids[-1])
                .values_list("frame", "path")
                .all()
            )

            raw_data_dir = db_data.get_raw_data_dirname()
            media = []
            for frame_id, frame_path in db_images:
                if frame_id == next_requested_frame_id:
                    source_path = os.path.join(raw_data_dir, frame_path)
                    media.append((source_path, source_path, None))

                    next_requested_frame_id = next(requested_frame_iter, None)

                if next_requested_frame_id is None:
                    break

            assert next_requested_frame_id is None

            if db_task.dimension == models.DimensionType.DIM_2D:
                media = map(load_image, media)

            yield from media

    @staticmethod
    def _read_raw_frames(
        db_task: Union[models.Task, int], frame_ids: Sequence[int]
    ) -> Generator[tuple[Union[av.VideoFrame, PIL.Image.Image], str, str], None, None]:
        if isinstance(db_task, int):
            db_task = models.Task.objects.get(pk=db_task)

        for prev_frame, cur_frame in pairwise(frame_ids):
            assert (
                prev_frame <= cur_frame
            ), f"Requested frame ids must be sorted, got a ({prev_frame}, {cur_frame}) pair"

        db_data = db_task.data

        manifest_path = db_data.get_manifest_path()

        if hasattr(db_data, "video"):
            source_path = os.path.join(db_data.get_raw_data_dirname(), db_data.video.path)

            reader = VideoReaderWithManifest(
                manifest_path=manifest_path,
                source_path=source_path,
                allow_threading=False,
            )
            if not os.path.isfile(manifest_path):
                try:
                    reader.manifest.link(source_path, force=True)
                    reader.manifest.create()
                except Exception as e:
                    slogger.task[db_task.id].warning(
                        f"Failed to create video manifest: {e}", exc_info=True
                    )
                    reader = None

            if reader:
                for frame in reader.iterate_frames(frame_filter=frame_ids):
                    yield (frame, source_path, None)
            else:
                reader = VideoReader([source_path], allow_threading=False)

                for frame_tuple in reader.iterate_frames(frame_filter=frame_ids):
                    yield frame_tuple
        else:
            yield from MediaCache._read_raw_images(db_task, frame_ids, manifest_path=manifest_path)

    def prepare_segment_chunk(
        self, db_segment: Union[models.Segment, int], chunk_number: int, *, quality: FrameQuality
    ) -> DataWithMime:
        if isinstance(db_segment, int):
            db_segment = models.Segment.objects.get(pk=db_segment)

        if db_segment.type == models.SegmentType.RANGE:
            return self.prepare_range_segment_chunk(db_segment, chunk_number, quality=quality)
        elif db_segment.type == models.SegmentType.SPECIFIC_FRAMES:
            return self.prepare_masked_range_segment_chunk(
                db_segment, chunk_number, quality=quality
            )
        else:
            assert False, f"Unknown segment type {db_segment.type}"

    def prepare_range_segment_chunk(
        self, db_segment: models.Segment, chunk_number: int, *, quality: FrameQuality
    ) -> DataWithMime:
        db_task = db_segment.task
        db_data = db_task.data

        chunk_size = db_data.chunk_size
        chunk_frame_ids = list(db_segment.frame_set)[
            chunk_size * chunk_number : chunk_size * (chunk_number + 1)
        ]

        return self.prepare_custom_range_segment_chunk(db_task, chunk_frame_ids, quality=quality)

    @classmethod
    def prepare_custom_range_segment_chunk(
        cls, db_task: models.Task, frame_ids: Sequence[int], *, quality: FrameQuality
    ) -> DataWithMime:
        with closing(cls._read_raw_frames(db_task, frame_ids=frame_ids)) as frame_iter:
            return prepare_chunk(frame_iter, quality=quality, db_task=db_task)

    def prepare_masked_range_segment_chunk(
        self, db_segment: models.Segment, chunk_number: int, *, quality: FrameQuality
    ) -> DataWithMime:
        db_task = db_segment.task
        db_data = db_task.data

        chunk_size = db_data.chunk_size
        chunk_frame_ids = sorted(db_segment.frame_set)[
            chunk_size * chunk_number : chunk_size * (chunk_number + 1)
        ]

        return self.prepare_custom_masked_range_segment_chunk(
            db_task, chunk_frame_ids, chunk_number, quality=quality
        )

    @classmethod
    def prepare_custom_masked_range_segment_chunk(
        cls,
        db_task: Union[models.Task, int],
        frame_ids: Collection[int],
        chunk_number: int,
        *,
        quality: FrameQuality,
        insert_placeholders: bool = False,
    ) -> DataWithMime:
        if isinstance(db_task, int):
            db_task = models.Task.objects.get(pk=db_task)

        db_data = db_task.data

        frame_step = db_data.get_frame_step()

        image_quality = 100 if quality == FrameQuality.ORIGINAL else db_data.image_quality
        writer = ZipCompressedChunkWriter(image_quality, dimension=db_task.dimension)

        dummy_frame = io.BytesIO()
        PIL.Image.new("RGB", (1, 1)).save(dummy_frame, writer.IMAGE_EXT)

        # Optimize frame access if all the required frames are already cached
        # Otherwise we might need to download files.
        # This is not needed for video tasks, as it will reduce performance,
        # because of reading multiple files (chunks)
        from cvat.apps.engine.frame_provider import FrameOutputType, make_frame_provider

        task_frame_provider = make_frame_provider(db_task)

        use_cached_data = False
        if db_task.mode != "interpolation":
            required_frame_set = set(frame_ids)
            available_chunks = []
            for db_segment in db_task.segment_set.filter(type=models.SegmentType.RANGE).all():
                segment_frame_provider = make_frame_provider(db_segment)

                for i, chunk_frames in groupby(
                    sorted(required_frame_set.intersection(db_segment.frame_set)),
                    key=lambda abs_frame: (
                        segment_frame_provider.validate_frame_number(
                            task_frame_provider.get_rel_frame_number(abs_frame)
                        )[1]
                    ),
                ):
                    if not list(chunk_frames):
                        continue

                    chunk_available = cls._has_key(
                        cls._make_chunk_key(db_segment, i, quality=quality)
                    )
                    available_chunks.append(chunk_available)

            use_cached_data = bool(available_chunks) and all(available_chunks)

        if hasattr(db_data, "video"):
            frame_size = (db_data.video.width, db_data.video.height)
        else:
            frame_size = None

        def get_frames():
            with ExitStack() as es:
                es.callback(task_frame_provider.unload)

                if insert_placeholders:
                    frame_range = (
                        (
                            db_data.start_frame
                            + (chunk_number * db_data.chunk_size + chunk_frame_idx) * frame_step
                        )
                        for chunk_frame_idx in range(db_data.chunk_size)
                    )
                else:
                    frame_range = frame_ids

                if not use_cached_data:
                    frames_gen = cls._read_raw_frames(db_task, frame_ids)
                    frames_iter = iter(es.enter_context(closing(frames_gen)))

                for abs_frame_idx in frame_range:
                    if db_data.stop_frame < abs_frame_idx:
                        break

                    if abs_frame_idx in frame_ids:
                        if use_cached_data:
                            frame_data = task_frame_provider.get_frame(
                                task_frame_provider.get_rel_frame_number(abs_frame_idx),
                                quality=quality,
                                out_type=FrameOutputType.BUFFER,
                            )
                            frame = frame_data.data
                        else:
                            frame, _, _ = next(frames_iter)

                        if hasattr(db_data, "video"):
                            # Decoded video frames can have different size, restore the original one

                            if isinstance(frame, av.VideoFrame):
                                frame = frame.to_image()
                            else:
                                frame = PIL.Image.open(frame)

                            if frame.size != frame_size:
                                frame = frame.resize(frame_size)
                    else:
                        # Populate skipped frames with placeholder data,
                        # this is required for video chunk decoding implementation in UI
                        frame = io.BytesIO(dummy_frame.getvalue())

                    yield (frame, None, None)

        buff = io.BytesIO()
        with closing(get_frames()) as frame_iter:
            writer.save_as_chunk(
                frame_iter,
                buff,
                zip_compress_level=1,
                # there are likely to be many skips with repeated placeholder frames
                # in SPECIFIC_FRAMES segments, it makes sense to compress the archive
            )

        buff.seek(0)
        return buff, get_chunk_mime_type_for_writer(writer)

    def _prepare_segment_preview(self, db_segment: Union[models.Segment, int]) -> DataWithMime:
        if isinstance(db_segment, int):
            db_segment = models.Segment.objects.get(pk=db_segment)

        if db_segment.task.dimension == models.DimensionType.DIM_3D:
            # TODO
            preview = PIL.Image.open(
                os.path.join(os.path.dirname(__file__), "assets/3d_preview.jpeg")
            )
        else:
            from cvat.apps.engine.frame_provider import (  # avoid circular import
                FrameOutputType,
                make_frame_provider,
            )

            task_frame_provider = make_frame_provider(db_segment.task)
            segment_frame_provider = make_frame_provider(db_segment)
            preview = segment_frame_provider.get_frame(
                task_frame_provider.get_rel_frame_number(min(db_segment.frame_set)),
                quality=FrameQuality.COMPRESSED,
                out_type=FrameOutputType.PIL,
            ).data

        return prepare_preview_image(preview)

    def _prepare_cloud_preview(self, db_storage: Union[models.CloudStorage, int]) -> DataWithMime:
        if isinstance(db_storage, int):
            db_storage = models.CloudStorage.objects.get(pk=db_storage)

        storage = db_storage_to_storage_instance(db_storage)
        if not db_storage.manifests.count():
            raise ValidationError("Cannot get the cloud storage preview. There is no manifest file")

        preview_path = None
        for db_manifest in db_storage.manifests.all():
            manifest_prefix = os.path.dirname(db_manifest.filename)

            full_manifest_path = os.path.join(
                db_storage.get_storage_dirname(), db_manifest.filename
            )
            if not os.path.exists(full_manifest_path) or datetime.fromtimestamp(
                os.path.getmtime(full_manifest_path), tz=timezone.utc
            ) < storage.get_file_last_modified(db_manifest.filename):
                storage.download_file(db_manifest.filename, full_manifest_path)

            manifest = ImageManifestManager(
                os.path.join(db_storage.get_storage_dirname(), db_manifest.filename),
                db_storage.get_storage_dirname(),
            )
            # need to update index
            manifest.set_index()
            if not len(manifest):
                continue

            preview_info = manifest[0]
            preview_filename = "".join([preview_info["name"], preview_info["extension"]])
            preview_path = os.path.join(manifest_prefix, preview_filename)
            break

        if not preview_path:
            msg = "Cloud storage {} does not contain any images".format(db_storage.pk)
            slogger.cloud_storage[db_storage.pk].info(msg)
            raise NotFound(msg)

        buff = storage.download_fileobj(preview_path)
        image = PIL.Image.open(buff)
        return prepare_preview_image(image)

    def prepare_context_images_chunk(
        self, db_data: Union[models.Data, int], frame_number: int
    ) -> DataWithMime:
        if isinstance(db_data, int):
            db_data = models.Data.objects.get(pk=db_data)

        zip_buffer = io.BytesIO()

        related_images = db_data.related_files.filter(images__frame=frame_number).all()
        if not related_images:
            return zip_buffer, ""

        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            common_path = os.path.commonpath(list(map(lambda x: str(x.path), related_images)))
            for related_image in related_images:
                path = os.path.realpath(str(related_image.path))
                name = os.path.relpath(str(related_image.path), common_path)
                image = cv2.imread(path)
                success, result = cv2.imencode(".JPEG", image)
                if not success:
                    raise Exception('Failed to encode image to ".jpeg" format')
                zip_file.writestr(f"{name}.jpg", result.tobytes())

        zip_buffer.seek(0)
        mime_type = "application/zip"
        return zip_buffer, mime_type


def prepare_preview_image(image: PIL.Image.Image) -> DataWithMime:
    PREVIEW_SIZE = (256, 256)
    PREVIEW_MIME = "image/jpeg"

    image = PIL.ImageOps.exif_transpose(image)
    image.thumbnail(PREVIEW_SIZE)

    output_buf = io.BytesIO()
    image.convert("RGB").save(output_buf, format="JPEG")
    return output_buf, PREVIEW_MIME


def prepare_chunk(
    task_chunk_frames: Iterator[tuple[Any, str, int]],
    *,
    quality: FrameQuality,
    db_task: models.Task,
    dump_unchanged: bool = False,
) -> DataWithMime:
    # TODO: refactor all chunk building into another class

    db_data = db_task.data

    writer_classes: dict[FrameQuality, type[IChunkWriter]] = {
        FrameQuality.COMPRESSED: (
            Mpeg4CompressedChunkWriter
            if db_data.compressed_chunk_type == models.DataChoice.VIDEO
            else ZipCompressedChunkWriter
        ),
        FrameQuality.ORIGINAL: (
            Mpeg4ChunkWriter
            if db_data.original_chunk_type == models.DataChoice.VIDEO
            else ZipChunkWriter
        ),
    }

    writer_class = writer_classes[quality]

    image_quality = 100 if quality == FrameQuality.ORIGINAL else db_data.image_quality

    writer_kwargs = {}
    if db_task.dimension == models.DimensionType.DIM_3D:
        writer_kwargs["dimension"] = models.DimensionType.DIM_3D
    merged_chunk_writer = writer_class(image_quality, **writer_kwargs)

    writer_kwargs = {}
    if dump_unchanged and isinstance(merged_chunk_writer, ZipCompressedChunkWriter):
        writer_kwargs = dict(compress_frames=False, zip_compress_level=1)

    buffer = io.BytesIO()
    merged_chunk_writer.save_as_chunk(task_chunk_frames, buffer, **writer_kwargs)

    buffer.seek(0)
    return buffer, get_chunk_mime_type_for_writer(writer_class)


def get_chunk_mime_type_for_writer(writer: Union[IChunkWriter, type[IChunkWriter]]) -> str:
    if isinstance(writer, IChunkWriter):
        writer_class = type(writer)
    else:
        writer_class = writer

    if issubclass(writer_class, ZipChunkWriter):
        return "application/zip"
    elif issubclass(writer_class, Mpeg4ChunkWriter):
        return "video/mp4"
    else:
        assert False, f"Unknown chunk writer class {writer_class}"
