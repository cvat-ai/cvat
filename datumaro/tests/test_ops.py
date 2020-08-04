import numpy as np

from datumaro.components.extractor import (Extractor, DatasetItem,
    Label, Bbox, Polygon, Points, Mask)
from datumaro.components.project import Dataset
from datumaro.components.operations import (mean_std, IntersectMerge,
    NoMatchingItemError, NoMatchingAnnError, FailedAttrVotingError)
from datumaro.util.test_utils import compare_datasets

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

class TestMultimerge(TestCase):
    def test_can_match_items(self):
        # items 1 and 3 are unique, item 2 is common and should be merged

        source0 = Dataset.from_iterable([
            DatasetItem(1, annotations=[ Label(0), ]),
            DatasetItem(2, annotations=[ Label(0), ]),
        ], categories=['a', 'b'])

        source1 = Dataset.from_iterable([
            DatasetItem(2, annotations=[ Label(1), ]),
            DatasetItem(3, annotations=[ Label(0), ]),
        ], categories=['a', 'b'])

        source2 = Dataset.from_iterable([
            DatasetItem(2, annotations=[ Label(0), Bbox(1, 2, 3, 4) ]),
        ], categories=['a', 'b'])

        expected = Dataset.from_iterable([
            DatasetItem(1, annotations=[
                Label(0, attributes={'score': 1/3}),
            ]),
            DatasetItem(2, annotations=[
                Label(0, attributes={'score': 2/3}),
                Label(1, attributes={'score': 1/3}),
                Bbox(1, 2, 3, 4, attributes={'score': 1.0}),
            ]),
            DatasetItem(3, annotations=[
                Label(0, attributes={'score': 1/3}),
            ]),
        ], categories=['a', 'b'])

        merger = IntersectMerge()
        merged = merger([source0, source1, source2])

        compare_datasets(self, expected, merged)
        self.assertEqual(
            [
                NoMatchingItemError(item_id=('1', ''), sources={1, 2}),
                NoMatchingItemError(item_id=('3', ''), sources={0, 2}),
            ],
            sorted((e for e in merger.errors
                    if isinstance(e, NoMatchingItemError)),
                key=lambda e: e.item_id)
        )
        self.assertEqual(
            [
                NoMatchingAnnError(item_id=('2', ''), sources={0, 1},
                    ann=source2.get('2').annotations[1]),
            ],
            sorted((e for e in merger.errors
                    if isinstance(e, NoMatchingAnnError)),
                key=lambda e: e.item_id)
        )

    def test_can_match_shapes(self):
        source0 = Dataset.from_iterable([
            DatasetItem(1, annotations=[
                # unique
                Bbox(1, 2, 3, 4, label=1),

                # common
                Mask(label=3, z_order=2, image=np.array([
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [1, 1, 1, 0],
                    [1, 1, 1, 0],
                ])),
                Polygon([1, 0, 3, 2, 1, 2]),

                # an instance with keypoints
                Bbox(4, 5, 2, 4, label=2, z_order=1, group=1),
                Points([5, 6], label=0, group=1),
                Points([6, 8], label=1, group=1),
            ]),
        ], categories=['a', 'b', 'c'])

        source1 = Dataset.from_iterable([
            DatasetItem(1, annotations=[
                # common
                Mask(label=3, image=np.array([
                    [0, 0, 0, 0],
                    [0, 1, 1, 1],
                    [0, 1, 1, 1],
                    [0, 1, 1, 1],
                ])),
                Polygon([0, 2, 2, 0, 2, 1]),

                # an instance with keypoints
                Bbox(4, 4, 2, 5, label=2, z_order=1, group=2),
                Points([5.5, 6.5], label=0, group=2),
                Points([6, 8], label=1, group=2),
            ]),
        ], categories=['a', 'b', 'c'])

        source2 = Dataset.from_iterable([
            DatasetItem(1, annotations=[
                # common
                Mask(label=3, z_order=3, image=np.array([
                    [0, 0, 1, 1],
                    [0, 1, 1, 1],
                    [1, 1, 1, 1],
                    [1, 1, 1, 0],
                ])),
                Polygon([3, 1, 2, 2, 0, 1]),

                # an instance with keypoints, one is missing
                Bbox(3, 6, 2, 3, label=2, z_order=4, group=3),
                Points([4.5, 5.5], label=0, group=3),
            ]),
        ], categories=['a', 'b', 'c'])

        expected = Dataset.from_iterable([
            DatasetItem(1, annotations=[
                # unique
                Bbox(1, 2, 3, 4, label=1),

                # common
                # nearest to mean bbox
                Mask(label=3, z_order=3, image=np.array([
                    [0, 0, 0, 0],
                    [0, 0, 0, 0],
                    [1, 1, 1, 0],
                    [1, 1, 1, 0],
                ])),
                Polygon([3, 1, 2, 2, 0, 1]),

                # an instance with keypoints
                Bbox(3, 6, 2, 3, label=2, z_order=4, group=2),
                Points([5, 6], label=0, group=2),
                Points([6, 8], label=1, group=2),
            ]),
        ], categories=['a', 'b', 'c'])

        merger = IntersectMerge(conf={'quorum': 1, 'pairwise_dist': 0.1})
        merged = merger([source0, source1, source2])

        compare_datasets(self, expected, merged, ignored_attrs={'score'})
        self.assertEqual(
            [
                NoMatchingAnnError(item_id=('1', ''), sources={2},
                    ann=source0.get('1').annotations[5]),
                NoMatchingAnnError(item_id=('1', ''), sources={1, 2},
                    ann=source0.get('1').annotations[0]),
            ],
            sorted((e for e in merger.errors
                    if isinstance(e, NoMatchingAnnError)),
                key=lambda e: len(e.sources))
        )

    def test_attributes(self):
        source0 = Dataset.from_iterable([
            DatasetItem(1, annotations=[
                Label(2, attributes={
                    'unique': 1,
                    'common_under_quorum': 2,
                    'common_over_quorum': 3,
                    'ignored': 'q',
                }),
            ]),
        ], categories=['a', 'b', 'c'])

        source1 = Dataset.from_iterable([
            DatasetItem(1, annotations=[
                Label(2, attributes={
                    'common_under_quorum': 2,
                    'common_over_quorum': 3,
                    'ignored': 'q',
                }),
            ]),
        ], categories=['a', 'b', 'c'])

        source2 = Dataset.from_iterable([
            DatasetItem(1, annotations=[
                Label(2, attributes={
                    'common_over_quorum': 3,
                    'ignored': 'q',
                }),
            ]),
        ], categories=['a', 'b', 'c'])

        expected = Dataset.from_iterable([
            DatasetItem(1, annotations=[
                Label(2, attributes={ 'common_over_quorum': 3 }),
            ]),
        ], categories=['a', 'b', 'c'])

        merger = IntersectMerge(conf={
            'quorum': 3, 'ignored_attributes': {'ignored'}})
        merged = merger([source0, source1, source2])

        compare_datasets(self, expected, merged, ignored_attrs={'score'})
        self.assertEqual(2, len([e for e in merger.errors
            if isinstance(e, FailedAttrVotingError)])
        )