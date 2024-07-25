# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import os
import pickle  # nosec
import shutil
import tempfile
import zipfile
import zlib
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Callable, Optional, Sequence, Tuple, Type

import cv2
import PIL.Image
import PIL.ImageOps
from django.conf import settings
from django.core.cache import caches
from rest_framework.exceptions import NotFound, ValidationError

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
    ImageDatasetManifestReader,
    Mpeg4ChunkWriter,
    Mpeg4CompressedChunkWriter,
    VideoDatasetManifestReader,
    ZipChunkWriter,
    ZipCompressedChunkWriter,
)
from cvat.apps.engine.mime_types import mimetypes
from cvat.apps.engine.utils import md5_hash, preload_images
from utils.dataset_manifest import ImageManifestManager

slogger = ServerLogManager(__name__)


DataWithMime = Tuple[io.BytesIO, str]
_CacheItem = Tuple[io.BytesIO, str, int]


class MediaCache:
    def __init__(self) -> None:
        self._cache = caches["media"]

        # TODO migrate keys (check if they will be removed)

    def get_checksum(self, value: bytes) -> int:
        return zlib.crc32(value)

    def _get_or_set_cache_item(
        self, key: str, create_callback: Callable[[], DataWithMime]
    ) -> DataWithMime:
        def create_item() -> _CacheItem:
            slogger.glob.info(f"Starting to prepare chunk: key {key}")
            item_data = create_callback()
            slogger.glob.info(f"Ending to prepare chunk: key {key}")

            if item_data[0]:
                item = (item_data[0], item_data[1], self.get_checksum(item_data[0].getbuffer()))
                self._cache.set(key, item)
            else:
                item = (item_data[0], item_data[1], None)

            return item

        slogger.glob.info(f"Starting to get chunk from cache: key {key}")
        try:
            item = self._cache.get(key)
        except pickle.UnpicklingError:
            slogger.glob.error(f"Unable to get item from cache: key {key}", exc_info=True)
            item = None
        slogger.glob.info(f"Ending to get chunk from cache: key {key}, is_cached {bool(item)}")

        if not item:
            item = create_item()
        else:
            # compare checksum
            item_data = item[0].getbuffer() if isinstance(item[0], io.BytesIO) else item[0]
            item_checksum = item[2] if len(item) == 3 else None
            if item_checksum != self.get_checksum(item_data):
                slogger.glob.info(f"Recreating cache item {key} due to checksum mismatch")
                item = create_item()

        return item[0], item[1]

    def _get(self, key: str) -> Optional[DataWithMime]:
        slogger.glob.info(f"Starting to get chunk from cache: key {key}")
        try:
            item = self._cache.get(key)
        except pickle.UnpicklingError:
            slogger.glob.error(f"Unable to get item from cache: key {key}", exc_info=True)
            item = None
        slogger.glob.info(f"Ending to get chunk from cache: key {key}, is_cached {bool(item)}")

        return item

    def get_segment_chunk(
        self, db_segment: models.Segment, chunk_number: int, *, quality: FrameQuality
    ) -> DataWithMime:
        return self._get_or_set_cache_item(
            key=f"segment_{db_segment.id}_{chunk_number}_{quality}",
            create_callback=lambda: self.prepare_segment_chunk(
                db_segment, chunk_number, quality=quality
            ),
        )

    def get_selective_job_chunk(
        self, db_job: models.Job, chunk_number: int, *, quality: FrameQuality
    ) -> DataWithMime:
        return self._get_or_set_cache_item(
            key=f"job_{db_job.id}_{chunk_number}_{quality}",
            create_callback=lambda: self.prepare_masked_range_segment_chunk(
                db_job.segment, chunk_number, quality=quality
            ),
        )

    def get_local_preview(self, db_data: models.Data, frame_number: int) -> DataWithMime:
        return self._get_or_set_cache_item(
            key=f"data_{db_data.id}_{frame_number}_preview",
            create_callback=lambda: self._prepare_local_preview(frame_number, db_data),
        )

    def get_cloud_preview(self, db_storage: models.CloudStorage) -> Optional[DataWithMime]:
        return self._get(f"cloudstorage_{db_storage.id}_preview")

    def get_or_set_cloud_preview(self, db_storage: models.CloudStorage) -> DataWithMime:
        return self._get_or_set_cache_item(
            f"cloudstorage_{db_storage.id}_preview",
            create_callback=lambda: self._prepare_cloud_preview(db_storage),
        )

    def get_frame_context_images(self, db_data: models.Data, frame_number: int) -> DataWithMime:
        return self._get_or_set_cache_item(
            key=f"context_image_{db_data.id}_{frame_number}",
            create_callback=lambda: self._prepare_context_image(db_data, frame_number),
        )

    def get_task_preview(self, db_task: models.Task) -> Optional[DataWithMime]:
        return self._get(f"task_{db_task.data_id}_preview")

    def get_segment_preview(self, db_segment: models.Segment) -> Optional[DataWithMime]:
        return self._get(f"segment_{db_segment.id}_preview")

    @contextmanager
    def _read_raw_frames(self, db_task: models.Task, frames: Sequence[int]):
        db_data = db_task.data

        media = []
        tmp_dir = None
        raw_data_dir = {
            models.StorageChoice.LOCAL: db_data.get_upload_dirname(),
            models.StorageChoice.SHARE: settings.SHARE_ROOT,
            models.StorageChoice.CLOUD_STORAGE: db_data.get_upload_dirname(),
        }[db_data.storage]

        dimension = db_task.dimension

        # TODO
        try:
            if hasattr(db_data, "video"):
                source_path = os.path.join(raw_data_dir, db_data.video.path)

                # TODO: refactor to allow non-manifest videos
                reader = VideoDatasetManifestReader(
                    manifest_path=db_data.get_manifest_path(),
                    source_path=source_path,
                    chunk_number=chunk_number,
                    chunk_size=db_data.chunk_size,
                    start=db_data.start_frame,
                    stop=db_data.stop_frame,
                    step=db_data.get_frame_step(),
                )
                for frame in reader:
                    media.append((frame, source_path, None))
            else:
                reader = ImageDatasetManifestReader(
                    manifest_path=db_data.get_manifest_path(),
                    chunk_number=chunk_number,
                    chunk_size=db_data.chunk_size,
                    start=db_data.start_frame,
                    stop=db_data.stop_frame,
                    step=db_data.get_frame_step(),
                )
                if db_data.storage == StorageChoice.CLOUD_STORAGE:
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

                    tmp_dir = tempfile.mkdtemp(prefix="cvat")
                    files_to_download = []
                    checksums = []
                    for item in reader:
                        file_name = f"{item['name']}{item['extension']}"
                        fs_filename = os.path.join(tmp_dir, file_name)

                        files_to_download.append(file_name)
                        checksums.append(item.get("checksum", None))
                        media.append((fs_filename, fs_filename, None))

                    cloud_storage_instance.bulk_download_to_dir(
                        files=files_to_download, upload_dir=tmp_dir
                    )
                    media = preload_images(media)

                    for checksum, (_, fs_filename, _) in zip(checksums, media):
                        if checksum and not md5_hash(fs_filename) == checksum:
                            slogger.cloud_storage[db_cloud_storage.id].warning(
                                "Hash sums of files {} do not match".format(file_name)
                            )
                else:
                    for item in reader:
                        source_path = os.path.join(
                            raw_data_dir, f"{item['name']}{item['extension']}"
                        )
                        media.append((source_path, source_path, None))
                    if dimension == models.DimensionType.DIM_2D:
                        media = preload_images(media)

            yield media
        finally:
            if db_data.storage == models.StorageChoice.CLOUD_STORAGE and tmp_dir is not None:
                shutil.rmtree(tmp_dir)

    def prepare_segment_chunk(
        self, db_segment: models.Segment, chunk_number: int, *, quality: FrameQuality
    ) -> DataWithMime:
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
        chunk_frames = db_segment.frame_set[
            chunk_size * chunk_number : chunk_number * (chunk_number + 1)
        ]

        writer_classes: dict[FrameQuality, Type[IChunkWriter]] = {
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

        image_quality = (
            100
            if writer_classes[quality] in [Mpeg4ChunkWriter, ZipChunkWriter]
            else db_data.image_quality
        )
        mime_type = (
            "video/mp4"
            if writer_classes[quality] in [Mpeg4ChunkWriter, Mpeg4CompressedChunkWriter]
            else "application/zip"
        )

        kwargs = {}
        if db_segment.task.dimension == models.DimensionType.DIM_3D:
            kwargs["dimension"] = models.DimensionType.DIM_3D
        writer = writer_classes[quality](image_quality, **kwargs)

        buff = io.BytesIO()
        with self._read_raw_frames(db_task, frames=chunk_frames) as images:
            writer.save_as_chunk(images, buff)

        buff.seek(0)
        return buff, mime_type

    def prepare_masked_range_segment_chunk(
        self, db_job: models.Job, quality, chunk_number: int
    ) -> DataWithMime:
        db_data = db_job.segment.task.data

        FrameProvider = self._get_frame_provider_class()
        frame_provider = FrameProvider(db_data, self._dimension)

        frame_set = db_job.segment.frame_set
        frame_step = db_data.get_frame_step()
        chunk_frames = []

        writer = ZipCompressedChunkWriter(db_data.image_quality, dimension=self._dimension)
        dummy_frame = io.BytesIO()
        PIL.Image.new("RGB", (1, 1)).save(dummy_frame, writer.IMAGE_EXT)

        if hasattr(db_data, "video"):
            frame_size = (db_data.video.width, db_data.video.height)
        else:
            frame_size = None

        for frame_idx in range(db_data.chunk_size):
            frame_idx = (
                db_data.start_frame + chunk_number * db_data.chunk_size + frame_idx * frame_step
            )
            if db_data.stop_frame < frame_idx:
                break

            frame_bytes = None

            if frame_idx in frame_set:
                frame_bytes = frame_provider.get_frame(frame_idx, quality=quality)[0]

                if frame_size is not None:
                    # Decoded video frames can have different size, restore the original one

                    frame = PIL.Image.open(frame_bytes)
                    if frame.size != frame_size:
                        frame = frame.resize(frame_size)

                    frame_bytes = io.BytesIO()
                    frame.save(frame_bytes, writer.IMAGE_EXT)
                    frame_bytes.seek(0)

            else:
                # Populate skipped frames with placeholder data,
                # this is required for video chunk decoding implementation in UI
                frame_bytes = io.BytesIO(dummy_frame.getvalue())

            if frame_bytes is not None:
                chunk_frames.append((frame_bytes, None, None))

        buff = io.BytesIO()
        writer.save_as_chunk(
            chunk_frames,
            buff,
            compress_frames=False,
            zip_compress_level=1,  # there are likely to be many skips in SPECIFIC_FRAMES segments
        )
        buff.seek(0)

        return buff, "application/zip"

    def prepare_segment_preview(self, db_segment: models.Segment) -> DataWithMime:
        if db_segment.task.data.cloud_storage:
            return self._prepare_cloud_segment_preview(db_segment)
        else:
            return self._prepare_local_segment_preview(db_segment)

    def _prepare_local_preview(self, db_data: models.Data, frame_number: int) -> DataWithMime:
        FrameProvider = self._get_frame_provider_class()
        frame_provider = FrameProvider(db_data, self._dimension)
        buff, mime_type = frame_provider.get_preview(frame_number)

        return buff, mime_type

    def _prepare_cloud_preview(self, db_storage):
        storage = db_storage_to_storage_instance(db_storage)
        if not db_storage.manifests.count():
            raise ValidationError("Cannot get the cloud storage preview. There is no manifest file")
        preview_path = None
        for manifest_model in db_storage.manifests.all():
            manifest_prefix = os.path.dirname(manifest_model.filename)
            full_manifest_path = os.path.join(
                db_storage.get_storage_dirname(), manifest_model.filename
            )
            if not os.path.exists(full_manifest_path) or datetime.fromtimestamp(
                os.path.getmtime(full_manifest_path), tz=timezone.utc
            ) < storage.get_file_last_modified(manifest_model.filename):
                storage.download_file(manifest_model.filename, full_manifest_path)
            manifest = ImageManifestManager(
                os.path.join(db_storage.get_storage_dirname(), manifest_model.filename),
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
        mime_type = mimetypes.guess_type(preview_path)[0]

        return buff, mime_type

    def prepare_context_images(
        self, db_data: models.Data, frame_number: int
    ) -> Optional[DataWithMime]:
        zip_buffer = io.BytesIO()
        try:
            image = models.Image.objects.get(data_id=db_data.id, frame=frame_number)
        except models.Image.DoesNotExist:
            return None

        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            if not image.related_files.count():
                return None, None
            common_path = os.path.commonpath(
                list(map(lambda x: str(x.path), image.related_files.all()))
            )
            for i in image.related_files.all():
                path = os.path.realpath(str(i.path))
                name = os.path.relpath(str(i.path), common_path)
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
    return image, PREVIEW_MIME
