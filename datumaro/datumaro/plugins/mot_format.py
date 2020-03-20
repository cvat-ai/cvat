
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

# The Multiple Object Tracking Benchmark challenge format support
# Format description: https://arxiv.org/pdf/1906.04567.pdf
# Another description: https://motchallenge.net/instructions

from collections import OrderedDict
import csv
from enum import Enum
import logging as log
import os
import os.path as osp

from datumaro.components.extractor import (SourceExtractor,
    DatasetItem, AnnotationType, Bbox, LabelCategories
)
from datumaro.components.extractor import Importer
from datumaro.components.converter import Converter
from datumaro.components.cli_plugin import CliPlugin
from datumaro.util import cast
from datumaro.util.image import Image, save_image


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
    IMAGE_DIR = 'img1'
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


class MotSeqExtractor(SourceExtractor):
    def __init__(self, path, labels=None, occlusion_threshold=0, is_gt=None):
        super().__init__()

        assert osp.isfile(path)
        self._path = path
        seq_root = osp.dirname(osp.dirname(path))

        self._image_dir = ''
        if osp.isdir(osp.join(seq_root, MotPath.IMAGE_DIR)):
            self._image_dir = osp.join(seq_root, MotPath.IMAGE_DIR)

        seq_info = osp.join(seq_root, MotPath.SEQINFO_FILE)
        if osp.isfile(seq_info):
            seq_info = self._parse_seq_info(seq_info)
            self._image_dir = osp.join(seq_root, seq_info['imdir'])
        else:
            seq_info = None
        self._seq_info = seq_info

        self._occlusion_threshold = float(occlusion_threshold)

        assert is_gt in {None, True, False}
        if is_gt is None:
            if osp.basename(path) == MotPath.DET_FILENAME:
                is_gt = False
            else:
                is_gt = True
        self._is_gt = is_gt

        self._subset = None

        if labels is None:
            if osp.isfile(osp.join(seq_root, MotPath.LABELS_FILE)):
                labels = osp.join(seq_root, MotPath.LABELS_FILE)
            else:
                labels = [lbl.name for lbl in MotLabel]
        if isinstance(labels, str):
            labels = self._parse_labels(labels)
        elif isinstance(labels, list):
            assert all(isinstance(lbl, str) for lbl in labels), labels
        else:
            raise TypeError("Unexpected type of 'labels' argument: %s" % labels)
        self._categories = self._load_categories(labels)
        self._items = self._load_items(path)

    def categories(self):
        return self._categories

    def __iter__(self):
        for item in self._items.values():
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

    @staticmethod
    def _parse_labels(path):
        with open(path, encoding='utf-8') as labels_file:
            return [s.strip() for s in labels_file]

    def _load_categories(self, labels):
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

        if self._seq_info:
            for frame_id in range(self._seq_info['seqlength']):
                items[frame_id] = DatasetItem(
                    id=frame_id,
                    subset=self._subset,
                    image=Image(
                        path=osp.join(self._image_dir,
                            '%06d%s' % (frame_id, self._seq_info['imext'])),
                        size=(self._seq_info['imheight'], self._seq_info['imwidth'])
                    )
                )
        elif osp.isdir(self._image_dir):
            for p in os.listdir(self._image_dir):
                if p.endswith(MotPath.IMAGE_EXT):
                    frame_id = int(osp.splitext(p)[0])
                    items[frame_id] = DatasetItem(
                        id=frame_id,
                        subset=self._subset,
                        image=osp.join(self._image_dir, p),
                    )

        with open(path, newline='', encoding='utf-8') as csv_file:
            # NOTE: Different MOT files have different count of fields
            # (7, 9 or 10). This is handled by reader:
            # - all extra fields go to a separate field
            # - all unmet fields have None values
            for row in csv.DictReader(csv_file, fieldnames=MotPath.FIELDS):
                frame_id = int(row['frame_id'])
                item = items.get(frame_id)
                if item is None:
                    item = DatasetItem(id=frame_id, subset=self._subset)
                annotations = item.annotations

                x, y = float(row['x']), float(row['y'])
                w, h = float(row['w']), float(row['h'])
                label_id = row.get('class_id')
                if label_id and label_id != '-1':
                    label_id = int(label_id) - 1
                    assert label_id < labels_count, label_id
                else:
                    label_id = None

                attributes = {}

                # Annotations for detection task are not related to any track
                track_id = int(row['track_id'])
                if 0 < track_id:
                    attributes['track_id'] = track_id

                confidence = cast(row.get('confidence'), float, 1)
                visibility = cast(row.get('visibility'), float, 1)
                if self._is_gt:
                    attributes['visibility'] = visibility
                    attributes['occluded'] = \
                        visibility <= self._occlusion_threshold
                    attributes['ignored'] = confidence == 0
                else:
                    attributes['score'] = float(confidence)

                annotations.append(Bbox(x, y, w, h, label=label_id,
                    attributes=attributes))

                items[frame_id] = item
        return items

    @classmethod
    def _parse_seq_info(cls, path):
        fields = {}
        with open(path, encoding='utf-8') as f:
            for line in f:
                entry = line.lower().strip().split('=', maxsplit=1)
                if len(entry) == 2:
                    fields[entry[0]] = entry[1]
        cls._check_seq_info(fields)
        for k in { 'framerate', 'seqlength', 'imwidth', 'imheight' }:
            fields[k] = int(fields[k])
        return fields

    @staticmethod
    def _check_seq_info(seq_info):
        assert set(seq_info) == {'name', 'imdir', 'framerate', 'seqlength', 'imwidth', 'imheight', 'imext'}, seq_info

