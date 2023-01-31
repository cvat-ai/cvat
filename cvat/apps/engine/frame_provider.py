# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import math
from io import BytesIO

import cv2
import numpy as np
from PIL import Image

from django.conf import settings
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.cache import CacheInteraction
from cvat.apps.engine.media_extractors import VideoReader, ZipReader, S3ZipReader
from cvat.apps.engine.mime_types import mimetypes
from cvat.apps.engine.models import DataChoice, StorageMethodChoice, DimensionType
from cvat.apps.engine.constants import FrameQuality, FrameType


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
        self.iterator = iter(self.iterable)
        self.pos = -1


class ChunkLoader:
    def __init__(self, reader_class, path_getter):
        self.chunk_id = None
        self.chunk_reader = None
        self.reader_class = reader_class
        self.get_chunk_path = path_getter

    def load(self, chunk_id):
        if self.chunk_id != chunk_id:
            self.chunk_id = chunk_id
            self.chunk_reader = RandomAccessIterator(
                self.reader_class([self.get_chunk_path(chunk_id)]))
        return self.chunk_reader


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


class FrameProvider:
    VIDEO_FRAME_EXT = '.PNG'
    VIDEO_FRAME_MIME = 'image/png'

    def __init__(self, db_data, dimension=DimensionType.DIM_2D):
        self._db_data = db_data
        self._loaders = {}
        self._init_loaders(db_data, dimension)

    def __len__(self):
        return self._db_data.size

    def _validate_frame_number(self, frame_number):
        frame_number_ = int(frame_number)
        if frame_number_ < 0 or frame_number_ >= self._db_data.size:
            raise ValidationError('Incorrect requested frame number: {}'.format(frame_number_))

        chunk_number = frame_number_ // self._db_data.chunk_size
        frame_offset = frame_number_ % self._db_data.chunk_size

        return frame_number_, chunk_number, frame_offset

    def get_chunk_number(self, frame_number):
        return int(frame_number) // self._db_data.chunk_size

    def _init_loaders(self, db_data, dimension):
        if db_data.storage_method == StorageMethodChoice.CACHE:
            cache = CacheInteraction(dimension=dimension)

            self._loaders[FrameQuality.COMPRESSED] = BuffChunkLoader(
                self._get_reader_class(db_data.compressed_chunk_type),
                cache.get_buff_mime,
                FrameQuality.COMPRESSED,
                self._db_data)
            self._loaders[FrameQuality.ORIGINAL] = BuffChunkLoader(
                self._get_reader_class(db_data.original_chunk_type),
                cache.get_buff_mime,
                FrameQuality.ORIGINAL,
                self._db_data)
        else:
            self._loaders[FrameQuality.COMPRESSED] = ChunkLoader(
                self._get_reader_class(db_data.compressed_chunk_type),
                db_data.get_compressed_chunk_path)
            self._loaders[FrameQuality.ORIGINAL] = ChunkLoader(
                self._get_reader_class(db_data.original_chunk_type),
                db_data.get_original_chunk_path)

    def _get_reader_class(self, chunk_type):
        reader_classes = {
            DataChoice.IMAGESET: ZipReader,
            DataChoice.VIDEO: VideoReader,
        }
        s3_reader_classes = {
            DataChoice.IMAGESET: S3ZipReader,
        }
        choices = s3_reader_classes if settings.USE_S3 else reader_classes
        reader = choices.get(chunk_type)
        if reader is None:
            raise ValueError('Unsupported chunk type {} for current settings USE_S3 = {}'
                             .format(chunk_type, settings.USE_S3))
        return reader

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
        if out_type == FrameType.BUFFER:
            return self._av_frame_to_png_bytes(frame) if reader_class is VideoReader else frame
        elif out_type == FrameType.PIL:
            return frame.to_image() if reader_class is VideoReader else Image.open(frame)
        elif out_type == FrameType.NUMPY_ARRAY:
            if reader_class is VideoReader:
                image = frame.to_ndarray(format='bgr24')
            else:
                image = np.array(Image.open(frame))
                if len(image.shape) == 3 and image.shape[2] in {3, 4}:
                    image[:, :, :3] = image[:, :, 2::-1] # RGB to BGR
            return image
        else:
            raise RuntimeError('unsupported output type')

    def get_preview(self):
        return self._db_data.get_preview_path()

    def get_s3_preview(self):
        return self._db_data.get_s3_preview_path()

    def get_chunk(self, chunk_number, quality=FrameQuality.ORIGINAL):
        chunk_number = self._validate_chunk_number(chunk_number)
        if self._db_data.storage_method == StorageMethodChoice.CACHE:
            return self._loaders[quality].get_chunk_path(chunk_number, quality, self._db_data)
        return self._loaders[quality].get_chunk_path(chunk_number)

    def get_frame(self, frame_number, quality=FrameQuality.ORIGINAL,
            out_type=FrameType.BUFFER):
        _, chunk_number, frame_offset = self._validate_frame_number(frame_number)
        loader = self._loaders[quality]
        chunk_reader = loader.load(chunk_number)
        frame, frame_name, _ = chunk_reader[frame_offset]

        frame = self._convert_frame(frame, loader.reader_class, out_type)
        if loader.reader_class is VideoReader:
            return (frame, self.VIDEO_FRAME_MIME)
        return (frame, mimetypes.guess_type(frame_name)[0])

    def get_frames(self, quality=FrameQuality.ORIGINAL, out_type=FrameType.BUFFER):
        for idx in range(self._db_data.size):
            yield self.get_frame(idx, quality=quality, out_type=out_type)
