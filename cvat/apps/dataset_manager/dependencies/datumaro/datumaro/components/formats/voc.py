
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

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
    ('aeroplane', 0),
    ('bicycle', 1),
    ('bird', 2),
    ('boat', 3),
    ('bottle', 4),
    ('bus', 5),
    ('car', 6),
    ('cat', 7),
    ('chair', 8),
    ('cow', 9),
    ('diningtable', 10),
    ('dog', 11),
    ('horse', 12),
    ('motorbike', 13),
    ('person', 14),
    ('pottedplant', 15),
    ('sheep', 16),
    ('sofa', 17),
    ('train', 18),
    ('tvmonitor', 19),
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

    return {
        id: tuple(color) for id, color in enumerate(colormap)
    }

VocColormap = generate_colormap(len(VocLabel))
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