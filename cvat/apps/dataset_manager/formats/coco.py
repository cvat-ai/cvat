# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
import shutil
from tempfile import TemporaryDirectory

from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor, \
    import_dm_annotations
from cvat.apps.dataset_manager.formats import dm_env, exporter, importer


@exporter(name="COCO", ext="JSON", version="1.0")
def export_coco(dst_file, task_data):
    extractor = CvatTaskDataExtractor(task_data)
    with TemporaryDirectory() as temp_dir:
        converter(extractor, save_dir=temp_dir)

        # HACK: dst_file should not be used this way, however,
        # it is the most efficient way. The correct approach would be to copy
        # file contents.
        dst_file.close()
        shutil.move(osp.join(temp_dir, 'annotations', 'instances_default.json'),
            dst_file.name)

@importer(name="COCO", ext="JSON", version="1.0")
def import_coco(src_file, task_data):
    dataset = dm_env.make_extractor('coco_instances')(src_file.name)
    import_dm_annotations(dataset, task_data)
