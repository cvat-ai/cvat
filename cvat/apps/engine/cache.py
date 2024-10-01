# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import os
import os.path
import pickle  # nosec
import tempfile
import zipfile
import zlib
from contextlib import ExitStack, closing
from datetime import datetime, timezone
from itertools import groupby, pairwise
from typing import (
    Any,
    Callable,
    Collection,
    Generator,
    Iterator,
    Optional,
    Sequence,
    Tuple,
    Type,
    Union,
    overload,
)

import av
import cv2
import PIL.Image
import PIL.ImageOps
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
    ImageReaderWithManifest,
    Mpeg4ChunkWriter,
    Mpeg4CompressedChunkWriter,
    VideoReader,
    VideoReaderWithManifest,
    ZipChunkWriter,
    ZipCompressedChunkWriter,
)
from cvat.apps.engine.utils import md5_hash, preload_images
from utils.dataset_manifest import ImageManifestManager

slogger = ServerLogManager(__name__)


DataWithMime = Tuple[io.BytesIO, str]
_CacheItem = Tuple[io.BytesIO, str, int]


class MediaCache:
    def __init__(self) -> None:
        self._cache = caches["media"]

    def _get_checksum(self, value: bytes) -> int:
        return zlib.crc32(value)

    def _get_or_set_cache_item(
        self, key: str, create_callback: Callable[[], DataWithMime]
    ) -> _CacheItem:
        def create_item() -> _CacheItem:
            slogger.glob.info(f"Starting to prepare chunk: key {key}")
            item_data = create_callback()
            slogger.glob.info(f"Ending to prepare chunk: key {key}")

            item_data_bytes = item_data[0].getvalue()
            item = (item_data[0], item_data[1], self._get_checksum(item_data_bytes))
            if item_data_bytes:
                self._cache.set(key, item)

            return item

        item = self._get_cache_item(key)
        if not item:
            item = create_item()
        else:
            # compare checksum
            item_data = item[0].getbuffer() if isinstance(item[0], io.BytesIO) else item[0]
            item_checksum = item[2] if len(item) == 3 else None
            if item_checksum != self._get_checksum(item_data):
                slogger.glob.info(f"Recreating cache item {key} due to checksum mismatch")
                item = create_item()

        return item

    def _delete_cache_item(self, key: str):
        try:
            self._cache.delete(key)
            slogger.glob.info(f"Removed chunk from the cache: key {key}")
        except pickle.UnpicklingError:
            slogger.glob.error(f"Failed to remove item from the cache: key {key}", exc_info=True)

    def _get_cache_item(self, key: str) -> Optional[_CacheItem]:
        slogger.glob.info(f"Starting to get chunk from cache: key {key}")
        try:
            item = self._cache.get(key)
        except pickle.UnpicklingError:
            slogger.glob.error(f"Unable to get item from cache: key {key}", exc_info=True)
            item = None
        slogger.glob.info(f"Ending to get chunk from cache: key {key}, is_cached {bool(item)}")

        return item

    def _has_key(self, key: str) -> bool:
        return self._cache.has_key(key)

    def _make_cache_key_prefix(
        self, obj: Union[models.Task, models.Segment, models.Job, models.CloudStorage]
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

    def _make_chunk_key(
        self,
        db_obj: Union[models.Task, models.Segment, models.Job],
        chunk_number: int,
        *,
        quality: FrameQuality,
    ) -> str:
        return f"{self._make_cache_key_prefix(db_obj)}_chunk_{chunk_number}_{quality}"

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

    def _make_context_image_preview_key(self, db_data: models.Data, frame_number: int) -> str:
        return f"context_image_{db_data.id}_{frame_number}_preview"

    @overload
    def _to_data_with_mime(self, cache_item: _CacheItem) -> DataWithMime: ...

    @overload
    def _to_data_with_mime(self, cache_item: Optional[_CacheItem]) -> Optional[DataWithMime]: ...

    def _to_data_with_mime(self, cache_item: Optional[_CacheItem]) -> Optional[DataWithMime]:
        if not cache_item:
            return None

        return cache_item[:2]

    def get_or_set_segment_chunk(
        self, db_segment: models.Segment, chunk_number: int, *, quality: FrameQuality
    ) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                key=self._make_chunk_key(db_segment, chunk_number, quality=quality),
                create_callback=lambda: self.prepare_segment_chunk(
                    db_segment, chunk_number, quality=quality
                ),
            )
        )

    def get_task_chunk(
        self, db_task: models.Task, chunk_number: int, *, quality: FrameQuality
    ) -> Optional[DataWithMime]:
        return self._to_data_with_mime(
            self._get_cache_item(key=self._make_chunk_key(db_task, chunk_number, quality=quality))
        )

    def get_or_set_task_chunk(
        self,
        db_task: models.Task,
        chunk_number: int,
        *,
        quality: FrameQuality,
        set_callback: Callable[[], DataWithMime],
    ) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                key=self._make_chunk_key(db_task, chunk_number, quality=quality),
                create_callback=set_callback,
            )
        )

    def get_segment_task_chunk(
        self, db_segment: models.Segment, chunk_number: int, *, quality: FrameQuality
    ) -> Optional[DataWithMime]:
        return self._to_data_with_mime(
            self._get_cache_item(
                key=self._make_segment_task_chunk_key(db_segment, chunk_number, quality=quality)
            )
        )

    def get_or_set_segment_task_chunk(
        self,
        db_segment: models.Segment,
        chunk_number: int,
        *,
        quality: FrameQuality,
        set_callback: Callable[[], DataWithMime],
    ) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                key=self._make_segment_task_chunk_key(db_segment, chunk_number, quality=quality),
                create_callback=set_callback,
            )
        )

    def get_or_set_selective_job_chunk(
        self, db_job: models.Job, chunk_number: int, *, quality: FrameQuality
    ) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                key=self._make_chunk_key(db_job, chunk_number, quality=quality),
                create_callback=lambda: self.prepare_masked_range_segment_chunk(
                    db_job.segment, chunk_number, quality=quality
                ),
            )
        )

    def get_or_set_segment_preview(self, db_segment: models.Segment) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                self._make_preview_key(db_segment),
                create_callback=lambda: self._prepare_segment_preview(db_segment),
            )
        )

    def remove_segment_chunk(
        self, db_segment: models.Segment, chunk_number: str, *, quality: str
    ) -> None:
        self._delete_cache_item(
            self._make_segment_chunk_key(
                db_segment=db_segment, chunk_number=chunk_number, quality=quality
            )
        )

    def get_cloud_preview(self, db_storage: models.CloudStorage) -> Optional[DataWithMime]:
        return self._to_data_with_mime(self._get_cache_item(self._make_preview_key(db_storage)))

    def get_or_set_cloud_preview(self, db_storage: models.CloudStorage) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                self._make_preview_key(db_storage),
                create_callback=lambda: self._prepare_cloud_preview(db_storage),
            )
        )

    def get_or_set_frame_context_images_chunk(
        self, db_data: models.Data, frame_number: int
    ) -> DataWithMime:
        return self._to_data_with_mime(
            self._get_or_set_cache_item(
                key=self._make_context_image_preview_key(db_data, frame_number),
                create_callback=lambda: self.prepare_context_images_chunk(db_data, frame_number),
            )
        )

    def _read_raw_images(
        self,
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
                media = preload_images(media)

                for checksum, (_, fs_filename, _) in zip(checksums, media):
                    if checksum and not md5_hash(fs_filename) == checksum:
                        slogger.cloud_storage[db_cloud_storage.id].warning(
                            "Hash sums of files {} do not match".format(file_name)
                        )

                yield from media
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
                media = preload_images(media)

            yield from media

    def _read_raw_frames(
        self, db_task: models.Task, frame_ids: Sequence[int]
    ) -> Generator[Tuple[Union[av.VideoFrame, PIL.Image.Image], str, str], None, None]:
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
            yield from self._read_raw_images(db_task, frame_ids, manifest_path=manifest_path)

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
        chunk_frame_ids = list(db_segment.frame_set)[
            chunk_size * chunk_number : chunk_size * (chunk_number + 1)
        ]

        return self.prepare_custom_range_segment_chunk(db_task, chunk_frame_ids, quality=quality)

    def prepare_custom_range_segment_chunk(
        self, db_task: models.Task, frame_ids: Sequence[int], *, quality: FrameQuality
    ) -> DataWithMime:
        with closing(self._read_raw_frames(db_task, frame_ids=frame_ids)) as frame_iter:
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

    def prepare_custom_masked_range_segment_chunk(
        self,
        db_task: models.Task,
        frame_ids: Collection[int],
        chunk_number: int,
        *,
        quality: FrameQuality,
        insert_placeholders: bool = False,
    ) -> DataWithMime:
        db_data = db_task.data

        frame_step = db_data.get_frame_step()

        image_quality = 100 if quality == FrameQuality.ORIGINAL else db_data.image_quality
        writer = ZipCompressedChunkWriter(image_quality, dimension=db_task.dimension)

        dummy_frame = io.BytesIO()
        PIL.Image.new("RGB", (1, 1)).save(dummy_frame, writer.IMAGE_EXT)

        # Optimize frame access if all the required frames are already cached
        # Otherwise we might need to download files.
        # This is not needed for video tasks, as it will reduce performance
        from cvat.apps.engine.frame_provider import FrameOutputType, TaskFrameProvider

        task_frame_provider = TaskFrameProvider(db_task)

        use_cached_data = False
        if db_task.mode != "interpolation":
            required_frame_set = set(frame_ids)
            available_chunks = [
                self._has_key(self._make_chunk_key(db_segment, chunk_number, quality=quality))
                for db_segment in db_task.segment_set.filter(type=models.SegmentType.RANGE).all()
                for chunk_number, _ in groupby(
                    sorted(required_frame_set.intersection(db_segment.frame_set)),
                    key=lambda frame: frame // db_data.chunk_size,
                )
            ]
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
                            + chunk_number * db_data.chunk_size
                            + chunk_frame_idx * frame_step
                        )
                        for chunk_frame_idx in range(db_data.chunk_size)
                    )
                else:
                    frame_range = frame_ids

                if not use_cached_data:
                    frames_gen = self._read_raw_frames(db_task, frame_ids)
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

    def _prepare_segment_preview(self, db_segment: models.Segment) -> DataWithMime:
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

    def _prepare_cloud_preview(self, db_storage: models.CloudStorage) -> DataWithMime:
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

    def prepare_context_images_chunk(self, db_data: models.Data, frame_number: int) -> DataWithMime:
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
    task_chunk_frames: Iterator[Tuple[Any, str, int]],
    *,
    quality: FrameQuality,
    db_task: models.Task,
    dump_unchanged: bool = False,
) -> DataWithMime:
    # TODO: refactor all chunk building into another class

    db_data = db_task.data

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


def get_chunk_mime_type_for_writer(writer: Union[IChunkWriter, Type[IChunkWriter]]) -> str:
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
