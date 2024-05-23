# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from glob import glob

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor, detect_dataset,
    import_dm_annotations, match_dm_item, find_dataset_root)
from cvat.apps.dataset_manager.util import make_zip_archive
from datumaro.components.extractor import DatasetItem
from datumaro.components.project import Dataset
from datumaro.plugins.yolo_format.extractor import YoloExtractor

from .registry import dm_env, exporter, importer


@exporter(name='YOLO', ext='ZIP', version='1.1')
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, 'yolo', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)

@importer(name='YOLO', ext='ZIP', version='1.1')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    image_info = {}
    frames = [YoloExtractor.name_from_path(osp.relpath(p, temp_dir))
        for p in glob(osp.join(temp_dir, '**', '*.txt'), recursive=True)]
    root_hint = find_dataset_root(
        [DatasetItem(id=frame) for frame in frames], instance_data)
    for frame in frames:
        frame_info = None
        try:
            frame_id = match_dm_item(DatasetItem(id=frame), instance_data,
                root_hint=root_hint)
            frame_info = instance_data.frame_info[frame_id]
        except Exception: # nosec
            pass
        if frame_info is not None:
            image_info[frame] = (frame_info['height'], frame_info['width'])

    detect_dataset(temp_dir, format_name='yolo', importer=dm_env.importers.get('yolo'))
    dataset = Dataset.import_from(temp_dir, 'yolo',
        env=dm_env, image_info=image_info)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
