
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
from enum import Enum
from itertools import chain
import numpy as np

from datumaro.components.extractor import (AnnotationType,
    LabelCategories, MaskCategories
)


VocTask = Enum('VocTask', [
    'classification',
    'detection',
    'segmentation',
    'action_classification',
    'person_layout',
])

VocLabel = Enum('VocLabel', [
    ('background', 0),
    ('aeroplane', 1),
    ('bicycle', 2),
    ('bird', 3),
    ('boat', 4),
    ('bottle', 5),
    ('bus', 6),
    ('car', 7),
    ('cat', 8),
    ('chair', 9),
    ('cow', 10),
    ('diningtable', 11),
    ('dog', 12),
    ('horse', 13),
    ('motorbike', 14),
    ('person', 15),
    ('pottedplant', 16),
    ('sheep', 17),
    ('sofa', 18),
    ('train', 19),
    ('tvmonitor', 20),
    ('ignored', 255),
])

VocPose = Enum('VocPose', [
    'Unspecified',
    'Left',
    'Right',
    'Frontal',
    'Rear',
])

VocBodyPart = Enum('VocBodyPart', [
    'head',
    'hand',
    'foot',
])

VocAction = Enum('VocAction', [
    'other',
    'jumping',
    'phoning',
    'playinginstrument',
    'reading',
    'ridingbike',
    'ridinghorse',
    'running',
    'takingphoto',
    'usingcomputer',
    'walking',
])

def generate_colormap(length=256):
    def get_bit(number, index):
        return (number >> index) & 1

    colormap = np.zeros((length, 3), dtype=int)
    indices = np.arange(length, dtype=int)

    for j in range(7, -1, -1):
        for c in range(3):
            colormap[:, c] |= get_bit(indices, c) << j
        indices >>= 3

    return OrderedDict(
        (id, tuple(color)) for id, color in enumerate(colormap)
    )

VocColormap = {id: color for id, color in generate_colormap(256).items()
    if id in [l.value for l in VocLabel]}
VocInstColormap = generate_colormap(256)

class VocPath:
    IMAGES_DIR = 'JPEGImages'
    ANNOTATIONS_DIR = 'Annotations'
    SEGMENTATION_DIR = 'SegmentationClass'
    INSTANCES_DIR = 'SegmentationObject'
    SUBSETS_DIR = 'ImageSets'
    IMAGE_EXT = '.jpg'
    SEGM_EXT = '.png'
    LABELMAP_FILE = 'labelmap.txt'

    TASK_DIR = {
        VocTask.classification: 'Main',
        VocTask.detection: 'Main',
        VocTask.segmentation: 'Segmentation',
        VocTask.action_classification: 'Action',
        VocTask.person_layout: 'Layout',
    }


def make_voc_label_map():
    labels = sorted(VocLabel, key=lambda l: l.value)
    label_map = OrderedDict(
        (label.name, [VocColormap[label.value], [], []]) for label in labels)
    label_map[VocLabel.person.name][1] = [p.name for p in VocBodyPart]
    label_map[VocLabel.person.name][2] = [a.name for a in VocAction]
    return label_map

def parse_label_map(path):
    if not path:
        return None

    label_map = OrderedDict()
    with open(path, 'r') as f:
        for line in f:
            # skip empty and commented lines
            line = line.strip()
            if not line or line and line[0] == '#':
                continue

            # name, color, parts, actions
            label_desc = line.strip().split(':')
            name = label_desc[0]

            if name in label_map:
                raise ValueError("Label '%s' is already defined" % name)

            if 1 < len(label_desc) and len(label_desc[1]) != 0:
                color = label_desc[1].split(',')
                assert len(color) == 3, \
                    "Label '%s' has wrong color, expected 'r,g,b', got '%s'" % \
                    (name, color)
                color = tuple([int(c) for c in color])
            else:
                color = None

            if 2 < len(label_desc) and len(label_desc[2]) != 0:
                parts = label_desc[2].split(',')
            else:
                parts = []

            if 3 < len(label_desc) and len(label_desc[3]) != 0:
                actions = label_desc[3].split(',')
            else:
                actions = []

            label_map[name] = [color, parts, actions]
    return label_map

def write_label_map(path, label_map):
    with open(path, 'w') as f:
        f.write('# label:color_rgb:parts:actions\n')
        for label_name, label_desc in label_map.items():
            if label_desc[0]:
                color_rgb = ','.join(str(c) for c in label_desc[0])
            else:
                color_rgb = ''

            parts = ','.join(str(p) for p in label_desc[1])
            actions = ','.join(str(a) for a in label_desc[2])

            f.write('%s\n' % ':'.join([label_name, color_rgb, parts, actions]))

def make_voc_categories(label_map=None):
    if label_map is None:
        label_map = make_voc_label_map()

    categories = {}

    label_categories = LabelCategories()
    label_categories.attributes.update(['difficult', 'truncated', 'occluded'])

    for label, desc in label_map.items():
        label_categories.add(label, attributes=desc[2])
    for part in OrderedDict((k, None) for k in chain(
            *(desc[1] for desc in label_map.values()))):
        label_categories.add(part)
    categories[AnnotationType.label] = label_categories

    has_colors = any(v[0] is not None for v in label_map.values())
    if not has_colors: # generate new colors
        colormap = generate_colormap(len(label_map))
    else: # only copy defined colors
        label_id = lambda label: label_categories.find(label)[0]
        colormap = { label_id(name): desc[0]
            for name, desc in label_map.items() if desc[0] is not None }
    mask_categories = MaskCategories(colormap)
    mask_categories.inverse_colormap # pylint: disable=pointless-statement
    categories[AnnotationType.mask] = mask_categories

    return categories
