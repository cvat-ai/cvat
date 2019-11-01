
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.extractors.datumaro import DatumaroExtractor

from datumaro.components.extractors.ms_coco import (
    CocoImageInfoExtractor,
    CocoCaptionsExtractor,
    CocoInstancesExtractor,
    CocoLabelsExtractor,
    CocoPersonKeypointsExtractor,
)

from datumaro.components.extractors.voc import (
    VocClassificationExtractor,
    VocDetectionExtractor,
    VocSegmentationExtractor,
    VocLayoutExtractor,
    VocActionExtractor,
    VocComp_1_2_Extractor,
    VocComp_3_4_Extractor,
    VocComp_5_6_Extractor,
    VocComp_7_8_Extractor,
    VocComp_9_10_Extractor,
)


items = [
    ('datumaro', DatumaroExtractor),

    ('coco_images', CocoImageInfoExtractor),
    ('coco_captions', CocoCaptionsExtractor),
    ('coco_instances', CocoInstancesExtractor),
    ('coco_person_kp', CocoPersonKeypointsExtractor),
    ('coco_labels', CocoLabelsExtractor),

    ('voc_cls', VocClassificationExtractor),
    ('voc_det', VocDetectionExtractor),
    ('voc_segm', VocSegmentationExtractor),
    ('voc_layout', VocLayoutExtractor),
    ('voc_action', VocActionExtractor),

    ('voc_comp_1_2', VocComp_1_2_Extractor),
    ('voc_comp_3_4', VocComp_3_4_Extractor),
    ('voc_comp_5_6', VocComp_5_6_Extractor),
    ('voc_comp_7_8', VocComp_7_8_Extractor),
    ('voc_comp_9_10', VocComp_9_10_Extractor),
]