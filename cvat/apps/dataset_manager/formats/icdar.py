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


@exporter(name='ICDAR', ext='ZIP', version='1.0')
def _export(dst_file, task_data, save_images=False):
    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        icdar_format = 'icdar_text_localization'
        categories = dataset._data._source._categories[AnnotationType.label]
        for attr in categories.attributes:
            if attr == 'color' or attr == 'center':
                icdar_format = 'icdar_text_segmentation'
            elif attr == 'caption':
                icdar_format = 'icdar_word_recognition'
        if icdar_format == 'icdar_word_recognition':
            for item in dataset._data._source:
                anns = [p for p in item.annotations
                    if 'caption' in p.attributes]
                for ann in anns:
                    item.annotations.append(Caption(ann.attributes['caption']))
        elif icdar_format == 'icdar_text_segmentation':
            dataset.transform('polygons_to_masks')
            dataset.transform('boxes_to_masks')
            dataset.transform('merge_instance_segments')
        dataset.export(temp_dir, icdar_format, save_images=save_images)
        make_zip_archive(temp_dir, dst_file)

@importer(name='ICDAR', ext='ZIP', version='1.0')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        zipfile.ZipFile(src_file).extractall(tmp_dir)

        dataset = Dataset.import_from(tmp_dir, 'icdar', env=dm_env)
        if osp.isdir(osp.join(tmp_dir, 'word_recognition')):
            for item in dataset._data._source:
                anns = [p for p in item.annotations
                    if p.type == AnnotationType.caption]
                for ann in anns:
                    item.annotations.append(Label(label=0,
                        attributes={'caption': ann.caption}))
                    item.annotations.remove(ann)
        else:
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
