import numpy as np
import os.path as osp

from unittest import TestCase

from datumaro.util.test_utils import TestDir
from datumaro.util.image import lazy_image, load_image, save_image, Image
from datumaro.util.image_cache import ImageCache


class LazyImageTest(TestCase):
    def test_cache_works(self):
        with TestDir() as test_dir:
            image = np.ones((100, 100, 3), dtype=np.uint8)
            image_path = osp.join(test_dir, 'image.jpg')
            save_image(image_path, image)

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

class ImageTest(TestCase):
    def test_lazy_image_shape(self):
        data = np.ones((5, 6, 7))

        image_lazy = Image(data=data, size=(2, 4))
        image_eager = Image(data=data)

        self.assertEqual((2, 4), image_lazy.size)
        self.assertEqual((5, 6), image_eager.size)

    def test_ctors(self):
        with TestDir() as test_dir:
            path = osp.join(test_dir, 'path.png')
            image = np.ones([2, 4, 3])
            save_image(path, image)

            for args in [
                { 'data': image },
                { 'data': image, 'path': path },
                { 'data': image, 'path': path, 'size': (2, 4) },
                { 'data': image, 'path': path, 'loader': load_image, 'size': (2, 4) },
                { 'path': path },
                { 'path': path, 'loader': load_image },
                { 'path': 'somepath', 'loader': lambda p: image },
                { 'loader': lambda p: image },
                { 'path': path, 'size': (2, 4) },
            ]:
                with self.subTest(**args):
                    img = Image(**args)
                    # pylint: disable=pointless-statement
                    if img.has_data:
                        img.data
                    img.size
                    # pylint: enable=pointless-statement
