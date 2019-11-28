
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import cv2
import numpy as np

from datumaro.util.image_cache import ImageCache as _ImageCache


def load_image(path):
    """
    Reads an image in the HWC Grayscale/BGR(A) float [0; 255] format.
    """
    image = cv2.imread(path)
    image = image.astype(np.float32)

    assert len(image.shape) == 3
    assert image.shape[2] in [1, 3, 4]
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