class MotSeqImporter(Importer):
    _EXTRACTOR_NAME = 'mot_seq'

    @classmethod
    def detect(cls, path):
        return len(cls.find_subsets(path)) != 0

    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        subsets = self.find_subsets(path)
        if len(subsets) == 0:
            raise Exception("Failed to find 'mot' dataset at '%s'" % path)

        for ann_file in subsets:
            log.info("Found a dataset at '%s'" % ann_file)

            source_name = osp.splitext(osp.basename(ann_file))[0]
            project.add_source(source_name, {
                'url': ann_file,
                'format': self._EXTRACTOR_NAME,
                'options': extra_params,
            })

        return project

    @staticmethod
    def find_subsets(path):
        subsets = []
        if path.endswith('.txt') and osp.isfile(path):
            subsets = [path]
        elif osp.isdir(path):
            p = osp.join(path, 'gt', MotPath.GT_FILENAME)
            if osp.isfile(p):
                subsets.append(p)
        return subsets

class MotSeqGtConverter(Converter, CliPlugin):
    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().__init__(**kwargs)
        parser.add_argument('--save-images', action='store_true',
            help="Save images (default: %(default)s)")
        return parser

    def __init__(self, save_images=False):
        super().__init__()

        self._save_images = save_images

    def __call__(self, extractor, save_dir):
        images_dir = osp.join(save_dir, MotPath.IMAGE_DIR)
        os.makedirs(images_dir, exist_ok=True)
        self._images_dir = images_dir

        anno_dir = osp.join(save_dir, 'gt')
        os.makedirs(anno_dir, exist_ok=True)
        anno_file = osp.join(anno_dir, MotPath.GT_FILENAME)
        with open(anno_file, 'w', encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=MotPath.FIELDS)
            for idx, item in enumerate(extractor):
                log.debug("Converting item '%s'", item.id)

                frame_id = cast(item.id, int, 1 + idx)

                for anno in item.annotations:
                    if anno.type != AnnotationType.bbox:
                        continue

                    writer.writerow({
                        'frame_id': frame_id,
                        'track_id': int(anno.attributes.get('track_id', -1)),
                        'x': anno.x,
                        'y': anno.y,
                        'w': anno.w,
                        'h': anno.h,
                        'confidence': int(anno.attributes.get('ignored') != True),
                        'class_id': 1 + cast(anno.label, int, -2),
                        'visibility': float(
                            anno.attributes.get('visibility',
                                1 - float(
                                    anno.attributes.get('occluded', False)
                                )
                            )
                        )
                    })

                if self._save_images:
                    if item.has_image and item.image.has_data:
                        self._save_image(item, index=frame_id)
                    else:
                        log.debug("Item '%s' has no image" % item.id)

        labels_file = osp.join(save_dir, MotPath.LABELS_FILE)
        with open(labels_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(l.name
                for l in extractor.categories()[AnnotationType.label].items)
            )

    def _save_image(self, item, index):
        if item.image.filename:
            frame_id = osp.splitext(item.image.filename)[0]
        else:
            frame_id = item.id
        frame_id = cast(frame_id, int, index)
        image_filename = '%06d%s' % (frame_id, MotPath.IMAGE_EXT)
        save_image(osp.join(self._images_dir, image_filename),
            item.image.data)