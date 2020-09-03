import numpy as np

from datumaro.components.extractor import (DatasetItem, Label, Bbox,
    Caption, Mask, Points)
from datumaro.components.project import Dataset
from datumaro.components.operations import DistanceComparator, ExactComparator

from unittest import TestCase


class DistanceComparatorTest(TestCase):
    def test_no_bbox_diff_with_same_item(self):
        detections = 3
        anns = [
            Bbox(i * 10, 10, 10, 10, label=i)
            for i in range(detections)
        ]
        item = DatasetItem(id=0, annotations=anns)

        iou_thresh = 0.5
        comp = DistanceComparator(iou_threshold=iou_thresh)

        result = comp.match_boxes(item, item)

        matches, mispred, a_greater, b_greater = result
        self.assertEqual(0, len(mispred))
        self.assertEqual(0, len(a_greater))
        self.assertEqual(0, len(b_greater))
        self.assertEqual(len(item.annotations), len(matches))
        for a_bbox, b_bbox in matches:
            self.assertLess(iou_thresh, a_bbox.iou(b_bbox))
            self.assertEqual(a_bbox.label, b_bbox.label)

    def test_can_find_bbox_with_wrong_label(self):
        detections = 3
        class_count = 2
        item1 = DatasetItem(id=1, annotations=[
            Bbox(i * 10, 10, 10, 10, label=i)
            for i in range(detections)
        ])
        item2 = DatasetItem(id=2, annotations=[
            Bbox(i * 10, 10, 10, 10, label=(i + 1) % class_count)
            for i in range(detections)
        ])

        iou_thresh = 0.5
        comp = DistanceComparator(iou_threshold=iou_thresh)

        result = comp.match_boxes(item1, item2)

        matches, mispred, a_greater, b_greater = result
        self.assertEqual(len(item1.annotations), len(mispred))
        self.assertEqual(0, len(a_greater))
        self.assertEqual(0, len(b_greater))
        self.assertEqual(0, len(matches))
        for a_bbox, b_bbox in mispred:
            self.assertLess(iou_thresh, a_bbox.iou(b_bbox))
            self.assertEqual((a_bbox.label + 1) % class_count, b_bbox.label)

    def test_can_find_missing_boxes(self):
        detections = 3
        class_count = 2
        item1 = DatasetItem(id=1, annotations=[
            Bbox(i * 10, 10, 10, 10, label=i)
            for i in range(detections) if i % 2 == 0
        ])
        item2 = DatasetItem(id=2, annotations=[
            Bbox(i * 10, 10, 10, 10, label=(i + 1) % class_count)
            for i in range(detections) if i % 2 == 1
        ])

        iou_thresh = 0.5
        comp = DistanceComparator(iou_threshold=iou_thresh)

        result = comp.match_boxes(item1, item2)

        matches, mispred, a_greater, b_greater = result
        self.assertEqual(0, len(mispred))
        self.assertEqual(len(item1.annotations), len(a_greater))
        self.assertEqual(len(item2.annotations), len(b_greater))
        self.assertEqual(0, len(matches))

    def test_no_label_diff_with_same_item(self):
        detections = 3
        anns = [ Label(i) for i in range(detections) ]
        item = DatasetItem(id=1, annotations=anns)

        result = DistanceComparator().match_labels(item, item)

        matches, a_greater, b_greater = result
        self.assertEqual(0, len(a_greater))
        self.assertEqual(0, len(b_greater))
        self.assertEqual(len(item.annotations), len(matches))

    def test_can_find_wrong_label(self):
        item1 = DatasetItem(id=1, annotations=[
            Label(0),
            Label(1),
            Label(2),
        ])
        item2 = DatasetItem(id=2, annotations=[
            Label(2),
            Label(3),
            Label(4),
        ])

        result = DistanceComparator().match_labels(item1, item2)

        matches, a_greater, b_greater = result
        self.assertEqual(2, len(a_greater))
        self.assertEqual(2, len(b_greater))
        self.assertEqual(1, len(matches))

    def test_can_match_points(self):
        item1 = DatasetItem(id=1, annotations=[
            Points([1, 2, 2, 0, 1, 1], label=0),

            Points([3, 5, 5, 7, 5, 3], label=0),
        ])
        item2 = DatasetItem(id=2, annotations=[
            Points([1.5, 2, 2, 0.5, 1, 1.5], label=0),

            Points([5, 7, 7, 7, 7, 5], label=0),
        ])

        result = DistanceComparator().match_points(item1, item2)

        matches, mismatches, a_greater, b_greater = result
        self.assertEqual(1, len(a_greater))
        self.assertEqual(1, len(b_greater))
        self.assertEqual(1, len(matches))
        self.assertEqual(0, len(mismatches))

