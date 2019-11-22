
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from itertools import zip_longest
import numpy as np

from datumaro.components.extractor import AnnotationType, LabelCategories


class Comparator:
    def __init__(self,
            iou_threshold=0.5, conf_threshold=0.9):
        self.iou_threshold = iou_threshold
        self.conf_threshold = conf_threshold

    @staticmethod
    def iou(box_a, box_b):
        return box_a.iou(box_b)

    # pylint: disable=no-self-use
    def compare_dataset_labels(self, extractor_a, extractor_b):
        a_label_cat = extractor_a.categories().get(AnnotationType.label)
        b_label_cat = extractor_b.categories().get(AnnotationType.label)
        if not a_label_cat and not b_label_cat:
            return None
        if not a_label_cat:
            a_label_cat = LabelCategories()
        if not b_label_cat:
            b_label_cat = LabelCategories()

        mismatches = []
        for a_label, b_label in zip_longest(a_label_cat.items, b_label_cat.items):
            if a_label != b_label:
                mismatches.append((a_label, b_label))
        return mismatches
    # pylint: enable=no-self-use

    def compare_item_labels(self, item_a, item_b):
        conf_threshold = self.conf_threshold

        a_labels = set([ann.label for ann in item_a.annotations \
            if ann.type is AnnotationType.label and \
               conf_threshold < ann.attributes.get('score', 1)])
        b_labels = set([ann.label for ann in item_b.annotations \
            if ann.type is AnnotationType.label and \
               conf_threshold < ann.attributes.get('score', 1)])

        a_unmatched = a_labels - b_labels
        b_unmatched = b_labels - a_labels
        matches = a_labels & b_labels

        return matches, a_unmatched, b_unmatched

    def compare_item_bboxes(self, item_a, item_b):
        iou_threshold = self.iou_threshold
        conf_threshold = self.conf_threshold

        a_boxes = [ann for ann in item_a.annotations \
            if ann.type is AnnotationType.bbox and \
               conf_threshold < ann.attributes.get('score', 1)]
        b_boxes = [ann for ann in item_b.annotations \
            if ann.type is AnnotationType.bbox and \
               conf_threshold < ann.attributes.get('score', 1)]
        a_boxes.sort(key=lambda ann: 1 - ann.attributes.get('score', 1))
        b_boxes.sort(key=lambda ann: 1 - ann.attributes.get('score', 1))

        # a_matches: indices of b_boxes matched to a bboxes
        # b_matches: indices of a_boxes matched to b bboxes
        a_matches = -np.ones(len(a_boxes), dtype=int)
        b_matches = -np.ones(len(b_boxes), dtype=int)

        iou_matrix = np.array([
            [self.iou(a, b) for b in b_boxes] for a in a_boxes
        ])

        # matches: boxes we succeeded to match completely
        # mispred: boxes we succeeded to match, having label mismatch
        matches = []
        mispred = []

        for a_idx, a_bbox in enumerate(a_boxes):
            if len(b_boxes) == 0:
                break
            matched_b = a_matches[a_idx]
            iou_max = max(iou_matrix[a_idx, matched_b], iou_threshold)
            for b_idx, b_bbox in enumerate(b_boxes):
                if 0 <= b_matches[b_idx]: # assign a_bbox with max conf
                    continue
                iou = iou_matrix[a_idx, b_idx]
                if iou < iou_max:
                    continue
                iou_max = iou
                matched_b = b_idx

            if matched_b < 0:
                continue
            a_matches[a_idx] = matched_b
            b_matches[matched_b] = a_idx

            b_bbox = b_boxes[matched_b]

            if a_bbox.label == b_bbox.label:
                matches.append( (a_bbox, b_bbox) )
            else:
                mispred.append( (a_bbox, b_bbox) )

        # *_umatched: boxes of (*) we failed to match
        a_unmatched = [a_boxes[i] for i, m in enumerate(a_matches) if m < 0]
        b_unmatched = [b_boxes[i] for i, m in enumerate(b_matches) if m < 0]

        return matches, mispred, a_unmatched, b_unmatched
