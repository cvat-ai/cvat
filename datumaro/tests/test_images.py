import numpy as np
import os.path as osp
from PIL import Image

from unittest import TestCase

from datumaro.util.test_utils import TestDir
from datumaro.util.image import lazy_image
from datumaro.util.image_cache import ImageCache


class LazyImageTest(TestCase):
    def test_cache_works(self):
        with TestDir() as test_dir:
            image = np.ones((100, 100, 3), dtype=np.uint8)
            image = Image.fromarray(image).convert('RGB')

            image_path = osp.join(test_dir.path, 'image.jpg')
            image.save(image_path)

            caching_loader = lazy_image(image_path, cache=None)
            self.assertTrue(caching_loader() is caching_loader())

            non_caching_loader = lazy_image(image_path, cache=False)
            self.assertFalse(non_caching_loader() is non_caching_loader())

class ImageCacheTest(TestCase):
    def test_cache_fifo_displacement(self):
        capacity = 2
        cache = ImageCache(capacity)

        loaders = [lazy_image(None, loader=lambda p: object(), cache=cache)
            for _ in range(capacity + 1)]

        first_request = [loader() for loader in loaders[1 : ]]
        loaders[0]() # pop something from the cache

        second_request = [loader() for loader in loaders[2 : ]]
        second_request.insert(0, loaders[1]())

        matches = sum([a is b for a, b in zip(first_request, second_request)])
        self.assertEqual(matches, len(first_request) - 1)

    def test_global_cache_is_accessible(self):
        loader = lazy_image(None, loader=lambda p: object())

        ImageCache.get_instance().clear()
        self.assertTrue(loader() is loader())
        self.assertEqual(ImageCache.get_instance().size(), 1)