# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from io import BytesIO

from django.conf import settings
from tempfile import NamedTemporaryFile

from cvat.apps.engine.log import slogger
from cvat.apps.engine.media_extractors import (
    Mpeg4ChunkWriter, Mpeg4CompressedChunkWriter, ZipChunkWriter,
    ZipCompressedChunkWriter, ImageDatasetManifestReader,
    S3DatasetManifestReader, VideoDatasetManifestReader
)
from cvat.apps.engine.models import DataChoice, StorageChoice
from cvat.apps.engine.models import DimensionType, Data, CloudStorage
from cvat.apps.engine.cloud_provider import get_cloud_storage_instance, Credentials, Status
from cvat.apps.engine.utils import md5_hash
from cvat.apps.engine.constants import FrameQuality
from cvat.rebotics.cache import default_cache
from cvat.rebotics.s3_client import s3_client


class CacheInteraction:
    def __init__(self, dimension=DimensionType.DIM_2D):
        self._cache = default_cache
        self._dimension = dimension

    def get_buff_mime(self, chunk_number, quality, db_data):
        if settings.USE_CACHE_S3:
            return self._get_s3_buff_mime(chunk_number, quality, db_data)
        else:
            return self._get_cached_buff_mime(chunk_number, quality, db_data)

    def _get_cached_buff_mime(self, chunk_number, quality, db_data):
        chunk, tag = self._cache.get('{}_{}_{}'.format(db_data.id, chunk_number, quality), tag=True)

        if not chunk:
            chunk, tag = self.prepare_chunk_buff(db_data, quality, chunk_number)
            self._save_chunk(db_data.id, chunk_number, quality, chunk, tag)
        return chunk, tag

    def _get_s3_buff_mime(self, chunk_number, quality, db_data):
        key = db_data.get_s3_chunk_path(chunk_number, quality)
        try:
            tag = s3_client.get_tags(key)['mime_type']
        except Exception:  # TODO: better handling.
            slogger.glob.info('Chunk {} not found, creating.'.format(key))
            chunk, tag = self.prepare_chunk_buff(db_data, quality, chunk_number)
            self._save_s3_chunk(db_data, chunk_number, quality, chunk, tag)
        return key, tag

    def prepare_chunk_buff(self, db_data, quality, chunk_number):
        upload_dir = {
                StorageChoice.LOCAL: db_data.get_upload_dirname(),
                StorageChoice.SHARE: settings.SHARE_ROOT,
        }.get(db_data.storage, None)

        if hasattr(db_data, 'video'):
            images = self._get_frames(db_data, upload_dir, chunk_number)
        elif db_data.storage == StorageChoice.CLOUD_STORAGE:
            images = self._get_cloud_storage_images(db_data, chunk_number)
        elif settings.USE_S3:
            images = self._get_s3_images(db_data, chunk_number)
        else:
            images = self._get_local_images(db_data, upload_dir, chunk_number)

        writer, mime_type = self._get_writer(db_data, quality)
        buff = BytesIO()
        writer.save_as_chunk(images, buff)
        buff.seek(0)

        # clear local files
        if db_data.storage == StorageChoice.CLOUD_STORAGE or settings.USE_S3:
            for image in images:
                if os.path.exists(image[0]):
                    os.remove(image[0])

        return buff, mime_type

    def _save_chunk(self, db_data_id, chunk_number, quality, buff, mime_type):
        self._cache.set('{}_{}_{}'.format(db_data_id, chunk_number, quality), buff,
                        expire=settings.CACHE_EXPIRE, tag=mime_type)

    def _save_s3_chunk(self, db_data: Data, chunk_number, quality, buff, mime_type):
        key = db_data.get_s3_chunk_path(chunk_number, quality)
        s3_client.upload_from_io(buff, key)
        s3_client.set_tags(key, {'mime_type': mime_type})

    def _get_frames(self, db_data, upload_dir, chunk_number):
        source_path = os.path.join(upload_dir, db_data.video.path)

        reader = VideoDatasetManifestReader(
            manifest_path=db_data.get_manifest_path(),
            source_path=source_path, chunk_number=chunk_number,
            chunk_size=db_data.chunk_size, start=db_data.start_frame,
            stop=db_data.stop_frame, step=db_data.get_frame_step()
        )

        images = []
        for frame in reader:
            images.append((frame, source_path, None))
        return images

    def _get_s3_images(self, db_data: Data, chunk_number):
        reader = S3DatasetManifestReader(
            manifest_path=db_data.get_s3_manifest_path(),
            chunk_number=chunk_number, chunk_size=db_data.chunk_size,
            start=db_data.start_frame, stop=db_data.stop_frame,
            step=db_data.get_frame_step()
        )

        images = []
        for item in reader:
            file_name = f"{item['name']}{item['extension']}"
            key = db_data.get_s3_uploaded_file_path(file_name)
            path = s3_client.download_to_temp(key, suffix=file_name.replace(os.path.sep, '#'))
            self._validate_checksum(item, path, file_name, slogger.glob)
            images.append((path, path, None))

        return images

    def _get_cloud_storage_images(self, db_data: Data, chunk_number):
        reader = ImageDatasetManifestReader(
            manifest_path=db_data.get_manifest_path(),
            chunk_number=chunk_number, chunk_size=db_data.chunk_size,
            start=db_data.start_frame, stop=db_data.stop_frame,
            step=db_data.get_frame_step()
        )

        cloud_storage = None
        file_name = None
        db_cloud_storage = db_data.cloud_storage
        details = self._get_cloud_storage_details(db_cloud_storage)

        try:
            cloud_storage = get_cloud_storage_instance(
                cloud_provider=db_cloud_storage.provider_type,
                **details
            )

            images = []
            for item in reader:
                file_name = f"{item['name']}{item['extension']}"
                with NamedTemporaryFile(mode='w+b', prefix='cvat',
                                        suffix=file_name.replace(os.path.sep, '#'),
                                        delete=False) as temp_file:
                    buf = cloud_storage.download_fileobj(file_name)
                    temp_file.write(buf.getvalue())
                    temp_file.flush()
                    source_path = temp_file.name
                self._validate_checksum(item, source_path, file_name,
                                        slogger.cloud_storage[db_cloud_storage.id])
                images.append((source_path, source_path, None))
            return images
        except Exception as e:
            msg = self._get_cloud_storage_err_msg(e, cloud_storage, file_name)
            raise Exception(msg)

    def _validate_checksum(self, manifest_item, file_path, file_name, logger):
        checksum = manifest_item.get('checksum', None)
        if not checksum:
            logger.warning('A manifest file does not contain checksum for image {}'
                           .format(manifest_item.get('name')))
        if checksum and not md5_hash(file_path) == checksum:
            logger.warning('Hash sums of files {} do not match'.format(file_name))

    def _get_cloud_storage_details(self, db_cloud_storage: CloudStorage):
        assert db_cloud_storage, 'Cloud storage instance was deleted'
        credentials = Credentials()
        credentials.convert_from_db({
            'type': db_cloud_storage.credentials_type,
            'value': db_cloud_storage.credentials,
        })
        return {
            'resource': db_cloud_storage.resource,
            'credentials': credentials,
            'specific_attributes': db_cloud_storage.get_specific_attributes()
        }

    def _get_cloud_storage_err_msg(self, e, storage, file_name):
        if storage is not None:
            storage_status = storage.get_status()
            if storage_status == Status.FORBIDDEN:
                return 'The resource {} is no longer available. Access forbidden.'\
                    .format(storage.name)
            elif storage_status == Status.NOT_FOUND:
                return 'The resource {} not found. It may have been deleted.'\
                    .format(storage.name)
            elif file_name is not None:
                file_status = storage.get_file_status(file_name)
                if file_status == Status.NOT_FOUND:
                    return "'{}' not found on the cloud storage '{}'"\
                        .format(file_name, storage.name)
                elif file_status == Status.FORBIDDEN:
                    return "Access to the file '{}' on the '{}' cloud storage is denied"\
                        .format(file_name, storage.name)
        return str(e)

    def _get_local_images(self, db_data: Data, upload_dir, chunk_number):
        reader = ImageDatasetManifestReader(
            manifest_path=db_data.get_manifest_path(),
            chunk_number=chunk_number, chunk_size=db_data.chunk_size,
            start=db_data.start_frame, stop=db_data.stop_frame,
            step=db_data.get_frame_step()
        )

        images = []
        for item in reader:
            source_path = os.path.join(upload_dir, f"{item['name']}{item['extension']}")
            images.append((source_path, source_path, None))
        return images

    def _get_writer(self, db_data, quality):
        writer_classes = {
            FrameQuality.COMPRESSED:
                Mpeg4CompressedChunkWriter if db_data.compressed_chunk_type == DataChoice.VIDEO else ZipCompressedChunkWriter,
            FrameQuality.ORIGINAL:
                Mpeg4ChunkWriter if db_data.original_chunk_type == DataChoice.VIDEO else ZipChunkWriter,
        }

        image_quality = 100 if writer_classes[quality] in [
            Mpeg4ChunkWriter,
            ZipChunkWriter
        ] else db_data.image_quality
        mime_type = 'video/mp4' if writer_classes[quality] in [
            Mpeg4ChunkWriter,
            Mpeg4CompressedChunkWriter
        ] else 'application/zip'

        kwargs = {}
        if self._dimension == DimensionType.DIM_3D:
            kwargs["dimension"] = DimensionType.DIM_3D
        writer = writer_classes[quality](image_quality, **kwargs)

        return writer, mime_type
