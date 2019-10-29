import os
import tempfile
import shutil
import zipfile
from io import BytesIO
import itertools

import av
import av.datasets
import numpy as np
from ffmpy import FFmpeg
from pyunpack import Archive
from PIL import Image
import mimetypes

from cvat.apps.engine.log import slogger

_SCRIPT_DIR = os.path.realpath(os.path.dirname(__file__))
MEDIA_MIMETYPES_FILES = [
    os.path.join(_SCRIPT_DIR, "media.mimetypes"),
]
mimetypes.init(files=MEDIA_MIMETYPES_FILES)

def get_mime(name):
    for type_name, type_def in MEDIA_TYPES.items():
        if type_def['has_mime_type'](name):
            return type_name

    return 'unknown'

class IMediaExtractor:
    def __init__(self, source_path, step, start, stop):
        self._source_path = sorted(source_path)
        self._step = step
        self._start = start
        self._stop = stop

    @staticmethod
    def create_tmp_dir():
        return tempfile.mkdtemp(prefix='cvat-', suffix='.data')

    @staticmethod
    def delete_tmp_dir(tmp_dir):
        if tmp_dir:
            shutil.rmtree(tmp_dir)

#Note step, start, stop have no affect
class ImageListExtractor(IMediaExtractor):
    def __init__(self, source_path, step=1, start=0, stop=0):
        if not source_path:
            raise Exception('No image found')
        super().__init__(
            source_path=source_path,
            step=1,
            start=0,
            stop=0,
        )

    def __iter__(self):
        return iter(self._source_path)

    def __getitem__(self, k):
        return self._source_path[k]

    def compress_image(self, image_path, quality):
        image = Image.open(image_path)
        # Ensure image data fits into 8bit per pixel before RGB conversion as PIL clips values on conversion
        if image.mode == "I":
            # Image mode is 32bit integer pixels.
            # Autoscale pixels by factor 2**8 / im_data.max() to fit into 8bit
            im_data = np.array(image)
            im_data = im_data * (2**8 / im_data.max())
            image = Image.fromarray(im_data.astype(np.int32))
        converted_image = image.convert('RGB')
        image.close()
        buf = BytesIO()
        converted_image.save(buf, format='JPEG', quality=quality, optimize=True)
        buf.seek(0)
        width, height = converted_image.size
        converted_image.close()
        return width, height, buf

    def save_as_chunks(self, chunk_size, compressed_chunk_path, original_chunk_path, progress_callback=None, quality=100):
        counter = 0
        media_meta = []
        total_length = len(self._source_path)
        for i in range(0, total_length, chunk_size):
            chunk_data = self._source_path[i:i + chunk_size]
            compressed_chunk = compressed_chunk_path(counter)
            with zipfile.ZipFile(compressed_chunk, 'x') as zip_chunk:
                for idx, image_file in enumerate(chunk_data):
                    w, h, image_buf = self.compress_image(image_file, quality)
                    media_meta.append({
                        'name': image_file,
                        'size': (w, h),
                    })
                    arcname = '{:06d}.jpeg'.format(idx)
                    zip_chunk.writestr(arcname, image_buf.getvalue())

            original_chunk = original_chunk_path(counter)
            with zipfile.ZipFile(original_chunk, 'x') as zip_chunk:
                for idx, image_file in enumerate(chunk_data):
                    zip_chunk.write(filename=image_file, arcname=os.path.basename(image_file))

            counter += 1
            if progress_callback:
                progress_callback(i / total_length)
        return media_meta, total_length

    def save_preview(self, preview_path):
        shutil.copyfile(self._source_path[0], preview_path)

#Note step, start, stop have no affect
class DirectoryExtractor(ImageListExtractor):
    def __init__(self, source_path, step=1, start=0, stop=0):
        image_paths = []
        for source in source_path:
            for root, _, files in os.walk(source):
                paths = [os.path.join(root, f) for f in files]
                paths = filter(lambda x: get_mime(x) == 'image', paths)
                image_paths.extend(paths)
        super().__init__(
            source_path=image_paths,
            step=1,
            start=0,
            stop=0,
        )

#Note step, start, stop have no affect
class ArchiveExtractor(DirectoryExtractor):
    def __init__(self, source_path, step=1, start=0, stop=0):
        self._tmp_dir = self.create_tmp_dir()
        Archive(source_path[0]).extractall(self._tmp_dir)
        super().__init__(
            source_path=[self._tmp_dir],
            step=1,
            start=0,
            stop=0,
        )

    def __del__(self):
        self.delete_tmp_dir(self._tmp_dir)

#Note step, start, stop have no affect
class PDFExtractor(DirectoryExtractor):
    def __init__(self, source_path, step=1, start=0, stop=0):
        if not source_path:
            raise Exception('No PDF found')

        from pdf2image import convert_from_path
        file_ = convert_from_path(source_path)
        self._tmp_dir = self.create_tmp_dir()
        basename = os.path.splitext(os.path.basename(source_path))[0]
        for page_num, page in enumerate(file_):
            output = os.path.join(self._tmp_dir, '{}{:09d}.jpeg'.format(basename, page_num))
            page.save(output, 'JPEG')

        super().__init__(
            source_path=[self._tmp_storage],
            step=1,
            start=0,
            stop=0,
        )

    def __del__(self):
        self.delete_tmp_dir(self._tmp_dir)

