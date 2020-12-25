# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from io import BytesIO

from diskcache import Cache
from django.conf import settings

from cvat.apps.engine.media_extractors import (Mpeg4ChunkWriter,
    Mpeg4CompressedChunkWriter, ZipChunkWriter, ZipCompressedChunkWriter)
from cvat.apps.engine.models import DataChoice, StorageChoice
from cvat.apps.engine.prepare import PrepareInfo, md5_hash, ParsingMeta

from cvat.apps.engine.cloud_provider import get_cloud_storage_instance, Credentials
class CacheInteraction:
    def __init__(self):
        self._cache = Cache(settings.CACHE_ROOT)

    def __del__(self):
        self._cache.close()

    def get_buff_mime(self, chunk_number, quality, db_data):
        chunk, tag = self._cache.get('{}_{}_{}'.format(db_data.id, chunk_number, quality), tag=True)

        if not chunk:
            chunk, tag = self.prepare_chunk_buff(db_data, quality, chunk_number)
            self.save_chunk(db_data.id, chunk_number, quality, chunk, tag)
        return chunk, tag

    def prepare_chunk_buff(self, db_data, quality, chunk_number):
        from cvat.apps.engine.frame_provider import FrameProvider # TODO: remove circular dependency
        writer_classes = {
            FrameProvider.Quality.COMPRESSED : Mpeg4CompressedChunkWriter if db_data.compressed_chunk_type == DataChoice.VIDEO else ZipCompressedChunkWriter,
            FrameProvider.Quality.ORIGINAL : Mpeg4ChunkWriter if db_data.original_chunk_type == DataChoice.VIDEO else ZipChunkWriter,
        }

        image_quality = 100 if writer_classes[quality] in [Mpeg4ChunkWriter, ZipChunkWriter] else db_data.image_quality
        mime_type = 'video/mp4' if writer_classes[quality] in [Mpeg4ChunkWriter, Mpeg4CompressedChunkWriter] else 'application/zip'

        writer = writer_classes[quality](image_quality)

        images = []
        buff = BytesIO()
        upload_dir = {
                StorageChoice.LOCAL: db_data.get_upload_dirname(),
                StorageChoice.SHARE: settings.SHARE_ROOT
            }[db_data.storage]
        if hasattr(db_data, 'video'):
            source_path = os.path.join(upload_dir, db_data.video.path)
            meta = PrepareInfo(source_path=source_path, meta_path=db_data.get_meta_path())
            for frame in meta.decode_needed_frames(chunk_number, db_data):
                images.append(frame)
            writer.save_as_chunk([(image, source_path, None) for image in images], buff)
        else:
            if db_data.storage == StorageChoice.CLOUD_STORAGE:
                db_cloud_storage = db_data.cloud_storage
                credentials = Credentials()
                credentials.convert_from_db({
                    'type': db_cloud_storage.credentials_type,
                    'value': db_cloud_storage.credentials,
                })
                details = {
                    'resource_name': db_cloud_storage.resource_name,
                    'session_token': credentials.session_token,
                    'key': credentials.key,
                    'secret_key': credentials.secret_key,
                }
                cloud_storage_instance = get_cloud_storage_instance(cloud_provider=db_cloud_storage.provider_type, **details)
                cloud_storage_instance.initialize_content()
                meta_parser = ParsingMeta(db_data.get_meta_path())
                for img_name, _ , img_hash  in meta_parser.parsing(start=db_data.start_frame, step=db_data.get_frame_step(), \
                        stop=db_data.start_frame, chunk_size=db_data.chunk_size, chunk_number=chunk_number):
                    if img_name not in cloud_storage_instance:
                        # or need to generate dummy image?
                        raise Exception('{} file was not found on a {} storage'.format(img_name, cloud_storage_instance.name))
                    image = cloud_storage_instance.download_fileobj(img_name)
                    assert md5_hash(image) != img_hash, "Image '{}' does not match with origin image".format(img_name)
                    images.append((img_name, image, None))
                    writer.save_as_chunk(images, buff)
            else:
                with open(db_data.get_dummy_chunk_path(chunk_number), 'r') as dummy_file:
                    images = [os.path.join(upload_dir, line.strip()) for line in dummy_file]
                writer.save_as_chunk([(image, image, None) for image in images], buff)

        buff.seek(0)
        return buff, mime_type

    def save_chunk(self, db_data_id, chunk_number, quality, buff, mime_type):
        self._cache.set('{}_{}_{}'.format(db_data_id, chunk_number, quality), buff, tag=mime_type)
