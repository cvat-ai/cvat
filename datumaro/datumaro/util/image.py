
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

# pylint: disable=unused-import

from io import BytesIO
import numpy as np

from enum import Enum
_IMAGE_BACKENDS = Enum('_IMAGE_BACKENDS', ['cv2', 'PIL'])
_IMAGE_BACKEND = None
try:
    import cv2
    _IMAGE_BACKEND = _IMAGE_BACKENDS.cv2
except ModuleNotFoundError:
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
        if len(image.shape) == 3 and image.shape[2] in [3, 4]:
            image[:, :, :3] = image[:, :, 2::-1] # RGB to BGR
    else:
        raise NotImplementedError()

    assert len(image.shape) in [2, 3]
    if len(image.shape) == 3:
        assert image.shape[2] in [3, 4]
    return image

def save_image(path, image, params=None):
    if _IMAGE_BACKEND == _IMAGE_BACKENDS.cv2:
        import cv2
        ext = path[-4:]
        if ext.upper() == '.JPG':
            params = [ int(cv2.IMWRITE_JPEG_QUALITY), 75 ]

        image = image.astype(np.uint8)
        cv2.imwrite(path, image, params=params)
    elif _IMAGE_BACKEND == _IMAGE_BACKENDS.PIL:
        from PIL import Image

        if not params:
            params = {}

        image = image.astype(np.uint8)
        if len(image.shape) == 3 and image.shape[2] in [3, 4]:
            image[:, :, :3] = image[:, :, 2::-1] # BGR to RGB
        image = Image.fromarray(image)
        image.save(path, **params)
    else:
        raise NotImplementedError()

def encode_image(image, ext, params=None):
    if _IMAGE_BACKEND == _IMAGE_BACKENDS.cv2:
        import cv2

        if not ext.startswith('.'):
            ext = '.' + ext

        if ext.upper() == '.JPG':
            params = [ int(cv2.IMWRITE_JPEG_QUALITY), 75 ]

        image = image.astype(np.uint8)
        success, result = cv2.imencode(ext, image, params=params)
        if not success:
            raise Exception("Failed to encode image to '%s' format" % (ext))
        return result.tobytes()
    elif _IMAGE_BACKEND == _IMAGE_BACKENDS.PIL:
        from PIL import Image

        if ext.startswith('.'):
            ext = ext[1:]

        if not params:
            params = {}

        image = image.astype(np.uint8)
        if len(image.shape) == 3 and image.shape[2] in [3, 4]:
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
        if len(image.shape) == 3 and image.shape[2] in [3, 4]:
            image[:, :, :3] = image[:, :, 2::-1] # RGB to BGR
    else:
        raise NotImplementedError()

    assert len(image.shape) in [2, 3]
    if len(image.shape) == 3:
        assert image.shape[2] in [3, 4]
    return image


class lazy_image:
    def __init__(self, path, loader=load_image, cache=None):
        self.path = path
        self.loader = loader

        # Cache:
        # - False: do not cache
        # - None: use default (don't store in a class variable)
        # - object: use this object as a cache
        assert cache in [None, False] or isinstance(cache, object)
        self.cache = cache

    def __call__(self):
        image = None
        image_id = id(self) # path is not necessary hashable or a file path

        cache = self._get_cache()
        if cache is not None:
            image = self._get_cache().get(image_id)

        if image is None:
            image = self.loader(self.path)
            if cache is not None:
                cache.push(image_id, image)
        return image

    def _get_cache(self):
        cache = self.cache
        if cache is None:
            cache = _ImageCache.get_instance()
        elif cache == False:
            return None
        return cache
