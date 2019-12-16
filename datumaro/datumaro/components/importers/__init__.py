
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.importers.datumaro import DatumaroImporter

from datumaro.components.importers.ms_coco import (
    CocoImporter,
)

from datumaro.components.importers.voc import (
    VocImporter,
    VocResultsImporter,
)

from datumaro.components.importers.tfrecord import (
    DetectionApiImporter,
)


items = [
    ('datumaro', DatumaroImporter),

    ('ms_coco', CocoImporter),

    ('voc', VocImporter),
    ('voc_results', VocResultsImporter),

    ('tf_detection_api', DetectionApiImporter),
]