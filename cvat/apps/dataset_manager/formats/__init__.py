
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.project import Environment


FORMAT_DATUMARO = "datumaro_project"

FORMATS = [
    {
        'name': 'Datumaro',
        'tag': FORMAT_DATUMARO,
        'is_default': True,
    },
    {
        'name': 'PASCAL VOC 2012',
        'tag': 'cvat_voc',
        'is_default': False,
    },
    {
        'name': 'MS COCO',
        'tag': 'cvat_coco',
        'is_default': False,
    },
    {
        'name': 'YOLO',
        'tag': 'cvat_yolo',
        'is_default': False,
    },
    {
        'name': 'TF Detection API',
        'tag': 'cvat_tfrecord',
        'is_default': False,
    },
    {
        'name': 'MOT',
        'tag': 'cvat_mot',
        'is_default': False,
    },
    {
        'name': 'LabelMe',
        'tag': 'cvat_label_me',
        'is_default': False,
    },
]

DEFAULT_FORMAT = FORMAT_DATUMARO

def get_formats():
    converters = Environment(config={
        'plugins_dir': _FORMATS_DIR
    }).converters

    available_formats = set(converters.items)
    available_formats.add(FORMAT_DATUMARO)

    public_formats = []
    for fmt in FORMATS:
        if fmt['tag'] in available_formats:
            public_formats.append(fmt)

    return public_formats
