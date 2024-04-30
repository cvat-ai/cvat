# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math
from enum import Enum
from io import BytesIO
import os

import cv2
import numpy as np
from PIL import Image, ImageOps

from cvat.apps.engine.cache import MediaCache
from cvat.apps.engine.media_extractors import VideoReader, ZipReader
from cvat.apps.engine.mime_types import mimetypes
from cvat.apps.engine.models import DataChoice, StorageMethodChoice, DimensionType
from rest_framework.exceptions import ValidationError

class RandomAccessIterator:
    def __init__(self, iterable):
        self.iterable = iterable
        self.iterator = None
        self.pos = -1

    def __iter__(self):
        return self

    def __next__(self):
        return self[self.pos + 1]

    def __getitem__(self, idx):
        assert 0 <= idx
        if self.iterator is None or idx <= self.pos:
            self.reset()
        v = None
        while self.pos < idx:
            # NOTE: don't keep the last item in self, it can be expensive
            v = next(self.iterator)
            self.pos += 1
        return v

    def reset(self):
        self.close()
        self.iterator = iter(self.iterable)

    def close(self):
        if self.iterator is not None:
            if close := getattr(self.iterator, 'close', None):
                close()
        self.iterator = None
        self.pos = -1

class FrameProvider:
    VIDEO_FRAME_EXT = '.PNG'
    VIDEO_FRAME_MIME = 'image/png'

    class Quality(Enum):
        COMPRESSED = 0
        ORIGINAL = 100

    class Type(Enum):
        BUFFER = 0
        PIL = 1
        NUMPY_ARRAY = 2

    class ChunkLoader:
        def __init__(self, reader_class, path_getter):
            self.chunk_id = None
            self.chunk_reader = None
            self.reader_class = reader_class
            self.get_chunk_path = path_getter

        def load(self, chunk_id):
            if self.chunk_id != chunk_id:
                self.unload()

                self.chunk_id = chunk_id
                self.chunk_reader = RandomAccessIterator(
                    self.reader_class([self.get_chunk_path(chunk_id)]))
            return self.chunk_reader

        def unload(self):
            self.chunk_id = None
            if self.chunk_reader:
                self.chunk_reader.close()
                self.chunk_reader = None

    class BuffChunkLoader(ChunkLoader):
        def __init__(self, reader_class, path_getter, quality, db_data):
            super().__init__(reader_class, path_getter)
            self.quality = quality
            self.db_data = db_data

        def load(self, chunk_id):
            if self.chunk_id != chunk_id:
                self.chunk_id = chunk_id
                self.chunk_reader = RandomAccessIterator(
                    self.reader_class([self.get_chunk_path(chunk_id, self.quality, self.db_data)[0]]))
            return self.chunk_reader

    def __init__(self, db_data, dimension=DimensionType.DIM_2D):
        self._db_data = db_data
        self._dimension = dimension
        self._loaders = {}

        reader_class = {
            DataChoice.IMAGESET: ZipReader,
            DataChoice.VIDEO: VideoReader,
        }

        if db_data.storage_method == StorageMethodChoice.CACHE:
            cache = MediaCache(dimension=dimension)

            self._loaders[self.Quality.COMPRESSED] = self.BuffChunkLoader(
                reader_class[db_data.compressed_chunk_type],
                cache.get_task_chunk_data_with_mime,
                self.Quality.COMPRESSED,
                self._db_data)
            self._loaders[self.Quality.ORIGINAL] = self.BuffChunkLoader(
                reader_class[db_data.original_chunk_type],
                cache.get_task_chunk_data_with_mime,
                self.Quality.ORIGINAL,
                self._db_data)
        else:
            self._loaders[self.Quality.COMPRESSED] = self.ChunkLoader(
                reader_class[db_data.compressed_chunk_type],
                db_data.get_compressed_chunk_path)
            self._loaders[self.Quality.ORIGINAL] = self.ChunkLoader(
                reader_class[db_data.original_chunk_type],
                db_data.get_original_chunk_path)

    def __len__(self):
        return self._db_data.size

    def unload(self):
        for loader in self._loaders.values():
            loader.unload()

    def _validate_frame_number(self, frame_number):
        frame_number_ = int(frame_number)
        if frame_number_ < 0 or frame_number_ >= self._db_data.size:
            raise ValidationError('Incorrect requested frame number: {}'.format(frame_number_))

        chunk_number = frame_number_ // self._db_data.chunk_size
        frame_offset = frame_number_ % self._db_data.chunk_size

        return frame_number_, chunk_number, frame_offset

    def get_chunk_number(self, frame_number):
        return int(frame_number) // self._db_data.chunk_size

    def _validate_chunk_number(self, chunk_number):
        chunk_number_ = int(chunk_number)
        if chunk_number_ < 0 or chunk_number_ >= math.ceil(self._db_data.size / self._db_data.chunk_size):
            raise ValidationError('requested chunk does not exist')

        return chunk_number_

    @classmethod
    def _av_frame_to_png_bytes(cls, av_frame):
        ext = cls.VIDEO_FRAME_EXT
        image = av_frame.to_ndarray(format='bgr24')
        success, result = cv2.imencode(ext, image)
        if not success:
            raise RuntimeError("Failed to encode image to '%s' format" % (ext))
        return BytesIO(result.tobytes())

    def _convert_frame(self, frame, reader_class, out_type):
        if out_type == self.Type.BUFFER:
            return self._av_frame_to_png_bytes(frame) if reader_class is VideoReader else frame
        elif out_type == self.Type.PIL:
            return frame.to_image() if reader_class is VideoReader else Image.open(frame)
        elif out_type == self.Type.NUMPY_ARRAY:
            if reader_class is VideoReader:
                image = frame.to_ndarray(format='bgr24')
            else:
                image = np.array(Image.open(frame))
                if len(image.shape) == 3 and image.shape[2] in {3, 4}:
                    image[:, :, :3] = image[:, :, 2::-1] # RGB to BGR
            return image
        else:
            raise RuntimeError('unsupported output type')

    def get_preview(self, frame_number):
        PREVIEW_SIZE = (256, 256)
        PREVIEW_MIME = 'image/jpeg'

        if self._dimension == DimensionType.DIM_3D:
            # TODO
            preview = Image.open(os.path.join(os.path.dirname(__file__), 'assets/3d_preview.jpeg'))
        else:
            preview, _ = self.get_frame(frame_number, self.Quality.COMPRESSED, self.Type.PIL)

        preview = ImageOps.exif_transpose(preview)
        preview.thumbnail(PREVIEW_SIZE)

        output_buf = BytesIO()
        preview.convert('RGB').save(output_buf, format="JPEG")

        return output_buf, PREVIEW_MIME

    def get_chunk(self, chunk_number, quality=Quality.ORIGINAL):
        chunk_number = self._validate_chunk_number(chunk_number)
        if self._db_data.storage_method == StorageMethodChoice.CACHE:
            return self._loaders[quality].get_chunk_path(chunk_number, quality, self._db_data)
        return self._loaders[quality].get_chunk_path(chunk_number)

    def get_frame(self, frame_number, quality=Quality.ORIGINAL,
            out_type=Type.BUFFER):
        _, chunk_number, frame_offset = self._validate_frame_number(frame_number)
        loader = self._loaders[quality]
        chunk_reader = loader.load(chunk_number)
        frame, frame_name, _ = chunk_reader[frame_offset]

        frame = self._convert_frame(frame, loader.reader_class, out_type)
        if loader.reader_class is VideoReader:
            return (frame, self.VIDEO_FRAME_MIME)
        return (frame, mimetypes.guess_type(frame_name)[0])

    def get_frames(self, start_frame, stop_frame, quality=Quality.ORIGINAL, out_type=Type.BUFFER):
        for idx in range(start_frame, stop_frame):
            yield self.get_frame(idx, quality=quality, out_type=out_type)

    @property
    def data_id(self):
        return self._db_data.id
