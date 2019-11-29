from itertools import product
import numpy as np
import os.path as osp

from unittest import TestCase

import datumaro.util.image as image_module
from datumaro.util.test_utils import TestDir


class ImageTest(TestCase):
    def setUp(self):
        self.default_backend = image_module._IMAGE_BACKEND

    def tearDown(self):
        image_module._IMAGE_BACKEND = self.default_backend

    def _test_can_save_and_load(self, src_image, path,
            save_backend=None, load_backend=None):
        if save_backend:
            image_module._IMAGE_BACKEND = save_backend
        image_module.save_image(path, src_image)

        if load_backend:
            image_module._IMAGE_BACKEND = load_backend
        dst_image = image_module.load_image(path)

        self.assertTrue(np.all(src_image == dst_image), 'save: %s, load: %s' % \
            (save_backend, load_backend))

    def test_save_and_load_backends(self):
        backends = image_module._IMAGE_BACKENDS
        for save_backend, load_backend in product(backends, backends):
            with TestDir() as test_dir:
                src_image = np.random.random_integers(0, 255, (2, 4, 3))
                image_path = osp.join(test_dir.path, 'img.png')

                self._test_can_save_and_load(src_image, image_path,
                    save_backend, load_backend)