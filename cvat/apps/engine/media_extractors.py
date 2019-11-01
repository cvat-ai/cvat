import os
import tempfile
import shutil
import numpy as np
import zipfile
import math
from io import BytesIO

from ffmpy import FFmpeg
from pyunpack import Archive
from PIL import Image

from cvat.apps.engine.log import slogger
import mimetypes
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

class MediaExtractor:
    def __init__(self, source_path, image_quality, step, start, stop):
        self._source_path = sorted(source_path)
        self._image_quality = image_quality
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

    @staticmethod
    def prepare_dirs(file_path):
        dirname = os.path.dirname(file_path)
        if not os.path.exists(dirname):
            os.makedirs(dirname)

#Note step, start, stop have no affect
class ImageListExtractor(MediaExtractor):
    def __init__(self, source_path, image_quality, step=1, start=0, stop=0):
        if not source_path:
            raise Exception('No image found')
        super().__init__(
            source_path=source_path,
            image_quality=image_quality,
            step=1,
            start=0,
            stop=0,
        )

    def __iter__(self):
        return iter(self._source_path)

    def __getitem__(self, k):
        return self._source_path[k]

    def compress_image(self, image_path):
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
        converted_image.save(buf, format='JPEG', quality=self._image_quality, optimize=True)
        buf.seek(0)
        width, height = converted_image.size
        converted_image.close()
        return width, height, buf

    def save_image(self, k, dest_path):
        w, h, compressed_image = self.compress_image(self[k])
        with open(dest_path, 'wb') as f:
            f.write(compressed_image.getvalue())
        return w, h

    def save_as_chunks(self, chunk_size, task, progress_callback=None):
        counter = 0
        media_meta = []
        total_length = len(self._source_path)
        for i in range(0, total_length, chunk_size):
            chunk_data = self._source_path[i:i + chunk_size]
            archive_name = task.get_chunk_path(counter)
            self.prepare_dirs(archive_name)
            with zipfile.ZipFile(archive_name, 'x') as zip_chunk:
                for idx, image_file in enumerate(chunk_data):
                    w, h, image_buf = self.compress_image(image_file)
                    media_meta.append({
                        'name': image_file,
                        'size': (w, h),
                    })
                    arcname = '{:06d}.jpeg'.format(idx)
                    zip_chunk.writestr(arcname, image_buf.getvalue())
            counter += 1
            if progress_callback:
                progress_callback(i / total_length)
        return media_meta, total_length

    def save_preview(self, preview_path):
        shutil.copyfile(self._source_path[0], preview_path)

#Note step, start, stop have no affect
class DirectoryExtractor(ImageListExtractor):
    def __init__(self, source_path, image_quality, step=1, start=0, stop=0):
        image_paths = []
        for source in source_path:
            for root, _, files in os.walk(source):
                paths = [os.path.join(root, f) for f in files]
                paths = filter(lambda x: get_mime(x) == 'image', paths)
                image_paths.extend(paths)
        super().__init__(
            source_path=image_paths,
            image_quality=image_quality,
            step=1,
            start=0,
            stop=0,
        )

#Note step, start, stop have no affect
class ArchiveExtractor(DirectoryExtractor):
    def __init__(self, source_path, image_quality, step=1, start=0, stop=0):
        self._tmp_dir = self.create_tmp_dir()
        Archive(source_path[0]).extractall(self._tmp_dir)
        super().__init__(
            source_path=[self._tmp_dir],
            image_quality=image_quality,
            step=1,
            start=0,
            stop=0,
        )

    def __del__(self):
        self.delete_tmp_dir(self._tmp_dir)

#Note step, start, stop have no affect
class PDFExtractor(DirectoryExtractor):
    def __init__(self, source_path, image_quality, step=1, start=0, stop=0):
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
            image_quality=image_quality,
            step=1,
            start=0,
            stop=0,
        )

    def __del__(self):
        self.delete_tmp_dir(self._tmp_dir)

class VideoExtractor(DirectoryExtractor):
    def __init__(self, source_path, image_quality, step=1, start=0, stop=0):
        self._tmp_dir = self.create_tmp_dir()
        self._video_source = source_path[0]
        self._imagename_pattern = '%09d.jpeg'
        self.extract_video(
            video_source=self._video_source,
            output_dir=self._tmp_dir,
            quality=image_quality,
            step=step,
            start=start,
            stop=stop,
            imagename_pattern=self._imagename_pattern,
        )

        super().__init__(
            source_path=[self._tmp_dir],
            image_quality=image_quality,
            step=step,
            start=start,
            stop=stop,
        )

    @staticmethod
    def extract_video(video_source, output_dir, quality, step=1, start=0, stop=0, imagename_pattern='%09d.jpeg'):
        # translate inversed range 1:95 to 2:32
        translated_quality = 96 - quality
        translated_quality = round((((translated_quality - 1) * (31 - 2)) / (95 - 1)) + 2)
        target_path = os.path.join(output_dir, imagename_pattern)
        output_opts = '-start_number 0 -b:v 10000k -vsync 0 -an -y -q:v {}'.format(translated_quality)
        filters = ''
        if stop > 0:
            filters = 'between(n,' + str(start) + ',' + str(stop) + ')'
        elif start > 0:
            filters = 'gte(n,' + str(start) + ')'

        if step > 1:
            filters += ('*' if filters else '') + 'not(mod(n-' + str(start) + ',' + str(step) + '))'

        if filters:
            output_opts += " -vf select=\"'" + filters + "'\""

        ff = FFmpeg(
            inputs  = {video_source: None},
            outputs = {target_path: output_opts},
        )

        slogger.glob.info("FFMpeg cmd: {} ".format(ff.cmd))
        ff.run()

    def __del__(self):
        self.delete_tmp_dir(self._tmp_dir)

    def save_image(self, k, dest_path):
        shutil.copyfile(self[k], dest_path)

    def save_as_chunks(self, chunk_size, task, progress_callback=None):
        if not self._source_path:
            raise Exception('No data to compress')
        for i in range(math.ceil(len(self._source_path) / chunk_size)):
            start_frame = i * chunk_size
            input_images = os.path.join(self._tmp_dir, self._imagename_pattern)
            input_options = '-f image2 -framerate 25 -start_number {}'.format(start_frame)
            output_chunk = task.get_chunk_path(i)
            self.prepare_dirs(output_chunk)
            output_options = '-vframes {} -f mpegts -c:a none -codec:v mpeg1video -bf 0 -b:v 800k'.format(chunk_size)

            ff = FFmpeg(
                inputs  = {input_images: input_options},
                outputs = {output_chunk: output_options},
            )

            slogger.glob.info("FFMpeg cmd: {} ".format(ff.cmd))
            ff.run()
            if progress_callback:
                progress_callback(i / len(self._source_path))
        image = Image.open(self[0])
        width, height = image.size
        image.close()
        return [{'name': self._video_source, 'size': (width, height)}], len(self._source_path)

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
