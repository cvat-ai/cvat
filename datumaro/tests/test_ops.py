import numpy as np

from datumaro.components.extractor import Extractor, DatasetItem
from datumaro.components.operations import mean_std

from unittest import TestCase


class TestOperations(TestCase):
    def test_mean_std(self):
        expected_mean = [100, 50, 150]
        expected_std = [20, 50, 10]

        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=np.random.normal(
                        expected_mean, expected_std,
                        size=(w, h, 3))
                    )
                    for i, (w, h) in enumerate([
                        (3000, 100), (800, 600), (400, 200), (700, 300)
                    ])
                ])

        actual_mean, actual_std = mean_std(TestExtractor())

        for em, am in zip(expected_mean, actual_mean):
            self.assertAlmostEqual(em, am, places=0)
        for estd, astd in zip(expected_std, actual_std):
            self.assertAlmostEqual(estd, astd, places=0)