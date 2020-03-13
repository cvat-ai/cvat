
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

# The Multiple Object Tracking Benchmark challenge format support
# Format description: https://arxiv.org/pdf/1906.04567.pdf

from collections import OrderedDict
import csv
import enum
import logging as log
import os
import os.path as osp

from datumaro.components.extractor import (SourceExtractor,
    DEFAULT_SUBSET_NAME, DatasetItem, AnnotationType, Bbox, LabelCategories
)
from datumaro.components.converter import Converter
from datumaro.components.cli_plugin import CliPlugin
from datumaro.util.image import Image


MotLabel = Enum('MotLabel', [
    ('pedestrian', 1),
    ('person on vehicle', 2),
    ('car', 3),
    ('bicycle', 4),
    ('motorbike', 5),
    ('non motorized vehicle', 6),
    ('static person', 7),
    ('distractor', 8),
    ('occluder', 9),
    ('occluder on the ground', 10),
    ('occluder full', 11),
    ('reflection', 12),
])

class MotPath:
    IMAGES_DIR = 'images'
    ANNOTATION_DIRS = { 'det', 'gt' }
    SEQINFO_FILE = 'seqinfo.ini'
    LABELS_FILE = 'labels.txt'
    GT_FILENAME = 'gt.txt'
    DET_FILENAME = 'det.txt'

    IMAGE_EXT = '.jpg'

    FIELDS = [
        'frame_id',
        'track_id',
        'x',
        'y',
        'w',
        'h',
        'confidence', # or 'not ignored' flag for GT anns
        'class_id',
        'visibility'
    ]


class MotExtractor(SourceExtractor):
    def __init__(self, path, subset=None, labels=None,
            occlusion_threshold=0, is_gt=None):
        super().__init__()

        assert osp.isfile(path)
        self._path = path

        self._occlusion_threshold = float(occlusion_threshold)

        assert is_gt in {None, True, False}
        if is_gt is None:
            if osp.basename(path) == MotPath.DET_FILENAME:
                is_gt = False
            else:
                is_gt = True
        self._is_gt = is_gt

        if not subset or subset == DEFAULT_SUBSET_NAME:
            subset = None
        self._subset = subset

        self._categories = self._load_categories(labels)
        self._items = self._load_items(path)

    def categories(self):
        return self._categories

    def __iter__(self):
        for item in self._items:
            yield item

    def __len__(self):
        return len(self._items)

    def subsets(self):
        if self._subset:
            return [self._subset]
        return None

    def get_subset(self, name):
        if name != self._subset:
            return None
        return self

    def _load_categories(self, labels):
        if labels is None:
            labels = [lbl.name for lbl in MotLabel]
        elif isinstance(labels, str):
            with open(labels) as labels_file:
                labels = [s.strip() for s in labels_file]
        elif isinstance(labels, list):
            assert all(isinstance(lbl, str) for lbl in labels), labels
        else:
            raise TypeError("Unexpected type of 'labels' argument: %s" % labels)

        attributes = ['track_id']
        if self._is_gt:
            attributes += ['occluded', 'visibility', 'ignored']
        else:
            attributes += ['score']
        label_cat = LabelCategories(attributes=attributes)
        for label in labels:
            label_cat.add(label)

        return { AnnotationType.label: label_cat }

    def _load_items(self, path):
        labels_count = len(self._categories[AnnotationType.label].items)
        items = OrderedDict()
        with open(path, newline='', encoding='utf-8') as csv_file:
            # NOTE: Different MOT files have different count of fields
            # (from 7 to 10). This is handled by reader:
            # - all extra fields go to a separate field
            # - all unmet fields have None values
            for row in csv.DictReader(csv_file, fieldnames=MotPath.FIELDS):
                frame_id = row['frame_id']
                item = items.get(frame_id,
                    DatasetItem(id=frame_id, subset=self._subset))
                annotations = item.annotations

                x, y = float(row['x']), float(row['y'])
                w, h = float(row['w']), float(row['h'])
                label_id = row.get('class_id')
                if label_id is not None:
                    label_id = int(label_id)
                if 0 <= label_id:
                    assert label_id < labels_count
                else:
                    label_id = None

                attributes = { 'track_id': int(row['track_id']) }
                confidence = row.get('confidence')
                visibility = row.get('visibility')
                if self._is_gt:
                    if visibility is not None:
                        visibility = float(visibility)
                        occluded = visibility <= self._occlusion_threshold
                    else:
                        visibility = 1
                        occluded = False

                    attributes['visibility'] = visibility
                    attributes['occluded'] = occluded
                    attributes['ignored'] = (confidence == '1')
                else:
                    attributes['score'] = float(confidence)

                annotations.append(Bbox(x, y, w, h, label=label_id,
                    attributes=attributes))

                items[frame_id] = item

class MotGtConverter(Converter, CliPlugin):
    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().__init__(**kwargs)
        parser.add_argument('--save-images', action='store_true',
            help="Save images (default: %(default)s)")
        return parser

    def __init__(self, save_images=False):
        super().__init__()

        self._options = {
            'save_images': save_images,
        }

    def __call__(self, extractor, save_dir):
        subsets = self._extractor.subsets()
        if len(subsets) == 0:
            subsets = [ None ]

        for subset_name in subsets:
            if subset_name:
                subset = self._extractor.get_subset(subset_name)
            else:
                subset_name = DEFAULT_SUBSET_NAME
                subset = self._extractor

            subset_dir = osp.join(save_dir, subset_name)
            os.makedirs(subset_dir, exist_ok=True)

            anno_file = osp.join(subset_dir, MotPath.GT_FILENAME)
            with open(anno_file, encoding="utf-8") as csv_file:
                writer = csv.DictWriter(csv_file, fieldnames=MotPath.FIELDS)
                for item in subset:
                    for anno in item.annotations:
                        if anno.type != AnnotationType.bbox:
                            continue
                        if 'track_id' not in anno.attributes:
                            continue

                        writer.writerow({
                            'frame_id': item.id,
                            'track_id': int(anno.attributes['track_id']),
                            'x': anno.x,
                            'y': anno.y,
                            'w': anno.w,
                            'h': anno.h,
                            'confidence': anno.attributes.get('ignored') != True,
                            'class_id': anno.label,
                            'visibility': float(
                                anno.attributes.get('visibility',
                                    1 - float(
                                        anno.attributes.get('occluded', False)
                                    )
                                )
                            )
                        })