class ExactComparatorTest(TestCase):
    def test_class_comparison(self):
        a = Dataset.from_iterable([], categories=['a', 'b', 'c'])
        b = Dataset.from_iterable([], categories=['b', 'c'])

        comp = ExactComparator()
        _, _, _, _, errors = comp.compare_datasets(a, b)

        self.assertEqual(1, len(errors), errors)

    def test_item_comparison(self):
        a = Dataset.from_iterable([
            DatasetItem(id=1, subset='train'),
            DatasetItem(id=2, subset='test', attributes={'x': 1}),
        ], categories=['a', 'b', 'c'])

        b = Dataset.from_iterable([
            DatasetItem(id=2, subset='test'),
            DatasetItem(id=3),
        ], categories=['a', 'b', 'c'])

        comp = ExactComparator()
        _, _, a_extra_items, b_extra_items, errors = comp.compare_datasets(a, b)

        self.assertEqual({('1', 'train')}, a_extra_items)
        self.assertEqual({('3', '')}, b_extra_items)
        self.assertEqual(1, len(errors), errors)

    def test_annotation_comparison(self):
        a = Dataset.from_iterable([
            DatasetItem(id=1, annotations=[
                Caption('hello'), # unmatched
                Caption('world', group=5),
                Label(2, attributes={ 'x': 1, 'y': '2', }),
                Bbox(1, 2, 3, 4, label=4, z_order=1, attributes={
                    'score': 1.0,
                }),
                Bbox(5, 6, 7, 8, group=5),
                Points([1, 2, 2, 0, 1, 1], label=0, z_order=4),
                Mask(label=3, z_order=2, image=np.ones((2, 3))),
            ]),
        ], categories=['a', 'b', 'c', 'd'])

        b = Dataset.from_iterable([
            DatasetItem(id=1, annotations=[
                Caption('world', group=5),
                Label(2, attributes={ 'x': 1, 'y': '2', }),
                Bbox(1, 2, 3, 4, label=4, z_order=1, attributes={
                    'score': 1.0,
                }),
                Bbox(5, 6, 7, 8, group=5),
                Bbox(5, 6, 7, 8, group=5), # unmatched
                Points([1, 2, 2, 0, 1, 1], label=0, z_order=4),
                Mask(label=3, z_order=2, image=np.ones((2, 3))),
            ]),
        ], categories=['a', 'b', 'c', 'd'])

        comp = ExactComparator()
        matched, unmatched, _, _, errors = comp.compare_datasets(a, b)

        self.assertEqual(6, len(matched), matched)
        self.assertEqual(2, len(unmatched), unmatched)
        self.assertEqual(0, len(errors), errors)

    def test_image_comparison(self):
        a = Dataset.from_iterable([
            DatasetItem(id=11, image=np.ones((5, 4, 3)), annotations=[
                Bbox(5, 6, 7, 8),
            ]),
            DatasetItem(id=12, image=np.ones((5, 4, 3)), annotations=[
                Bbox(1, 2, 3, 4),
                Bbox(5, 6, 7, 8),
            ]),
            DatasetItem(id=13, image=np.ones((5, 4, 3)), annotations=[
                Bbox(9, 10, 11, 12), # mismatch
            ]),

            DatasetItem(id=14, image=np.zeros((5, 4, 3)), annotations=[
                Bbox(1, 2, 3, 4),
                Bbox(5, 6, 7, 8),
            ], attributes={ 'a': 1 }),

            DatasetItem(id=15, image=np.zeros((5, 5, 3)), annotations=[
                Bbox(1, 2, 3, 4),
                Bbox(5, 6, 7, 8),
            ]),
        ], categories=['a', 'b', 'c', 'd'])

        b = Dataset.from_iterable([
            DatasetItem(id=21, image=np.ones((5, 4, 3)), annotations=[
                Bbox(5, 6, 7, 8),
            ]),
            DatasetItem(id=22, image=np.ones((5, 4, 3)), annotations=[
                Bbox(1, 2, 3, 4),
                Bbox(5, 6, 7, 8),
            ]),
            DatasetItem(id=23, image=np.ones((5, 4, 3)), annotations=[
                Bbox(10, 10, 11, 12), # mismatch
            ]),

            DatasetItem(id=24, image=np.zeros((5, 4, 3)), annotations=[
                Bbox(6, 6, 7, 8), # 1 ann missing, mismatch
            ], attributes={ 'a': 2 }),

            DatasetItem(id=25, image=np.zeros((4, 4, 3)), annotations=[
                Bbox(6, 6, 7, 8),
            ]),
        ], categories=['a', 'b', 'c', 'd'])

        comp = ExactComparator(match_images=True)
        matched_ann, unmatched_ann, a_unmatched, b_unmatched, errors = \
            comp.compare_datasets(a, b)

        self.assertEqual(3, len(matched_ann), matched_ann)
        self.assertEqual(5, len(unmatched_ann), unmatched_ann)
        self.assertEqual(1, len(a_unmatched), a_unmatched)
        self.assertEqual(1, len(b_unmatched), b_unmatched)
        self.assertEqual(1, len(errors), errors)