# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from io import BytesIO
from datetime import datetime
from tempfile import NamedTemporaryFile
import pytz

from diskcache import Cache
from django.conf import settings
from rest_framework.exceptions import ValidationError, NotFound

from cvat.apps.engine.log import slogger
from cvat.apps.engine.media_extractors import (Mpeg4ChunkWriter,
    Mpeg4CompressedChunkWriter, ZipChunkWriter, ZipCompressedChunkWriter,
    ImageDatasetManifestReader, VideoDatasetManifestReader)
from cvat.apps.engine.models import DataChoice, StorageChoice
from cvat.apps.engine.models import DimensionType
from cvat.apps.engine.cloud_provider import get_cloud_storage_instance, Credentials
from cvat.apps.engine.utils import md5_hash
from cvat.apps.engine.cloud_provider import db_storage_to_storage_instance
from cvat.apps.engine.mime_types import mimetypes
from utils.dataset_manifest import ImageManifestManager


class CacheInteraction:
    def __init__(self, dimension=DimensionType.DIM_2D):
        self._cache = Cache(settings.CACHE_ROOT)
        self._dimension = dimension

    def __del__(self):
        self._cache.close()

    def get_buf_chunk_with_mime(self, chunk_number, quality, db_data):
        cache_key = f'{db_data.id}_{chunk_number}_{quality}'
        chunk, tag = self._cache.get(cache_key, tag=True)

        if not chunk:
            chunk, tag = self._prepare_chunk_buff(db_data, quality, chunk_number)
            self._cache.set(cache_key, chunk, tag=tag)

        return chunk, tag

    def get_local_preview_with_mime(self, frame_number, db_data):
        key = f'data_{db_data.id}_{frame_number}_preview'
        buf, mime = self._cache.get(key, tag=True)
        if not buf:
            buf, mime = self._prepare_local_preview(frame_number, db_data)
            self._cache.set(key, buf, tag=mime)

        return buf, mime

    def get_cloud_preview_with_mime(self, db_storage):
        key = f'cloudstorage_{db_storage.id}_preview'
        preview, mime = self._cache.get(key, tag=True)

        if not preview:
            preview, mime = self._prepare_cloud_preview(db_storage)
            self._cache.set(key, preview, tag=mime)

        return preview, mime

    @staticmethod
    def _get_frame_provider():
        from cvat.apps.engine.frame_provider import FrameProvider # TODO: remove circular dependency
        return FrameProvider

    def _prepare_chunk_buff(self, db_data, quality, chunk_number):

        FrameProvider = self._get_frame_provider()

        writer_classes = {
            FrameProvider.Quality.COMPRESSED : Mpeg4CompressedChunkWriter if db_data.compressed_chunk_type == DataChoice.VIDEO else ZipCompressedChunkWriter,
            FrameProvider.Quality.ORIGINAL : Mpeg4ChunkWriter if db_data.original_chunk_type == DataChoice.VIDEO else ZipChunkWriter,
        }

        image_quality = 100 if writer_classes[quality] in [Mpeg4ChunkWriter, ZipChunkWriter] else db_data.image_quality
        mime_type = 'video/mp4' if writer_classes[quality] in [Mpeg4ChunkWriter, Mpeg4CompressedChunkWriter] else 'application/zip'

        kwargs = {}
        if self._dimension == DimensionType.DIM_3D:
            kwargs["dimension"] = DimensionType.DIM_3D
        writer = writer_classes[quality](image_quality, **kwargs)

        images = []
        buff = BytesIO()
        upload_dir = {
                StorageChoice.LOCAL: db_data.get_upload_dirname(),
                StorageChoice.SHARE: settings.SHARE_ROOT,
                StorageChoice.CLOUD_STORAGE: db_data.get_upload_dirname(),
            }[db_data.storage]
        if hasattr(db_data, 'video'):
            source_path = os.path.join(upload_dir, db_data.video.path)

            reader = VideoDatasetManifestReader(manifest_path=db_data.get_manifest_path(),
                source_path=source_path, chunk_number=chunk_number,
                chunk_size=db_data.chunk_size, start=db_data.start_frame,
                stop=db_data.stop_frame, step=db_data.get_frame_step())
            for frame in reader:
                images.append((frame, source_path, None))
        else:
            reader = ImageDatasetManifestReader(manifest_path=db_data.get_manifest_path(),
                chunk_number=chunk_number, chunk_size=db_data.chunk_size,
                start=db_data.start_frame, stop=db_data.stop_frame,
                step=db_data.get_frame_step())
            if db_data.storage == StorageChoice.CLOUD_STORAGE:
                db_cloud_storage = db_data.cloud_storage
                assert db_cloud_storage, 'Cloud storage instance was deleted'
                credentials = Credentials()
                credentials.convert_from_db({
                    'type': db_cloud_storage.credentials_type,
                    'value': db_cloud_storage.credentials,
                })
                details = {
                    'resource': db_cloud_storage.resource,
                    'credentials': credentials,
                    'specific_attributes': db_cloud_storage.get_specific_attributes()
                }
                cloud_storage_instance = get_cloud_storage_instance(cloud_provider=db_cloud_storage.provider_type, **details)
                for item in reader:
                    file_name = f"{item['name']}{item['extension']}"
                    with NamedTemporaryFile(mode='w+b', prefix='cvat', suffix=file_name.replace(os.path.sep, '#'), delete=False) as temp_file:
                        source_path = temp_file.name
                        buf = cloud_storage_instance.download_fileobj(file_name)
                        temp_file.write(buf.getvalue())
                        temp_file.flush()
                        checksum = item.get('checksum', None)
                        if not checksum:
                            slogger.cloud_storage[db_cloud_storage.id].warning('A manifest file does not contain checksum for image {}'.format(item.get('name')))
                        if checksum and not md5_hash(source_path) == checksum:
                            slogger.cloud_storage[db_cloud_storage.id].warning('Hash sums of files {} do not match'.format(file_name))
                        images.append((source_path, source_path, None))
            else:
                for item in reader:
                    source_path = os.path.join(upload_dir, f"{item['name']}{item['extension']}")
                    images.append((source_path, source_path, None))
        writer.save_as_chunk(images, buff)
        buff.seek(0)
        if db_data.storage == StorageChoice.CLOUD_STORAGE:
            images = [image[0] for image in images if os.path.exists(image[0])]
            for image_path in images:
                os.remove(image_path)
        return buff, mime_type

    def _prepare_local_preview(self, frame_number, db_data):
        FrameProvider = self._get_frame_provider()
        frame_provider = FrameProvider(db_data, self._dimension)
        buf, mime = frame_provider.get_preview(frame_number)

        return buf, mime

    def _prepare_cloud_preview(self, db_storage):
        storage = db_storage_to_storage_instance(db_storage)
        if not db_storage.manifests.count():
            raise ValidationError('Cannot get the cloud storage preview. There is no manifest file')
        preview_path = None
        for manifest_model in db_storage.manifests.all():
            manifest_prefix = os.path.dirname(manifest_model.filename)
            full_manifest_path = os.path.join(db_storage.get_storage_dirname(), manifest_model.filename)
            if not os.path.exists(full_manifest_path) or \
                    datetime.utcfromtimestamp(os.path.getmtime(full_manifest_path)).replace(tzinfo=pytz.UTC) < storage.get_file_last_modified(manifest_model.filename):
                storage.download_file(manifest_model.filename, full_manifest_path)
            manifest = ImageManifestManager(
                os.path.join(db_storage.get_storage_dirname(), manifest_model.filename),
                db_storage.get_storage_dirname()
            )
            # need to update index
            manifest.set_index()
            if not len(manifest):
                continue
            preview_info = manifest[0]
            preview_filename = ''.join([preview_info['name'], preview_info['extension']])
            preview_path = os.path.join(manifest_prefix, preview_filename)
            break
        if not preview_path:
            msg = 'Cloud storage {} does not contain any images'.format(db_storage.pk)
            slogger.cloud_storage[db_storage.pk].info(msg)
            raise NotFound(msg)

        preview = storage.download_fileobj(preview_path)
        mime = mimetypes.guess_type(preview_path)[0]

        return preview, mime
