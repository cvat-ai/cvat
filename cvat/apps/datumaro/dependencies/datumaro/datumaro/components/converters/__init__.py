
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.converters.datumaro import DatumaroConverter

from datumaro.components.converters.ms_coco import (
    CocoImageInfoConverter,
    CocoCaptionsConverter,
    CocoInstancesConverter,
    CocoPersonKeypointsConverter,
    CocoLabelsConverter,
)

from datumaro.components.converters.voc import (
    VocConverter,
    VocClassificationConverter,
    VocDetectionConverter,
    VocLayoutConverter,
    VocActionConverter,
    VocSegmentationConverter,
)


items = [
    ('datumaro', DatumaroConverter),

    ('coco_images', CocoImageInfoConverter),
    ('coco_captions', CocoCaptionsConverter),
    ('coco_instances', CocoInstancesConverter),
    ('coco_person_kp', CocoPersonKeypointsConverter),
    ('coco_labels', CocoLabelsConverter),

    ('voc', VocConverter),
    ('voc_cls', VocClassificationConverter),
    ('voc_det', VocDetectionConverter),
    ('voc_segm', VocSegmentationConverter),
    ('voc_action', VocActionConverter),
    ('voc_layout', VocLayoutConverter),
]
