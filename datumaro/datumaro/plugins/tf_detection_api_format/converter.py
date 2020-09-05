
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import codecs
from collections import OrderedDict
import hashlib
import logging as log
import os
import os.path as osp
import string

from datumaro.components.extractor import (AnnotationType, DEFAULT_SUBSET_NAME,
    LabelCategories
)
from datumaro.components.converter import Converter
from datumaro.util.image import encode_image
from datumaro.util.annotation_util import (max_bbox,
    find_group_leader, find_instances)
from datumaro.util.mask_tools import merge_masks
from datumaro.util.tf_util import import_tf as _import_tf

from .format import DetectionApiPath
tf = _import_tf()


# filter out non-ASCII characters, otherwise training will crash
_printable = set(string.printable)
def _make_printable(s):
    return ''.join(filter(lambda x: x in _printable, s))

def int64_feature(value):
    return tf.train.Feature(int64_list=tf.train.Int64List(value=[value]))

def int64_list_feature(value):
    return tf.train.Feature(int64_list=tf.train.Int64List(value=value))

def bytes_feature(value):
    return tf.train.Feature(bytes_list=tf.train.BytesList(value=[value]))

def bytes_list_feature(value):
    return tf.train.Feature(bytes_list=tf.train.BytesList(value=value))

def float_list_feature(value):
    return tf.train.Feature(float_list=tf.train.FloatList(value=value))

class TfDetectionApiConverter(Converter):
    DEFAULT_IMAGE_EXT = DetectionApiPath.DEFAULT_IMAGE_EXT

    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('--save-masks', action='store_true',
            help="Include instance masks (default: %(default)s)")
        return parser

    def __init__(self, extractor, save_dir, save_masks=False, **kwargs):
        super().__init__(extractor, save_dir, **kwargs)

        self._save_masks = save_masks

    def apply(self):
        os.makedirs(self._save_dir, exist_ok=True)

        label_categories = self._extractor.categories().get(AnnotationType.label,
            LabelCategories())
        get_label = lambda label_id: label_categories.items[label_id].name \
            if label_id is not None else ''
        label_ids = OrderedDict((label.name, 1 + idx)
            for idx, label in enumerate(label_categories.items))
        map_label_id = lambda label_id: label_ids.get(get_label(label_id), 0)
        self._get_label = get_label
        self._get_label_id = map_label_id

        subsets = self._extractor.subsets()
        if len(subsets) == 0:
            subsets = [ None ]

        for subset_name in subsets:
            if subset_name:
                subset = self._extractor.get_subset(subset_name)
            else:
                subset_name = DEFAULT_SUBSET_NAME
                subset = self._extractor

            labelmap_path = osp.join(self._save_dir, DetectionApiPath.LABELMAP_FILE)
            with codecs.open(labelmap_path, 'w', encoding='utf8') as f:
                for label, idx in label_ids.items():
                    f.write(
                        'item {\n' +
                        ('\tid: %s\n' % (idx)) +
                        ("\tname: '%s'\n" % (label)) +
                        '}\n\n'
                    )

            anno_path = osp.join(self._save_dir, '%s.tfrecord' % (subset_name))
            with tf.io.TFRecordWriter(anno_path) as writer:
                for item in subset:
                    tf_example = self._make_tf_example(item)
                    writer.write(tf_example.SerializeToString())

    @staticmethod
    def _find_instances(annotations):
        return find_instances(a for a in annotations
            if a.type in { AnnotationType.bbox, AnnotationType.mask })

    def _find_instance_parts(self, group, img_width, img_height):
        boxes = [a for a in group if a.type == AnnotationType.bbox]
        masks = [a for a in group if a.type == AnnotationType.mask]

        anns = boxes + masks
        leader = find_group_leader(anns)
        bbox = max_bbox(anns)

        mask = None
        if self._save_masks:
            mask = merge_masks([m.image for m in masks])

        return [leader, mask, bbox]

    def _export_instances(self, instances, width, height):
        xmins = [] # List of normalized left x coordinates of bounding boxes (1 per box)
        xmaxs = [] # List of normalized right x coordinates of bounding boxes (1 per box)
        ymins = [] # List of normalized top y coordinates of bounding boxes (1 per box)
        ymaxs = [] # List of normalized bottom y coordinates of bounding boxes (1 per box)
        classes_text = [] # List of class names of bounding boxes (1 per box)
        classes = [] # List of class ids of bounding boxes (1 per box)
        masks = [] # List of PNG-encoded instance masks (1 per box)

        for leader, mask, box in instances:
            label = _make_printable(self._get_label(leader.label))
            classes_text.append(label.encode('utf-8'))
            classes.append(self._get_label_id(leader.label))

            xmins.append(box[0] / width)
            xmaxs.append((box[0] + box[2]) / width)
            ymins.append(box[1] / height)
            ymaxs.append((box[1] + box[3]) / height)

            if self._save_masks:
                if mask is not None:
                    mask = encode_image(mask, '.png')
                else:
                    mask = b''
                masks.append(mask)

        result = {}
        if classes:
            result = {
                'image/object/bbox/xmin': float_list_feature(xmins),
                'image/object/bbox/xmax': float_list_feature(xmaxs),
                'image/object/bbox/ymin': float_list_feature(ymins),
                'image/object/bbox/ymax': float_list_feature(ymaxs),
                'image/object/class/text': bytes_list_feature(classes_text),
                'image/object/class/label': int64_list_feature(classes),
            }
            if masks:
                result['image/object/mask'] = bytes_list_feature(masks)
        return result

    def _make_tf_example(self, item):
        features = {
            'image/source_id': bytes_feature(
                str(item.attributes.get('source_id') or '').encode('utf-8')
            ),
        }

        filename = self._make_image_filename(item)
        features['image/filename'] = bytes_feature(filename.encode('utf-8'))

        if not item.has_image:
            raise Exception("Failed to export dataset item '%s': "
                "item has no image info" % item.id)
        height, width = item.image.size

        features.update({
            'image/height': int64_feature(height),
            'image/width': int64_feature(width),
        })

        features.update({
            'image/encoded': bytes_feature(b''),
            'image/format': bytes_feature(b''),
            'image/key/sha256': bytes_feature(b''),
        })
        if self._save_images:
            if item.has_image and item.image.has_data:
                buffer, fmt = self._save_image(item, filename)
                key = hashlib.sha256(buffer).hexdigest()

                features.update({
                    'image/encoded': bytes_feature(buffer),
                    'image/format': bytes_feature(fmt.encode('utf-8')),
                    'image/key/sha256': bytes_feature(key.encode('utf8')),
                })
            else:
                log.warning("Item '%s' has no image" % item.id)

        instances = self._find_instances(item.annotations)
        instances = [self._find_instance_parts(i, width, height) for i in instances]
        features.update(self._export_instances(instances, width, height))

        tf_example = tf.train.Example(
            features=tf.train.Features(feature=features))

        return tf_example

    def _save_image(self, item, path=None):
        dst_ext = osp.splitext(osp.basename(path))[1]
        fmt = DetectionApiPath.IMAGE_EXT_FORMAT.get(dst_ext)
        if not fmt:
            log.warning("Item '%s': can't find format string for the '%s' "
                "image extension, the corresponding field will be empty." % \
                (item.id, dst_ext))
        buffer = encode_image(item.image.data, dst_ext)
        return buffer, fmt