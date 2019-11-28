import numpy as np
import os.path as osp
from PIL import Image
import timeit

from unittest import TestCase

from datumaro.util.test_utils import TestDir
from datumaro.util.image import lazy_image


class LazyImageTest(TestCase):
    def test_cache_works(self):
        test_code = 'image()'
        iterations = 1000

        with TestDir() as test_dir:
            image = np.ones((100, 100, 3), dtype=np.uint8)
            image = Image.fromarray(image).convert('RGB')

            image_path = osp.join(test_dir.path, 'image.jpg')
            image.save(image_path)


            caching_time = timeit.timeit(test_code,
                globals={ 'image': lazy_image(image_path, cache=True) },
                number=iterations)

            non_caching_time = timeit.timeit(test_code,
                globals={ 'image': lazy_image(image_path, cache=False) },
                number=iterations)

            self.assertLessEqual(caching_time, non_caching_time)