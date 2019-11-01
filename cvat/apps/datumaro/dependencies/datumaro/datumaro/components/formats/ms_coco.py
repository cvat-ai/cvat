
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum


CocoAnnotationType = Enum('CocoAnnotationType', [
    'instances',
    'person_keypoints',
    'captions',
    'labels', # extension, does not exist in original COCO format
    'image_info',
    'panoptic',
    'stuff',
])

class CocoPath:
    IMAGES_DIR = 'images'
    ANNOTATIONS_DIR = 'annotations'

    IMAGE_EXT = '.jpg'