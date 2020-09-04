
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import numpy as np
import os.path as osp
import re

from datumaro.components.extractor import (SourceExtractor, DatasetItem,
    AnnotationType, Bbox, Mask, LabelCategories
)
from datumaro.util.image import Image, decode_image, lazy_image
from datumaro.util.tf_util import import_tf as _import_tf

from .format import DetectionApiPath
tf = _import_tf()


def clamp(value, _min, _max):
    return max(min(_max, value), _min)

class TfDetectionApiExtractor(SourceExtractor):
    def __init__(self, path):
        assert osp.isfile(path), path
        images_dir = ''
        root_dir = osp.dirname(osp.abspath(path))
        if osp.basename(root_dir) == DetectionApiPath.ANNOTATIONS_DIR:
            root_dir = osp.dirname(root_dir)
            images_dir = osp.join(root_dir, DetectionApiPath.IMAGES_DIR)
            if not osp.isdir(images_dir):
                images_dir = ''

        super().__init__(subset=osp.splitext(osp.basename(path))[0])

        items, labels = self._parse_tfrecord_file(path, self._subset, images_dir)
        self._items = items
        self._categories = self._load_categories(labels)

    def categories(self):
        return self._categories

    def __iter__(self):
        for item in self._items:
            yield item

    def __len__(self):
        return len(self._items)

    @staticmethod
    def _load_categories(labels):
        label_categories = LabelCategories()
        labels = sorted(labels.items(), key=lambda item: item[1])
        for label, _ in labels:
            label_categories.add(label)
        return {
            AnnotationType.label: label_categories
        }

    @classmethod
    def _parse_labelmap(cls, text):
        id_pattern = r'(?:id\s*:\s*(?P<id>\d+))'
        name_pattern = r'(?:name\s*:\s*[\'\"](?P<name>.*?)[\'\"])'
        entry_pattern = r'(\{(?:[\s\n]*(?:%(id)s|%(name)s)[\s\n]*){2}\})+' % \
            {'id': id_pattern, 'name': name_pattern}
        matches = re.finditer(entry_pattern, text)

        labelmap = {}
        for match in matches:
            label_id = match.group('id')
            label_name = match.group('name')
            if label_id is not None and label_name is not None:
                labelmap[label_name] = int(label_id)

        return labelmap

    @classmethod
    def _parse_tfrecord_file(cls, filepath, subset, images_dir):
        dataset = tf.data.TFRecordDataset(filepath)
        features = {
            'image/filename': tf.io.FixedLenFeature([], tf.string),
            'image/source_id': tf.io.FixedLenFeature([], tf.string),
            'image/height': tf.io.FixedLenFeature([], tf.int64),
            'image/width': tf.io.FixedLenFeature([], tf.int64),
            'image/encoded': tf.io.FixedLenFeature([], tf.string),
            'image/format': tf.io.FixedLenFeature([], tf.string),

            # use varlen to avoid errors when this field is missing
            'image/key/sha256': tf.io.VarLenFeature(tf.string),

            # Object boxes and classes.
            'image/object/bbox/xmin': tf.io.VarLenFeature(tf.float32),
            'image/object/bbox/xmax': tf.io.VarLenFeature(tf.float32),
            'image/object/bbox/ymin': tf.io.VarLenFeature(tf.float32),
            'image/object/bbox/ymax': tf.io.VarLenFeature(tf.float32),
            'image/object/class/label': tf.io.VarLenFeature(tf.int64),
            'image/object/class/text': tf.io.VarLenFeature(tf.string),
            'image/object/mask': tf.io.VarLenFeature(tf.string),
        }

        dataset_labels = OrderedDict()
        labelmap_path = osp.join(osp.dirname(filepath),
            DetectionApiPath.LABELMAP_FILE)
        if osp.exists(labelmap_path):
            with open(labelmap_path, 'r', encoding='utf-8') as f:
                labelmap_text = f.read()
            dataset_labels.update({ label: id - 1
                for label, id in cls._parse_labelmap(labelmap_text).items()
            })

        dataset_items = []

        for record in dataset:
            parsed_record = tf.io.parse_single_example(record, features)
            frame_id = parsed_record['image/source_id'].numpy().decode('utf-8')
            frame_filename = \
                parsed_record['image/filename'].numpy().decode('utf-8')
            frame_height = tf.cast(
                parsed_record['image/height'], tf.int64).numpy().item()
            frame_width = tf.cast(
                parsed_record['image/width'], tf.int64).numpy().item()
            frame_image = parsed_record['image/encoded'].numpy()
            xmins = tf.sparse.to_dense(
                parsed_record['image/object/bbox/xmin']).numpy()
            ymins = tf.sparse.to_dense(
                parsed_record['image/object/bbox/ymin']).numpy()
            xmaxs = tf.sparse.to_dense(
                parsed_record['image/object/bbox/xmax']).numpy()
            ymaxs = tf.sparse.to_dense(
                parsed_record['image/object/bbox/ymax']).numpy()
            label_ids = tf.sparse.to_dense(
                parsed_record['image/object/class/label']).numpy()
            labels = tf.sparse.to_dense(
                parsed_record['image/object/class/text'],
                default_value=b'').numpy()
            masks = tf.sparse.to_dense(
                parsed_record['image/object/mask'],
                default_value=b'').numpy()

            for label, label_id in zip(labels, label_ids):
                label = label.decode('utf-8')
                if not label:
                    continue
                if label_id <= 0:
                    continue
                if label in dataset_labels:
                    continue
                dataset_labels[label] = label_id - 1

            item_id = osp.splitext(frame_filename)[0]

            annotations = []
            for shape_id, shape in enumerate(
                    np.dstack((labels, xmins, ymins, xmaxs, ymaxs))[0]):
                label = shape[0].decode('utf-8')

                mask = None
                if len(masks) != 0:
                    mask = masks[shape_id]

                if mask is not None:
                    if isinstance(mask, bytes):
                        mask = lazy_image(mask, decode_image)
                    annotations.append(Mask(image=mask,
                        label=dataset_labels.get(label)
                    ))
                else:
                    x = clamp(shape[1] * frame_width, 0, frame_width)
                    y = clamp(shape[2] * frame_height, 0, frame_height)
                    w = clamp(shape[3] * frame_width, 0, frame_width) - x
                    h = clamp(shape[4] * frame_height, 0, frame_height) - y
                    annotations.append(Bbox(x, y, w, h,
                        label=dataset_labels.get(label)
                    ))

            image_size = None
            if frame_height and frame_width:
                image_size = (frame_height, frame_width)

            image_params = {}
            if frame_image:
                image_params['data'] = lazy_image(frame_image, decode_image)
            if frame_filename:
                image_params['path'] = osp.join(images_dir, frame_filename)

            image = None
            if image_params:
                image = Image(**image_params, size=image_size)

            dataset_items.append(DatasetItem(id=item_id, subset=subset,
                image=image, annotations=annotations,
                attributes={'source_id': frame_id}))

        return dataset_items, dataset_labels
