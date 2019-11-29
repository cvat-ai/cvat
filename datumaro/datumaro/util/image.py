
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

# pylint: disable=unused-import

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
        image = cv2.imread(path)
        image = image.astype(np.float32)
    elif _IMAGE_BACKEND == _IMAGE_BACKENDS.PIL:
        from PIL import Image
        image = Image.open(path)
        image = np.asarray(image, dtype=np.float32)
        if len(image.shape) == 3 and image.shape[2] in [3, 4]:
            image[:, :, :3] = image[:, :, 2::-1] # RGB to BGR
    else:
        raise NotImplementedError()

    assert len(image.shape) == 3
    assert image.shape[2] in [1, 3, 4]
    return image

def save_image(path, image):
    if _IMAGE_BACKEND == _IMAGE_BACKENDS.cv2:
        import cv2
        cv2.imwrite(path, image)
    elif _IMAGE_BACKEND == _IMAGE_BACKENDS.PIL:
        from PIL import Image
        image = image.astype(np.uint8)
        if len(image.shape) == 3 and image.shape[2] in [3, 4]:
            image[:, :, :3] = image[:, :, 2::-1] # BGR to RGB
        image = Image.fromarray(image)
        image.save(path)
    else:
        raise NotImplementedError()


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