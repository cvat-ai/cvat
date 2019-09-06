import os
from enum import Enum
import shutil
import tarfile
from ffmpy import FFmpeg
from tempfile import NamedTemporaryFile


from cvat.apps.engine.media_extractors import ArchiveExtractor, VideoExtractor
from .log import slogger

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
        path = self._db_task.get_chunk_path(chunk_number)
        if not os.path.exists(path):
            dirname = os.path.dirname(path)
            if not os.path.exists(dirname):
                os.makedirs(dirname)
            chunk_size = self._db_task.data_chunk_size
            start_frame = int(chunk_number) * chunk_size
            if start_frame >= self._db_task.size:
                raise Exception('Requested batch doesnt exist')
            stop_frame = min(start_frame + chunk_size, self._db_task.size)
            if self._chunk_type == self.ChunkType.IMAGE:
                with tarfile.open(path, 'w') as tar:
                    for frame in range(start_frame, stop_frame):
                        tar.add(
                            name=self._db_task.get_frame_path(frame),
                            arcname='{:06d}.jpg'.format(frame),
                        )
            else:
                image_list = None
                if chunk_size == 1:
                    input_options = '-f image2 -framerate 25'
                    input_images = self._db_task.get_frame_path(start_frame)
                else:
                    input_options = '-f concat -safe 0 -r 25'
                    image_list = NamedTemporaryFile(mode='w+')
                    for idx in range(start_frame, stop_frame):
                        image_list.write('file \'{}\'\n'.format(self._db_task.get_frame_path(idx)))
                    image_list.flush()
                    input_images = image_list.name

                output_options = '-q:v 0'

                ff = FFmpeg(
                    inputs  = {input_images: input_options},
                    outputs = {path: output_options},
                )

                slogger.glob.info("FFMpeg cmd: {} ".format(ff.cmd))
                ff.run()

                if image_list:
                    image_list.close()
        return path

    def get_preview(self):
        preview_path = os.path.join(self._db_task.get_data_dirname(), 'preview.jpg')

        if not os.path.exists(preview_path): # old task, lets create preview image
            shutil.copyfile(self._db_task.get_frame_path(0), preview_path)

        return preview_path
