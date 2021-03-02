# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
import zipfile
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset
from datumaro.components.extractor import (AnnotationType, Caption, Label,
    LabelCategories)

from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor, \
    import_dm_annotations
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name='ICDAR Localization', ext='ZIP', version='1.0')
def _export_localization(dst_file, task_data, save_images=False):
    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'icdar_text_localization', save_images=save_images)
        make_zip_archive(temp_dir, dst_file)

@exporter(name='ICDAR Segmentation', ext='ZIP', version='1.0')
def _export_segmentation(dst_file, task_data, save_images=False):
    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.transform('polygons_to_masks')
        dataset.transform('boxes_to_masks')
        dataset.transform('merge_instance_segments')
        dataset.export(temp_dir, 'icdar_text_segmentation', save_images=save_images)
        make_zip_archive(temp_dir, dst_file)

@importer(name='ICDAR', ext='ZIP', version='1.0')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        zipfile.ZipFile(src_file).extractall(tmp_dir)

        dataset = Dataset.import_from(tmp_dir, 'icdar', env=dm_env)
        for item in dataset._data._source:
            anns = [p for p in item.annotations
                if p.type in [AnnotationType.bbox, AnnotationType.polygon, AnnotationType.mask]]
            for ann in anns:
                ann.label = 0
        label_cat = LabelCategories()
        label_cat.add('icdar')
        dataset._data._source._categories[AnnotationType.label] = label_cat
        dataset.transform('masks_to_polygons')
        import_dm_annotations(dataset, task_data)
