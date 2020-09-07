
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

# pylint: disable=unused-import

from enum import Enum
from io import BytesIO
import numpy as np
import os
import os.path as osp

_IMAGE_BACKENDS = Enum('_IMAGE_BACKENDS', ['cv2', 'PIL'])
_IMAGE_BACKEND = None
try:
    import cv2
    _IMAGE_BACKEND = _IMAGE_BACKENDS.cv2
except ImportError:
    import PIL
    _IMAGE_BACKEND = _IMAGE_BACKENDS.PIL

from datumaro.util.image_cache import ImageCache as _ImageCache


def load_image(path):
    """
    Reads an image in the HWC Grayscale/BGR(A) float [0; 255] format.
    """

    if _IMAGE_BACKEND == _IMAGE_BACKENDS.cv2:
        import cv2
        image = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        image = image.astype(np.float32)
    elif _IMAGE_BACKEND == _IMAGE_BACKENDS.PIL:
        from PIL import Image
        image = Image.open(path)
        image = np.asarray(image, dtype=np.float32)
        if len(image.shape) == 3 and image.shape[2] in {3, 4}:
            image[:, :, :3] = image[:, :, 2::-1] # RGB to BGR
    else:
        raise NotImplementedError()

    if image is None:
        raise ValueError("Can't open image '%s'" % path)
    assert len(image.shape) in {2, 3}
    if len(image.shape) == 3:
        assert image.shape[2] in {3, 4}
    return image

def save_image(path, image, create_dir=False, **kwargs):
    # NOTE: Check destination path for existence
    # OpenCV silently fails if target directory does not exist
    dst_dir = osp.dirname(path)
    if dst_dir:
        if create_dir:
            os.makedirs(dst_dir, exist_ok=True)
        elif not osp.isdir(dst_dir):
            raise FileNotFoundError("Directory does not exist: '%s'" % dst_dir)

    if not kwargs:
        kwargs = {}

    if _IMAGE_BACKEND == _IMAGE_BACKENDS.cv2:
        import cv2

        params = []

        ext = path[-4:]
        if ext.upper() == '.JPG':
            params = [
                int(cv2.IMWRITE_JPEG_QUALITY), kwargs.get('jpeg_quality', 75)
            ]

        image = image.astype(np.uint8)
        cv2.imwrite(path, image, params=params)
    elif _IMAGE_BACKEND == _IMAGE_BACKENDS.PIL:
        from PIL import Image

        params = {}
        params['quality'] = kwargs.get('jpeg_quality')
        if kwargs.get('jpeg_quality') == 100:
            params['subsampling'] = 0

        image = image.astype(np.uint8)
        if len(image.shape) == 3 and image.shape[2] in {3, 4}:
            image[:, :, :3] = image[:, :, 2::-1] # BGR to RGB
        image = Image.fromarray(image)
        image.save(path, **params)
    else:
        raise NotImplementedError()

def encode_image(image, ext, **kwargs):
    if not kwargs:
        kwargs = {}

    if _IMAGE_BACKEND == _IMAGE_BACKENDS.cv2:
        import cv2

        params = []

        if not ext.startswith('.'):
            ext = '.' + ext

        if ext.upper() == '.JPG':
            params = [
                int(cv2.IMWRITE_JPEG_QUALITY), kwargs.get('jpeg_quality', 75)
            ]

        image = image.astype(np.uint8)
        success, result = cv2.imencode(ext, image, params=params)
        if not success:
            raise Exception("Failed to encode image to '%s' format" % (ext))
        return result.tobytes()
    elif _IMAGE_BACKEND == _IMAGE_BACKENDS.PIL:
        from PIL import Image

        if ext.startswith('.'):
            ext = ext[1:]

        params = {}
        params['quality'] = kwargs.get('jpeg_quality')
        if kwargs.get('jpeg_quality') == 100:
            params['subsampling'] = 0

        image = image.astype(np.uint8)
        if len(image.shape) == 3 and image.shape[2] in {3, 4}:
            image[:, :, :3] = image[:, :, 2::-1] # BGR to RGB
        image = Image.fromarray(image)
        with BytesIO() as buffer:
            image.save(buffer, format=ext, **params)
            return buffer.getvalue()
    else:
        raise NotImplementedError()

def decode_image(image_bytes):
    if _IMAGE_BACKEND == _IMAGE_BACKENDS.cv2:
        import cv2
        image = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image, cv2.IMREAD_UNCHANGED)
        image = image.astype(np.float32)
    elif _IMAGE_BACKEND == _IMAGE_BACKENDS.PIL:
        from PIL import Image
        image = Image.open(BytesIO(image_bytes))
        image = np.asarray(image, dtype=np.float32)
        if len(image.shape) == 3 and image.shape[2] in {3, 4}:
            image[:, :, :3] = image[:, :, 2::-1] # RGB to BGR
    else:
        raise NotImplementedError()

    assert len(image.shape) in {2, 3}
    if len(image.shape) == 3:
        assert image.shape[2] in {3, 4}
    return image


class lazy_image:
    def __init__(self, path, loader=None, cache=None):
        if loader is None:
            loader = load_image
        self.path = path
        self.loader = loader

        # Cache:
        # - False: do not cache
        # - None: use the global cache
        # - object: an object to be used as cache
        assert cache in {None, False} or isinstance(cache, object)
        self.cache = cache

    def __call__(self):
        image = None
        image_id = hash(self) # path is not necessary hashable or a file path

        cache = self._get_cache(self.cache)
        if cache is not None:
            image = cache.get(image_id)

        if image is None:
            image = self.loader(self.path)
            if cache is not None:
                cache.push(image_id, image)
        return image

    @staticmethod
    def _get_cache(cache):
        if cache is None:
            cache = _ImageCache.get_instance()
        elif cache == False:
            return None
        return cache

    def __hash__(self):
        return hash((id(self), self.path, self.loader))

class Image:
    def __init__(self, data=None, path=None, loader=None, cache=None,
            size=None):
        assert size is None or len(size) == 2
        if size is not None:
            assert len(size) == 2 and 0 < size[0] and 0 < size[1], size
            size = tuple(size)
        self._size = size # (H, W)

        assert path is None or isinstance(path, str)
        if path is None:
            path = ''
        self._path = path

        assert data is not None or path or loader, "Image can not be empty"
        if data is not None:
            assert callable(data) or isinstance(data, np.ndarray), type(data)
        if data is None and (path or loader):
            if osp.isfile(path) or loader:
                data = lazy_image(path, loader=loader, cache=cache)
        self._data = data

    @property
    def path(self):
        return self._path

    @property
    def data(self):
        if callable(self._data):
            return self._data()
        return self._data

    @property
    def has_data(self):
        return self._data is not None

    @property
    def size(self):
        if self._size is None:
            data = self.data
            if data is not None:
                self._size = data.shape[:2]
        return self._size

    def __eq__(self, other):
        if isinstance(other, np.ndarray):
            return self.has_data and np.array_equal(self.data, other)

        if not isinstance(other, __class__):
            return False
        return \
            (np.array_equal(self.size, other.size)) and \
            (self.has_data == other.has_data) and \
            (self.has_data and np.array_equal(self.data, other.data) or \
                not self.has_data)