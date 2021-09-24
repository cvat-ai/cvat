# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor,
    ProjectData, import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name='Cityscapes', ext='ZIP', version='1.0')
def _export(dst_file, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.transform('polygons_to_masks')
        dataset.transform('boxes_to_masks')
        dataset.export(temp_dir, 'cityscapes', save_images=save_images,
            label_map='source')
        make_zip_archive(temp_dir, dst_file)

@importer(name='Cityscapes', ext='ZIP', version='1.0')
def _import(src_file, instance_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        labelmap_file = osp.join(tmp_dir, 'label_colors.txt')
        if not osp.isfile(labelmap_file):
            labels_meta = instance_data.meta['project']['labels'] \
                if isinstance(instance_data, ProjectData) \
                else instance_data.meta['task']['labels']

            labels = ('%s %s %s %s' % (
                    int(label['color'][1:3], base=16),
                    int(label['color'][3:5], base=16),
                    int(label['color'][5:7], base=16),
                    label['name'])
                for _, label in labels_meta
            )
            with open(labelmap_file, 'w') as f:
                f.write('\n'.join(labels))

        dataset = Dataset.import_from(tmp_dir, 'cityscapes', env=dm_env)
        dataset.transform('masks_to_polygons')
        import_dm_annotations(dataset, instance_data)