import os
import tempfile
import shutil
import numpy as np

from ffmpy import FFmpeg
from pyunpack import Archive
from PIL import Image

class MediaExtractor:
    def __init__(self, source_path, dest_path, image_quality):
        self._source_path = source_path
        self._dest_path = dest_path
        self._image_quality = image_quality

    def get_source_name(self):
        return self._source_path

class ImageListExtractor(MediaExtractor):
    def __init__(self, source_path, dest_path, image_quality):
        if not source_path:
            raise Exception('No image found')
        super().__init__(source_path, dest_path, image_quality)

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

class DirectoryExtractor(ImageListExtractor):
    def __init__(self, source_path, dest_path, image_quality):
        from cvat.apps.engine.settings import _get_mime
        image_paths = []
        for source in source_path:
            for root, _, files in os.walk(source):
                paths = [os.path.join(root, f) for f in files]
                paths = filter(lambda x: _get_mime(x) == 'image', paths)
                image_paths.extend(paths)
        image_paths.sort()
        super().__init__(image_paths, dest_path, image_quality)

class ArchiveExtractor(ImageListExtractor):
    def __init__(self, source_path, dest_path, image_quality):
        from cvat.apps.engine.settings import _get_mime
        Archive(source_path[0]).extractall(dest_path)
        os.remove(source_path[0])
        image_paths = []
        for root, _, files in os.walk(dest_path):
            paths = [os.path.join(root, f) for f in files]
            paths = filter(lambda x: _get_mime(x) == 'image', paths)
            image_paths.extend(paths)
        image_paths.sort()
        super().__init__(image_paths, dest_path, image_quality)

class VideoExtractor(MediaExtractor):
    def __init__(self, source_path, dest_path, image_quality):
        from cvat.apps.engine.log import slogger
        _dest_path = tempfile.mkdtemp(prefix='cvat-', suffix='.data')
        super().__init__(source_path[0], _dest_path, image_quality)
        # translate inversed range 1:95 to 2:32
        translated_quality = 96 - self._image_quality
        translated_quality = round((((translated_quality - 1) * (31 - 2)) / (95 - 1)) + 2)
        self._tmp_output = tempfile.mkdtemp(prefix='cvat-', suffix='.data')
        target_path = os.path.join(self._tmp_output, '%d.jpg')
        output_opts = '-start_number 0 -b:v 10000k -vsync 0 -an -y -q:v ' + str(translated_quality)

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
