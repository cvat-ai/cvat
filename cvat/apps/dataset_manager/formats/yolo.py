# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from glob import glob
from tempfile import TemporaryDirectory

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (CvatTaskDataExtractor,
    import_dm_annotations, match_frame)
from cvat.apps.dataset_manager.util import make_zip_archive
from datumaro.components.extractor import DatasetItem
from datumaro.components.project import Dataset

from .registry import dm_env, exporter, importer


@exporter(name='YOLO', ext='ZIP', version='1.1')
def _export(dst_file, task_data, save_images=False):
    extractor = CvatTaskDataExtractor(task_data, include_images=save_images)
    extractor = Dataset.from_extractors(extractor) # apply lazy transforms
    with TemporaryDirectory() as temp_dir:
        converter = dm_env.make_converter('yolo', save_images=save_images)
        converter(extractor, save_dir=temp_dir)

        make_zip_archive(temp_dir, dst_file)

@importer(name='YOLO', ext='ZIP', version='1.1')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        image_info = {}
        anno_files = glob(osp.join(tmp_dir, '**', '*.txt'), recursive=True)
        for filename in anno_files:
            filename = osp.splitext(osp.basename(filename))[0]
            frame_info = None
            try:
                frame_id = match_frame(DatasetItem(id=filename), task_data)
                frame_info = task_data.frame_info[frame_id]
            except Exception:
                pass
            if frame_info is not None:
                image_info[filename] = (frame_info['height'], frame_info['width'])

        dataset = dm_env.make_importer('yolo')(tmp_dir, image_info=image_info) \
            .make_dataset()
        import_dm_annotations(dataset, task_data)
