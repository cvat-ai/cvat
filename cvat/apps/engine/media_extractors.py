import os
import tempfile
import shutil
import numpy as np

from ffmpy import FFmpeg
from pyunpack import Archive
from PIL import Image

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
    def __init__(self, source_path, dest_path, image_quality, step, start, stop):
        self._source_path = source_path
        self._dest_path = dest_path
        self._image_quality = image_quality
        self._step = step
        self._start = start
        self._stop = stop

    def get_source_name(self):
        return self._source_path

#Note step, start, stop have no affect
class ImageListExtractor(MediaExtractor):
    def __init__(self, source_path, dest_path, image_quality, step=1, start=0, stop=0):
        if not source_path:
            raise Exception('No image found')
        super().__init__(
            source_path=sorted(source_path),
            dest_path=dest_path,
            image_quality=image_quality,
            step=1,
            start=0,
            stop=0,
        )

    def __iter__(self):
        return iter(self._source_path)

    def __getitem__(self, k):
        return self._source_path[k]

    def __len__(self):
        return len(self._source_path)

    def save_image(self, k, dest_path):
        image = Image.open(self[k])
        # Ensure image data fits into 8bit per pixel before RGB conversion as PIL clips values on conversion
        if image.mode == "I":
            # Image mode is 32bit integer pixels.
            # Autoscale pixels by factor 2**8 / im_data.max() to fit into 8bit
            im_data = np.array(image)
            im_data = im_data * (2**8 / im_data.max())
            image = Image.fromarray(im_data.astype(np.int32))
        image = image.convert('RGB')
        image.save(dest_path, quality=self._image_quality, optimize=True)
        height = image.height
        width = image.width
        image.close()
        return width, height

class PDFExtractor(MediaExtractor):
    def __init__(self, source_path, dest_path, image_quality, step=1, start=0, stop=0):
        if not source_path:
            raise Exception('No PDF found')

        from pdf2image import convert_from_path
        self._temp_directory = tempfile.mkdtemp(prefix='cvat-')
        super().__init__(
            source_path=source_path[0],
            dest_path=dest_path,
            image_quality=image_quality,
            step=1,
            start=0,
            stop=0,
        )

        self._dimensions = []
        file_ = convert_from_path(self._source_path)
        self._basename = os.path.splitext(os.path.basename(self._source_path))[0]
        for page_num, page in enumerate(file_):
            output = os.path.join(self._temp_directory, self._basename + str(page_num) + '.jpg')
            self._dimensions.append(page.size)
            page.save(output, 'JPEG')

        self._length = len(os.listdir(self._temp_directory))

    def _get_imagepath(self, k):
        img_path = os.path.join(self._temp_directory, self._basename + str(k) + '.jpg')
        return img_path

    def __iter__(self):
        i = 0
        while os.path.exists(self._get_imagepath(i)):
            yield self._get_imagepath(i)
            i += 1

    def __del__(self):
        if self._temp_directory:
            shutil.rmtree(self._temp_directory)

    def __getitem__(self, k):
        return self._get_imagepath(k)

    def __len__(self):
        return self._length

    def save_image(self, k, dest_path):
        shutil.copyfile(self[k], dest_path)
        return self._dimensions[k]

#Note step, start, stop have no affect
class DirectoryExtractor(ImageListExtractor):
    def __init__(self, source_path, dest_path, image_quality, step=1, start=0, stop=0):
        image_paths = []
        for source in source_path:
            for root, _, files in os.walk(source):
                paths = [os.path.join(root, f) for f in files]
                paths = filter(lambda x: get_mime(x) == 'image', paths)
                image_paths.extend(paths)
        super().__init__(
            source_path=sorted(image_paths),
            dest_path=dest_path,
            image_quality=image_quality,
            step=1,
            start=0,
            stop=0,
        )

#Note step, start, stop have no affect
class ArchiveExtractor(DirectoryExtractor):
    def __init__(self, source_path, dest_path, image_quality, step=1, start=0, stop=0):
        Archive(source_path[0]).extractall(dest_path)
        super().__init__(
            source_path=[dest_path],
            dest_path=dest_path,
            image_quality=image_quality,
            step=1,
            start=0,
            stop=0,
        )

class VideoExtractor(MediaExtractor):
    def __init__(self, source_path, dest_path, image_quality, step=1, start=0, stop=0):
        from cvat.apps.engine.log import slogger
        _dest_path = tempfile.mkdtemp(prefix='cvat-', suffix='.data')
        super().__init__(
            source_path=source_path[0],
            dest_path=_dest_path,
            image_quality=image_quality,
            step=step,
            start=start,
            stop=stop,
            )
        # translate inversed range 1:95 to 2:32
        translated_quality = 96 - self._image_quality
        translated_quality = round((((translated_quality - 1) * (31 - 2)) / (95 - 1)) + 2)
        self._tmp_output = tempfile.mkdtemp(prefix='cvat-', suffix='.data')
        target_path = os.path.join(self._tmp_output, '%d.jpg')
        output_opts = '-start_number 0 -b:v 10000k -vsync 0 -an -y -q:v ' + str(translated_quality)
        filters = ''
        if self._stop > 0:
            filters = 'between(n,' + str(self._start) + ',' + str(self._stop) + ')'
        elif self._start > 0:
            filters = 'gte(n,' + str(self._start) + ')'
        if self._step > 1:
            filters += ('*' if filters else '') + 'not(mod(n-' + str(self._start) + ',' + str(self._step) + '))'
        if filters:
            output_opts += " -vf select=\"'" + filters + "'\""

        ff = FFmpeg(
            inputs  = {self._source_path: None},
            outputs = {target_path: output_opts})

        slogger.glob.info("FFMpeg cmd: {} ".format(ff.cmd))
        ff.run()

    def _getframepath(self, k):
        return "{0}/{1}.jpg".format(self._tmp_output, k)

    def __iter__(self):
        i = 0
        while os.path.exists(self._getframepath(i)):
            yield self._getframepath(i)
            i += 1

    def __del__(self):
        if self._tmp_output:
            shutil.rmtree(self._tmp_output)

    def __getitem__(self, k):
        return self._getframepath(k)

    def __len__(self):
        return len(os.listdir(self._tmp_output))

    def save_image(self, k, dest_path):
        shutil.copyfile(self[k], dest_path)

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
