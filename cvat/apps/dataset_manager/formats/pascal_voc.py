# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
import shutil
from glob import glob
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (CvatTaskDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name='PASCAL VOC', ext='ZIP', version='1.1')
def _export(dst_file, task_data, save_images=False):
    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'voc', save_images=save_images,
            label_map='source')

        make_zip_archive(temp_dir, dst_file)

@importer(name='PASCAL VOC', ext='ZIP', version='1.1')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        # put label map from the task if not present
        labelmap_file = osp.join(tmp_dir, 'labelmap.txt')
        if not osp.isfile(labelmap_file):
            labels = (label['name'] + ':::'
                for _, label in task_data.meta['task']['labels'])
            with open(labelmap_file, 'w') as f:
                f.write('\n'.join(labels))

        # support flat archive layout
        anno_dir = osp.join(tmp_dir, 'Annotations')
        if not osp.isdir(anno_dir):
            anno_files = glob(osp.join(tmp_dir, '**', '*.xml'), recursive=True)
            subsets_dir = osp.join(tmp_dir, 'ImageSets', 'Main')
            os.makedirs(subsets_dir, exist_ok=True)
            with open(osp.join(subsets_dir, 'train.txt'), 'w') as subset_file:
                for f in anno_files:
                    subset_file.write(osp.splitext(osp.basename(f))[0] + '\n')

            os.makedirs(anno_dir, exist_ok=True)
            for f in anno_files:
                shutil.move(f, anno_dir)

        dataset = Dataset.import_from(tmp_dir, 'voc', env=dm_env)
        dataset.transform('masks_to_polygons')
        import_dm_annotations(dataset, task_data)
