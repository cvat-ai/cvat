from unittest import TestCase

from datumaro.components.extractor import *
from datumaro.components.comparator import Comparator
from datumaro.util.test_utils import *


class DiffTest(TestCase):
    def test_no_bbox_diff_with_same_item(self):
        detections = 3
        anns = [
            BboxObject(i * 10, 10, 10, 10, label=i,
                    attributes={'score': (1.0 + i) / detections}) \
                for i in range(detections)
        ]
        item = DatasetItem(id_=0, annotations=anns)

        iou_thresh = 0.5
        conf_thresh = 0.5
        comp = Comparator(
            iou_threshold=iou_thresh, conf_threshold=conf_thresh)

        result = comp.compare_item_bboxes(item, item)

        matches, mispred, a_greater, b_greater = result
        self.assertEqual(0, len(mispred))
        self.assertEqual(0, len(a_greater))
        self.assertEqual(0, len(b_greater))
        self.assertEqual(len([it for it in item.annotations \
                if conf_thresh < it.attributes['score']]),
            len(matches))
        for a_bbox, b_bbox in matches:
            self.assertLess(iou_thresh, a_bbox.iou(b_bbox))
            self.assertEqual(a_bbox.label, b_bbox.label)
            self.assertLess(conf_thresh, a_bbox.attributes['score'])
            self.assertLess(conf_thresh, b_bbox.attributes['score'])

    def test_can_find_bbox_with_wrong_label(self):
        detections = 3
        class_count = 2
        item1 = DatasetItem(id_=1, annotations=[
            BboxObject(i * 10, 10, 10, 10, label=i,
                    attributes={'score': (1.0 + i) / detections}) \
                for i in range(detections)
        ])
        item2 = DatasetItem(id_=2, annotations=[
            BboxObject(i * 10, 10, 10, 10, label=(i + 1) % class_count,
                    attributes={'score': (1.0 + i) / detections}) \
                for i in range(detections)
        ])

        iou_thresh = 0.5
        conf_thresh = 0.5
        comp = Comparator(
            iou_threshold=iou_thresh, conf_threshold=conf_thresh)

        result = comp.compare_item_bboxes(item1, item2)

        matches, mispred, a_greater, b_greater = result
        self.assertEqual(len([it for it in item1.annotations \
                if conf_thresh < it.attributes['score']]),
            len(mispred))
        self.assertEqual(0, len(a_greater))
        self.assertEqual(0, len(b_greater))
        self.assertEqual(0, len(matches))
        for a_bbox, b_bbox in mispred:
            self.assertLess(iou_thresh, a_bbox.iou(b_bbox))
            self.assertEqual((a_bbox.label + 1) % class_count, b_bbox.label)
            self.assertLess(conf_thresh, a_bbox.attributes['score'])
            self.assertLess(conf_thresh, b_bbox.attributes['score'])

    def test_can_find_missing_boxes(self):
        detections = 3
        class_count = 2
        item1 = DatasetItem(id_=1, annotations=[
            BboxObject(i * 10, 10, 10, 10, label=i,
                    attributes={'score': (1.0 + i) / detections}) \
                for i in range(detections) if i % 2 == 0
        ])
        item2 = DatasetItem(id_=2, annotations=[
            BboxObject(i * 10, 10, 10, 10, label=(i + 1) % class_count,
                    attributes={'score': (1.0 + i) / detections}) \
                for i in range(detections) if i % 2 == 1
        ])

        iou_thresh = 0.5
        conf_thresh = 0.5
        comp = Comparator(
            iou_threshold=iou_thresh, conf_threshold=conf_thresh)

        result = comp.compare_item_bboxes(item1, item2)

        matches, mispred, a_greater, b_greater = result
        self.assertEqual(0, len(mispred))
        self.assertEqual(len([it for it in item1.annotations \
                if conf_thresh < it.attributes['score']]),
            len(a_greater))
        self.assertEqual(len([it for it in item2.annotations \
                if conf_thresh < it.attributes['score']]),
            len(b_greater))
        self.assertEqual(0, len(matches))

    def test_no_label_diff_with_same_item(self):
        detections = 3
        anns = [
            LabelObject(i, attributes={'score': (1.0 + i) / detections}) \
                for i in range(detections)
        ]
        item = DatasetItem(id_=1, annotations=anns)

        conf_thresh = 0.5
        comp = Comparator(conf_threshold=conf_thresh)

        result = comp.compare_item_labels(item, item)

        matches, a_greater, b_greater = result
        self.assertEqual(0, len(a_greater))
        self.assertEqual(0, len(b_greater))
        self.assertEqual(len([it for it in item.annotations \
                if conf_thresh < it.attributes['score']]),
            len(matches))

    def test_can_find_wrong_label(self):
        item1 = DatasetItem(id_=1, annotations=[
            LabelObject(0),
            LabelObject(1),
            LabelObject(2),
        ])
        item2 = DatasetItem(id_=2, annotations=[
            LabelObject(2),
            LabelObject(3),
            LabelObject(4),
        ])

        conf_thresh = 0.5
        comp = Comparator(conf_threshold=conf_thresh)

        result = comp.compare_item_labels(item1, item2)

        matches, a_greater, b_greater = result
        self.assertEqual(2, len(a_greater))
        self.assertEqual(2, len(b_greater))
        self.assertEqual(1, len(matches))