import numpy as np
import os.path as osp
from PIL import Image

from unittest import TestCase

from datumaro.util.test_utils import TestDir
from datumaro.util.image import lazy_image


class LazyImageTest(TestCase):
    def test_cache_works(self):
        with TestDir() as test_dir:
            image = np.ones((100, 100, 3), dtype=np.uint8)
            image = Image.fromarray(image).convert('RGB')

            image_path = osp.join(test_dir.path, 'image.jpg')
            image.save(image_path)

            caching_loader = lazy_image(image_path, cache=True)
            self.assertTrue(caching_loader() is caching_loader())

            non_caching_loader = lazy_image(image_path, cache=False)
            self.assertFalse(non_caching_loader() is non_caching_loader())
