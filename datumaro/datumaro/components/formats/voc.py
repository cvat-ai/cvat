
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
from enum import Enum
import numpy as np


VocTask = Enum('VocTask', [
    'classification',
    'detection',
    'segmentation',
    'action_classification',
    'person_layout',
])

VocLabel = Enum('VocLabel', [
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
])

VocIgnoredLabel = 255

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
    if id in [l.value for l in VocLabel] + [0, VocIgnoredLabel]}
VocInstColormap = generate_colormap(256)

class VocPath:
    IMAGES_DIR = 'JPEGImages'
    ANNOTATIONS_DIR = 'Annotations'
    SEGMENTATION_DIR = 'SegmentationClass'
    INSTANCES_DIR = 'SegmentationObject'
    SUBSETS_DIR = 'ImageSets'
    IMAGE_EXT = '.jpg'
    SEGM_EXT = '.png'

    TASK_DIR = {
        VocTask.classification: 'Main',
        VocTask.detection: 'Main',
        VocTask.segmentation: 'Segmentation',
        VocTask.action_classification: 'Action',
        VocTask.person_layout: 'Layout',
    }