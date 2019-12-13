import os
import zipfile
import math
from io import BytesIO

from cvat.apps.engine.media_extractors import VideoReader, ZipReader
from cvat.apps.engine.models import DataChoice


class FrameProvider():
    def __init__(self, db_data):
        self._db_data = db_data
        if db_data.compressed_chunk_type == DataChoice.IMAGESET:
            self._compressed_chunk_reader_class = ZipReader
        elif db_data.compressed_chunk_type == DataChoice.VIDEO:
            self._compressed_chunk_reader_class = VideoReader
        else:
            raise Exception('Unsupported chunk type')

        if db_data.original_chunk_type == DataChoice.IMAGESET:
            self._original_chunk_reader_class = ZipReader
        elif db_data.original_chunk_type == DataChoice.VIDEO:
            self._original_chunk_reader_class = VideoReader
        else:
            raise Exception('Unsupported chunk type')

        self._extracted_compressed_chunk = None
        self._compressed_chunk_reader = None
        self._extracted_original_chunk = None
        self._original_chunk_reader = None

    def __len__(self):
        return self._db_data.size

    def _validate_frame_number(self, frame_number):
        frame_number_ = int(frame_number)
        if frame_number_ < 0 or frame_number_ >= self._db_data.size:
            raise Exception('Incorrect requested frame number: {}'.format(frame_number_))

        chunk_number = frame_number_ // self._db_data.chunk_size
        frame_offset = frame_number_ % self._db_data.chunk_size

        return frame_number_, chunk_number, frame_offset

    @staticmethod
    def _av_frame_to_bytes(av_frame):
        pil_img = av_frame.to_image()
        buf = BytesIO()
        pil_img.save(buf, format='PNG')
        buf.seek(0)
        return buf

    def _get_frame(self, frame_number, chunk_path_getter, extracted_chunk, chunk_reader, reader_class):
        _, chunk_number, frame_offset = self._validate_frame_number(frame_number)
        chunk_path = chunk_path_getter(chunk_number)
        if chunk_number != extracted_chunk:
            extracted_chunk = chunk_number
            chunk_reader = reader_class([chunk_path])

        frame, _ = chunk_reader[frame_offset]
        if reader_class is VideoReader:
            return self._av_frame_to_bytes(frame)

        return frame

    def get_compressed_frame(self, frame_number):
        return self._get_frame(
            frame_number=frame_number,
            chunk_path_getter=self._db_data.get_compressed_chunk_path,
            extracted_chunk=self._extracted_compressed_chunk,
            chunk_reader=self._compressed_chunk_reader,
            reader_class=self._compressed_chunk_reader_class,
        )

    def get_original_frame(self, frame_number):
        return self._get_frame(
            frame_number=frame_number,
            chunk_path_getter=self._db_data.get_original_chunk_path,
            extracted_chunk=self._extracted_original_chunk,
            chunk_reader=self._original_chunk_reader,
            reader_class=self._original_chunk_reader_class,
        )

    def _get_frame_iter(self, chunk_path_getter, reader_class):
        for chunk_idx in range(math.ceil(self._db_data.size / self._db_data.chunk_size)):
            chunk_path = chunk_path_getter(chunk_idx)
            chunk_reader = reader_class([chunk_path])
            for frame, _ in chunk_reader:
                yield self._av_frame_to_bytes(frame) if reader_class is VideoReader else frame

    def get_original_frame_iter(self):
        return self._get_frame_iter(
            chunk_path_getter=self._db_data.get_original_chunk_path,
            reader_class=self._original_chunk_reader_class,
        )

    def get_compressed_frame_iter(self):
        return self._get_frame_iter(
            chunk_path_getter=self._db_data.get_compressed_chunk_path,
            reader_class=self._compressed_chunk_reader_class,
        )

    def _validate_chunk_number(self, chunk_number):
        chunk_number_ = int(chunk_number)
        if chunk_number_ < 0 or chunk_number_ >= math.ceil(self._db_data.size / self._db_data.chunk_size):
            raise Exception('requested chunk does not exist')

        return chunk_number_

    def get_compressed_chunk(self, chunk_number):
        chunk_number = self._validate_chunk_number(chunk_number)

        chunk_path = self._db_data.get_compressed_chunk_path(chunk_number)
        if self._db_data.compressed_chunk_type == DataChoice.LIST:
            zip_chunk_path = '{}.zip'.format(os.path.splitext(chunk_path)[0])
            if not os.path.exists(zip_chunk_path):
                with zipfile.ZipFile(zip_chunk_path, 'x') as zip_chunk:
                    with open(chunk_path, 'r') as images:
                        for idx, im_path in enumerate(images):
                            zip_chunk.write(
                                filename=im_path.strip(),
                                arcname='{:06d}.jpeg'.format(idx),
                            )
            chunk_path = zip_chunk_path

        return chunk_path

    def get_original_chunk(self, chunk_number):
        chunk_number = self._validate_chunk_number(chunk_number)
        chunk_path = self._db_data.get_original_chunk_path(chunk_number)
        return chunk_path

    def get_preview(self):
        return self._db_data.get_preview_path()
