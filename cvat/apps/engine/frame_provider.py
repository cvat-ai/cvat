import os
from enum import Enum
from cvat.apps.engine.media_extractors import ArchiveExtractor, VideoExtractor

class FrameProvider():
    class ChunkType(Enum):
        IMAGE = 0
        VIDEO = 1

    def __init__(self, db_task):
        self._db_task = db_task
        self._chunk_type = self.ChunkType.VIDEO if db_task.mode == 'interpolation' else self.ChunkType.IMAGE
        self._chunk_extractor_class = ArchiveExtractor if self._chunk_type == self.ChunkType.IMAGE else VideoExtractor
        self._extracted_chunk = None
        self._chunk_extractor = None

    def __iter__(self):
        for i in range(self._db_task.size):
            yield self.get_frame(i)

    def __len__(self):
        return self._db_task.size

    def get_frame(self, frame_number):
        if frame_number < 0 or frame_number >= self._db_task.size:
            raise Exception('Incorrect requested frame number: {}'.format(frame_number))
        chunk_number = frame_number // self._db_task.data_chunk_size
        frame_offset = frame_number % self._db_task.data_chunk_size
        chunk_path = self.get_chunk(chunk_number)
        if chunk_number != self._extracted_chunk:
            self._extracted_chunk = chunk_number
            self._chunk_extractor = self._chunk_extractor_class([chunk_path], 95)

        return self._chunk_extractor[frame_offset]

    def get_chunk(self, chunk_number):
        return self._db_task.get_chunk_path(chunk_number)

    def get_preview(self):
        return os.path.join(self._db_task.get_data_dirname(), 'preview.jpg')
