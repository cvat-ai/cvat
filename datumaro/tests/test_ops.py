import numpy as np

from datumaro.components.extractor import (Extractor, DatasetItem, Label,
    Mask, Bbox, Points, Caption)
from datumaro.components.project import Dataset
from datumaro.components.operations import mean_std, compute_ann_statistics

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

    def test_stats(self):
        dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=np.ones((5, 5, 3)), annotations=[
                Caption('hello'),
                Caption('world'),
                Label(2, attributes={ 'x': 1, 'y': '2', }),
                Bbox(1, 2, 2, 2, label=2, attributes={ 'score': 0.5, }),
                Bbox(5, 6, 2, 2, attributes={
                    'x': 1, 'y': '3', 'occluded': True,
                }),
                Points([1, 2, 2, 0, 1, 1], label=0),
                Mask(label=3, image=np.array([
                    [0, 0, 1, 1, 1],
                    [0, 0, 1, 1, 1],
                    [0, 0, 1, 1, 1],
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                ])),
            ]),
            DatasetItem(id=2, image=np.ones((2, 4, 3)), annotations=[
                Label(2, attributes={ 'x': 2, 'y': '2', }),
                Bbox(1, 2, 2, 2, label=3, attributes={ 'score': 0.5, }),
                Bbox(5, 6, 2, 2, attributes={
                    'x': 2, 'y': '3', 'occluded': False,
                }),
            ]),
            DatasetItem(id=3),
        ], categories=['label_%s' % i for i in range(4)])

        expected = {
            'images count': 3,
            'annotations count': 10,
            'unannotated images count': 1,
            'unannotated images': ['3'],
            'annotations by type': {
                'label': { 'count': 2, },
                'polygon': { 'count': 0, },
                'polyline': { 'count': 0, },
                'bbox': { 'count': 4, },
                'mask': { 'count': 1, },
                'points': { 'count': 1, },
                'caption': { 'count': 2, },
            },
            'annotations': {
                'labels': {
                    'count': 6,
                    'distribution': {
                        'label_0': [1, 1/6],
                        'label_1': [0, 0.0],
                        'label_2': [3, 3/6],
                        'label_3': [2, 2/6],
                    },
                    'attributes': {
                        'x': {
                            'count': 2, # unnotations with no label are skipped
                            'values count': 2,
                            'values present': ['1', '2'],
                            'distribution': {
                                '1': [1, 1/2],
                                '2': [1, 1/2],
                            },
                        },
                        'y': {
                            'count': 2, # unnotations with no label are skipped
                            'values count': 1,
                            'values present': ['2'],
                            'distribution': {
                                '2': [2, 2/2],
                            },
                        },
                        # must not include "special" attributes like "occluded"
                    }
                },
                'segments': {
                    'avg. area': (4 * 2 + 9 * 1) / 3,
                    'area distribution': [
                        {'min': 4.0, 'max': 4.5, 'count': 2, 'percent': 2/3},
                        {'min': 4.5, 'max': 5.0, 'count': 0, 'percent': 0.0},
                        {'min': 5.0, 'max': 5.5, 'count': 0, 'percent': 0.0},
                        {'min': 5.5, 'max': 6.0, 'count': 0, 'percent': 0.0},
                        {'min': 6.0, 'max': 6.5, 'count': 0, 'percent': 0.0},
                        {'min': 6.5, 'max': 7.0, 'count': 0, 'percent': 0.0},
                        {'min': 7.0, 'max': 7.5, 'count': 0, 'percent': 0.0},
                        {'min': 7.5, 'max': 8.0, 'count': 0, 'percent': 0.0},
                        {'min': 8.0, 'max': 8.5, 'count': 0, 'percent': 0.0},
                        {'min': 8.5, 'max': 9.0, 'count': 1, 'percent': 1/3},
                    ],
                    'pixel distribution': {
                        'label_0': [0, 0.0],
                        'label_1': [0, 0.0],
                        'label_2': [4, 4/17],
                        'label_3': [13, 13/17],
                    },
                }
            },
        }

        actual = compute_ann_statistics(dataset)

        self.assertEqual(expected, actual)