
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.importers.datumaro import DatumaroImporter
from datumaro.components.importers.ms_coco import CocoImporter

from datumaro.components.importers.voc import (
    VocImporter,
    VocResultsImporter,
)

from datumaro.components.importers.tfrecord import DetectionApiImporter
from datumaro.components.importers.yolo import YoloImporter
from datumaro.components.importers.cvat import CvatImporter


items = [
    ('datumaro', DatumaroImporter),

    ('ms_coco', CocoImporter),

    ('voc', VocImporter),
    ('voc_results', VocResultsImporter),

    ('yolo', YoloImporter),

    ('tf_detection_api', DetectionApiImporter),

    ('cvat', CvatImporter),
]