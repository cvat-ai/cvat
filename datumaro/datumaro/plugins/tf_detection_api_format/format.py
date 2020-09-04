
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

class DetectionApiPath:
    IMAGES_DIR = 'images'
    ANNOTATIONS_DIR = 'annotations'

    DEFAULT_IMAGE_EXT = '.jpg'
    IMAGE_EXT_FORMAT = {'.jpg': 'jpeg', '.png': 'png'}

    LABELMAP_FILE = 'label_map.pbtxt'