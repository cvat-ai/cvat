from diskcache import Cache
from django.conf import settings
from cvat.apps.engine.media_extractors import (Mpeg4ChunkWriter, ZipChunkWriter,
    Mpeg4CompressedChunkWriter, ZipCompressedChunkWriter)
from cvat.apps.engine.models import DataChoice
from .prepare import PrepareInfo
import os

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

    def get_buff(self, chunk_number, quality, db_data):
        chunk, tag = self._cache.get('{}_{}_{}'.format(db_data.id, chunk_number, quality), tag=True)

        if not chunk:
            chunk, tag = self.prepare_chunk_buff(db_data, quality, chunk_number)
            self.save_chunk(db_data.id, chunk_number, quality, chunk, tag)
        return chunk

    def prepare_chunk_buff(self, db_data, quality, chunk_number):
        from cvat.apps.engine.frame_provider import FrameProvider
        extractor_classes = {
            FrameProvider.Quality.COMPRESSED : Mpeg4CompressedChunkWriter if db_data.compressed_chunk_type == DataChoice.VIDEO else ZipCompressedChunkWriter,
            FrameProvider.Quality.ORIGINAL : Mpeg4ChunkWriter if db_data.original_chunk_type == DataChoice.VIDEO else ZipChunkWriter,
        }

        image_quality = 100 if extractor_classes[quality] in [Mpeg4ChunkWriter, ZipChunkWriter] else db_data.image_quality
        file_extension = 'mp4' if extractor_classes[quality] in [Mpeg4ChunkWriter, Mpeg4CompressedChunkWriter] else 'jpeg'
        mime_type = 'video/mp4' if extractor_classes[quality] in [Mpeg4ChunkWriter, Mpeg4CompressedChunkWriter] else 'application/zip'

        extractor = extractor_classes[quality](image_quality)

        #if 'interpolation' == task_mode:
        if os.path.exists(db_data.get_meta_path()):
            meta = PrepareInfo(source_path=os.path.join(db_data.get_upload_dirname(), db_data.video.path),
                               meta_path=db_data.get_meta_path())
            frames = []
            for frame in meta.decode_needed_frames(chunk_number, db_data):#db_data.chunk_size
                frames.append(frame)
            buff = extractor.save_as_chunk_to_buff(frames, file_extension)
        else:
            img_paths = None
            with open(db_data.get_dummy_chunk_path(chunk_number), 'r') as dummy_file:
                img_paths = [line.strip() for line in dummy_file]
            buff = extractor.save_as_chunk_to_buff(img_paths, file_extension)
        return buff, mime_type

    def save_chunk(self, db_data_id, chunk_number, quality, buff, mime_type):
        self._cache.set('{}_{}_{}'.format(db_data_id, chunk_number, quality), buff, tag=mime_type)