class VideoExtractor(IMediaExtractor):
    def __init__(self, source_path, step=1, start=0, stop=0):
        self._tmp_dir = self.create_tmp_dir()
        self._imagename_pattern = {
            'cmd': '%09d.tiff',
            'py': '{:09d}.tiff'
        }
        self._output_fps = 25
        self._tmp_dir = self.create_tmp_dir()

        super().__init__(
            source_path=source_path,
            step=step,
            start=start,
            stop=stop,
        )

    def __del__(self):
        self.delete_tmp_dir(self._tmp_dir)

    def _get_av_container(self):
        container = av.open(av.datasets.curated(self._source_path[0]))
        return container

    def save_as_chunks(self, chunk_size, compressed_chunk_path, original_chunk_path, progress_callback=None, quality=100):
        if not self._source_path:
            raise Exception('No data to compress')

        # # translate inversed range 1:100 to 2:32
        translated_quality = 101 - quality
        translated_quality = round((((translated_quality - 1) * (31 - 2)) / (100 - 1)) + 2)

        container = self._get_av_container()
        container.streams.video[0].thread_type = 'AUTO'

        def decode_frames(container):
            for packet in container.demux():
                for frame in packet.decode():
                    yield frame

        def generate_chunks(container, count):
            it = itertools.islice(decode_frames(container), self._start, self._stop if self._stop else None)
            frames = list(itertools.islice(it, 0, count * self._step, self._step))
            while frames:
                yield frames
                frames = list(itertools.islice(it, 0, count * self._step, self._step))

        frame_count = 0
        for chunk_idx, frames in enumerate(generate_chunks(container, chunk_size)):
            for f in os.listdir(self._tmp_dir):
                os.remove(os.path.join(self._tmp_dir, f))
            for frame in frames:
                frame.to_image().save(os.path.join(self._tmp_dir,  self._imagename_pattern['py'].format(frame.index)), compression='raw')
                frame_count += 1
            start_frame = self._start + chunk_idx * chunk_size
            input_images = os.path.join(self._tmp_dir, self._imagename_pattern['cmd'])
            input_options = '-f image2 -framerate {} -start_number {}'.format(self._output_fps, start_frame)
            output_chunk = compressed_chunk_path(chunk_idx)
            output_options = '-vframes {} -codec:v mpeg1video -q:v {} '.format(chunk_size, translated_quality)

            ff = FFmpeg(
                inputs  = {input_images: input_options},
                outputs = {output_chunk: output_options},
            )
            ff.run()

            output_chunk = original_chunk_path(chunk_idx)
            output_options = '-vframes {} -codec:v mpeg1video -q:v {}'.format(chunk_size, 0)
            ff = FFmpeg(
                inputs  = {input_images: input_options},
                outputs = {output_chunk: output_options},
            )
            ff.run()
            if progress_callback and container.streams.video[0].frames:
                progress_callback(chunk_idx * chunk_size / container.streams.video[0].frames)

        return [{'name': self._source_path[0], 'size': (frame.width, frame.height)}], frame_count

    def save_preview(self, preview_path):
        frame_decoder = self._get_av_container().decode()
        preview = next(frame_decoder)
        preview.to_image().save(preview_path)

def _is_archive(path):
    mime = mimetypes.guess_type(path)
    mime_type = mime[0]
    encoding = mime[1]
    supportedArchives = ['application/zip', 'application/x-rar-compressed',
        'application/x-tar', 'application/x-7z-compressed', 'application/x-cpio',
        'gzip', 'bzip2']
    return mime_type in supportedArchives or encoding in supportedArchives

def _is_video(path):
    mime = mimetypes.guess_type(path)
    return mime[0] is not None and mime[0].startswith('video')

def _is_image(path):
    mime = mimetypes.guess_type(path)
    # Exclude vector graphic images because Pillow cannot work with them
    return mime[0] is not None and mime[0].startswith('image') and \
        not mime[0].startswith('image/svg')

def _is_dir(path):
    return os.path.isdir(path)

def _is_pdf(path):
    mime = mimetypes.guess_type(path)
    return mime[0] == 'application/pdf'

# 'has_mime_type': function receives 1 argument - path to file.
#                  Should return True if file has specified media type.
# 'extractor': class that extracts images from specified media.
# 'mode': 'annotation' or 'interpolation' - mode of task that should be created.
# 'unique': True or False - describes how the type can be combined with other.
#           True - only one item of this type and no other is allowed
#           False - this media types can be combined with other which have unique == False

MEDIA_TYPES = {
    'image': {
        'has_mime_type': _is_image,
        'extractor': ImageListExtractor,
        'mode': 'annotation',
        'unique': False,
    },
    'video': {
        'has_mime_type': _is_video,
        'extractor': VideoExtractor,
        'mode': 'interpolation',
        'unique': True,
    },
    'archive': {
        'has_mime_type': _is_archive,
        'extractor': ArchiveExtractor,
        'mode': 'annotation',
        'unique': True,
    },
    'directory': {
        'has_mime_type': _is_dir,
        'extractor': DirectoryExtractor,
        'mode': 'annotation',
        'unique': False,
    },
    'pdf': {
        'has_mime_type': _is_pdf,
        'extractor': PDFExtractor,
        'mode': 'annotation',
        'unique': True,
    },
}
