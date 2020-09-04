
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import Counter
from enum import Enum
import numpy as np
import os
import os.path as osp

_formats = ['simple']

import warnings
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    import tensorboardX as tb
    _formats.append('tensorboard')

from datumaro.components.extractor import AnnotationType
from datumaro.util.image import save_image


Format = Enum('Formats', _formats)

class DiffVisualizer:
    Format = Format
    DEFAULT_FORMAT = Format.simple

    _UNMATCHED_LABEL = -1


    def __init__(self, comparator, save_dir, output_format=DEFAULT_FORMAT):
        self.comparator = comparator

        if isinstance(output_format, str):
            output_format = Format[output_format]
        assert output_format in Format
        self.output_format = output_format

        self.save_dir = save_dir
        if output_format is Format.tensorboard:
            logdir = osp.join(self.save_dir, 'logs', 'diff')
            self.file_writer = tb.SummaryWriter(logdir)
        if output_format is Format.simple:
            self.label_diff_writer = None

        self.categories = {}

        self.label_confusion_matrix = Counter()
        self.bbox_confusion_matrix = Counter()

    def save_dataset_diff(self, extractor_a, extractor_b):
        if self.save_dir:
            os.makedirs(self.save_dir, exist_ok=True)

        if len(extractor_a) != len(extractor_b):
            print("Datasets have different lengths: %s vs %s" % \
                (len(extractor_a), len(extractor_b)))

        self.categories = {}

        label_mismatch = self.comparator. \
            compare_dataset_labels(extractor_a, extractor_b)
        if label_mismatch is None:
            print("Datasets have no label information")
        elif len(label_mismatch) != 0:
            print("Datasets have mismatching labels:")
            for a_label, b_label in label_mismatch:
                if a_label is None:
                    print("  > %s" % b_label.name)
                elif b_label is None:
                    print("  < %s" % a_label.name)
                else:
                    print("  %s != %s" % (a_label.name, b_label.name))
        else:
            self.categories.update(extractor_a.categories())
            self.categories.update(extractor_b.categories())

        self.label_confusion_matrix = Counter()
        self.bbox_confusion_matrix = Counter()

        if self.output_format is Format.tensorboard:
            self.file_writer.reopen()

        ids_a = set((item.id, item.subset) for item in extractor_a)
        ids_b = set((item.id, item.subset) for item in extractor_b)
        ids = ids_a & ids_b

        if len(ids) != len(ids_a):
            print("Unmatched items in the first dataset: ")
            print(ids_a - ids)
        if len(ids) != len(ids_b):
            print("Unmatched items in the second dataset: ")
            print(ids_b - ids)

        for item_id, item_subset in ids:
            item_a = extractor_a.get(item_id, item_subset)
            item_b = extractor_a.get(item_id, item_subset)

            label_diff = self.comparator.compare_item_labels(item_a, item_b)
            self.update_label_confusion(label_diff)

            bbox_diff = self.comparator.compare_item_bboxes(item_a, item_b)
            self.update_bbox_confusion(bbox_diff)

            self.save_item_label_diff(item_a, item_b, label_diff)
            self.save_item_bbox_diff(item_a, item_b, bbox_diff)

        if len(self.label_confusion_matrix) != 0:
            self.save_conf_matrix(self.label_confusion_matrix,
                'labels_confusion.png')
        if len(self.bbox_confusion_matrix) != 0:
            self.save_conf_matrix(self.bbox_confusion_matrix,
                'bbox_confusion.png')

        if self.output_format is Format.tensorboard:
            self.file_writer.flush()
            self.file_writer.close()
        elif self.output_format is Format.simple:
            if self.label_diff_writer:
                self.label_diff_writer.flush()
                self.label_diff_writer.close()

    def update_label_confusion(self, label_diff):
        matches, a_unmatched, b_unmatched = label_diff
        for label in matches:
            self.label_confusion_matrix[(label, label)] += 1
        for a_label in a_unmatched:
            self.label_confusion_matrix[(a_label, self._UNMATCHED_LABEL)] += 1
        for b_label in b_unmatched:
            self.label_confusion_matrix[(self._UNMATCHED_LABEL, b_label)] += 1

    def update_bbox_confusion(self, bbox_diff):
        matches, mispred, a_unmatched, b_unmatched = bbox_diff
        for a_bbox, b_bbox in matches:
            self.bbox_confusion_matrix[(a_bbox.label, b_bbox.label)] += 1
        for a_bbox, b_bbox in mispred:
            self.bbox_confusion_matrix[(a_bbox.label, b_bbox.label)] += 1
        for a_bbox in a_unmatched:
            self.bbox_confusion_matrix[(a_bbox.label, self._UNMATCHED_LABEL)] += 1
        for b_bbox in b_unmatched:
            self.bbox_confusion_matrix[(self._UNMATCHED_LABEL, b_bbox.label)] += 1

    @classmethod
    def draw_text_with_background(cls, frame, text, origin,
            font=None, scale=1.0,
            color=(0, 0, 0), thickness=1, bgcolor=(1, 1, 1)):
        import cv2

        if not font:
            font = cv2.FONT_HERSHEY_SIMPLEX

        text_size, baseline = cv2.getTextSize(text, font, scale, thickness)
        cv2.rectangle(frame,
            tuple((origin + (0, baseline)).astype(int)),
            tuple((origin + (text_size[0], -text_size[1])).astype(int)),
            bgcolor, cv2.FILLED)
        cv2.putText(frame, text,
            tuple(origin.astype(int)),
            font, scale, color, thickness)
        return text_size, baseline

    def draw_detection_roi(self, frame, x, y, w, h, label, conf, color):
        import cv2

        cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

        text = '%s %.2f%%' % (label, 100.0 * conf)
        text_scale = 0.5
        font = cv2.FONT_HERSHEY_SIMPLEX
        text_size = cv2.getTextSize(text, font, text_scale, 1)
        line_height = np.array([0, text_size[0][1]])
        self.draw_text_with_background(frame, text,
            np.array([x, y]) - line_height * 0.5,
            font, scale=text_scale, color=[255 - c for c in color])

    def get_label(self, label_id):
        cat = self.categories.get(AnnotationType.label)
        if cat is None:
            return str(label_id)
        return cat.items[label_id].name

    def draw_bbox(self, img, shape, color):
        x, y, w, h = shape.get_bbox()
        self.draw_detection_roi(img, int(x), int(y), int(w), int(h),
            self.get_label(shape.label), shape.attributes.get('score', 1),
            color)

    def get_label_diff_file(self):
        if self.label_diff_writer is None:
            self.label_diff_writer = \
                open(osp.join(self.save_dir, 'label_diff.txt'), 'w')
        return self.label_diff_writer

    def save_item_label_diff(self, item_a, item_b, diff):
        _, a_unmatched, b_unmatched = diff

        if 0 < len(a_unmatched) + len(b_unmatched):
            if self.output_format is Format.simple:
                f = self.get_label_diff_file()
                f.write(item_a.id + '\n')
                for a_label in a_unmatched:
                    f.write('  >%s\n' % self.get_label(a_label))
                for b_label in b_unmatched:
                    f.write('  <%s\n' % self.get_label(b_label))
            elif self.output_format is Format.tensorboard:
                tag = item_a.id
                for a_label in a_unmatched:
                    self.file_writer.add_text(tag,
                        '>%s\n' % self.get_label(a_label))
                for b_label in b_unmatched:
                    self.file_writer.add_text(tag,
                        '<%s\n' % self.get_label(b_label))

    def save_item_bbox_diff(self, item_a, item_b, diff):
        _, mispred, a_unmatched, b_unmatched = diff

        if 0 < len(a_unmatched) + len(b_unmatched) + len(mispred):
            img_a = item_a.image.data.copy()
            img_b = img_a.copy()
            for a_bbox, b_bbox in mispred:
                self.draw_bbox(img_a, a_bbox, (0, 255, 0))
                self.draw_bbox(img_b, b_bbox, (0, 0, 255))
            for a_bbox in a_unmatched:
                self.draw_bbox(img_a, a_bbox, (255, 255, 0))
            for b_bbox in b_unmatched:
                self.draw_bbox(img_b, b_bbox, (255, 255, 0))

            img = np.hstack([img_a, img_b])

            path = osp.join(self.save_dir, item_a.id)

            if self.output_format is Format.simple:
                save_image(path + '.png', img, create_dir=True)
            elif self.output_format is Format.tensorboard:
                self.save_as_tensorboard(img, path)

    def save_as_tensorboard(self, img, name):
        img = img[:, :, ::-1] # to RGB
        img = np.transpose(img, (2, 0, 1)) # to (C, H, W)
        img = img.astype(dtype=np.uint8)
        self.file_writer.add_image(name, img)

    def save_conf_matrix(self, conf_matrix, filename):
        import matplotlib.pyplot as plt

        classes = None
        label_categories = self.categories.get(AnnotationType.label)
        if label_categories is not None:
            classes = { id: c.name for id, c in enumerate(label_categories.items) }
        if classes is None:
            classes = { c: 'label_%s' % c for c, _ in conf_matrix }
        classes[self._UNMATCHED_LABEL] = 'unmatched'

        class_idx = { id: i for i, id in enumerate(classes.keys()) }
        matrix = np.zeros((len(classes), len(classes)), dtype=int)
        for idx_pair in conf_matrix:
            index = (class_idx[idx_pair[0]], class_idx[idx_pair[1]])
            matrix[index] = conf_matrix[idx_pair]

        labels = [label for id, label in classes.items()]

        fig = plt.figure()
        fig.add_subplot(111)
        table = plt.table(
            cellText=matrix,
            colLabels=labels,
            rowLabels=labels,
            loc ='center')
        table.auto_set_font_size(False)
        table.set_fontsize(8)
        table.scale(3, 3)
        # Removing ticks and spines enables you to get the figure only with table
        plt.tick_params(axis='x', which='both', bottom=False, top=False, labelbottom=False)
        plt.tick_params(axis='y', which='both', right=False, left=False, labelleft=False)
        for pos in ['right','top','bottom','left']:
            plt.gca().spines[pos].set_visible(False)

        for idx_pair in conf_matrix:
            i = class_idx[idx_pair[0]]
            j = class_idx[idx_pair[1]]
            if conf_matrix[idx_pair] != 0:
                if i != j:
                    table._cells[(i + 1, j)].set_facecolor('#FF0000')
                else:
                    table._cells[(i + 1, j)].set_facecolor('#00FF00')

        plt.savefig(osp.join(self.save_dir, filename),
            bbox_inches='tight', pad_inches=0.05)
