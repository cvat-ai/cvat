# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from glob import glob
from tempfile import TemporaryDirectory

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (CvatTaskDataExtractor,
    import_dm_annotations, match_dm_item, find_dataset_root)
from cvat.apps.dataset_manager.util import make_zip_archive
from datumaro.components.extractor import DatasetItem
from datumaro.components.project import Dataset
from datumaro.plugins.yolo_format.extractor import YoloExtractor

from .registry import dm_env, exporter, importer


@exporter(name='YOLO', ext='ZIP', version='1.1')
def _export(dst_file, task_data, save_images=False):
    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'yolo', save_images=save_images)

        make_zip_archive(temp_dir, dst_file)

@importer(name='YOLO', ext='ZIP', version='1.1')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        image_info = {}
        frames = [YoloExtractor.name_from_path(osp.relpath(p, tmp_dir))
            for p in glob(osp.join(tmp_dir, '**', '*.txt'), recursive=True)]
        root_hint = find_dataset_root(
            [DatasetItem(id=frame) for frame in frames], task_data)
        for frame in frames:
            frame_info = None
            try:
                frame_id = match_dm_item(DatasetItem(id=frame), task_data,
                    root_hint=root_hint)
                frame_info = task_data.frame_info[frame_id]
            except Exception:
                pass
            if frame_info is not None:
                image_info[frame] = (frame_info['height'], frame_info['width'])

        dataset = Dataset.import_from(tmp_dir, 'yolo',
            env=dm_env, image_info=image_info)
        import_dm_annotations(dataset, task_data)
