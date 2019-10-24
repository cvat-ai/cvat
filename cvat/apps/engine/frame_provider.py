import os
import zipfile
import math

from cvat.apps.engine.media_extractors import ArchiveExtractor, VideoExtractor
from cvat.apps.engine.models import DataChoice


class FrameProvider():
    def __init__(self, db_data):
        self._db_data = db_data
        # self._chunk_type = db_data.type
        if db_data.type == DataChoice.IMAGESET:
            self._chunk_extractor_class = ArchiveExtractor
        elif db_data.type == DataChoice.VIDEO:
            self._chunk_extractor_class = VideoExtractor
        else:
            pass # TODO
        self._extracted_chunk = None
        self._chunk_extractor = None

    def __iter__(self):
        for i in range(self._db_data.size):
            yield self.get_frame(i)

    def __len__(self):
        return self._db_data.size

    def get_frame(self, frame_number):
        if frame_number < 0 or frame_number >= self._db_data.size:
            raise Exception('Incorrect requested frame number: {}'.format(frame_number))
        chunk_number = frame_number // self._db_data.chunk_size
        frame_offset = frame_number % self._db_data.chunk_size
        chunk_path = self.get_chunk(chunk_number)
        if chunk_number != self._extracted_chunk:
            self._extracted_chunk = chunk_number
            self._chunk_extractor = self._chunk_extractor_class([chunk_path], 95)

        return self._chunk_extractor[frame_offset]

    def get_compressed_chunk(self, chunk_number):
        if chunk_number < 0 or chunk_number > math.ceil(self._db_data.size / self._db_data.chunk_size):
            raise Exception('requested chunk does not exist')

        path = self._db_data.get_compressed_chunk_path(chunk_number)
        if self._db_data.type == DataChoice.LIST:
            zip_chunk_path = '{}.zip'.format(os.path.splitext(path)[0])
            if not os.path.exists(zip_chunk_path):
                with zipfile.ZipFile(zip_chunk_path, 'x') as zip_chunk:
                    with open(path, 'r') as images:
                        for idx, im_path in enumerate(images):
                            zip_chunk.write(
                                filename=im_path.strip(),
                                arcname='{:06d}.jpeg'.format(idx),
                            )
            path = zip_chunk_path

        return path

    def get_preview(self):
        return self._db_data.get_preview_path()
