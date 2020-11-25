# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from tempfile import TemporaryDirectory

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (CvatTaskDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive
from datumaro.components.project import Dataset

from .registry import dm_env, exporter, importer


@exporter(name='LabelMe', ext='ZIP', version='3.0')
def _export(dst_file, task_data, save_images=False):
    extractor = CvatTaskDataExtractor(task_data, include_images=save_images)
    extractor = Dataset.from_extractors(extractor) # apply lazy transforms
    with TemporaryDirectory() as temp_dir:
        dm_env.converters.get('label_me').convert(extractor, save_dir=temp_dir,
            save_images=save_images)

        make_zip_archive(temp_dir, dst_file)

@importer(name='LabelMe', ext='ZIP', version='3.0')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        dataset = dm_env.make_importer('label_me')(tmp_dir).make_dataset()
        masks_to_polygons = dm_env.transforms.get('masks_to_polygons')
        dataset = dataset.transform(masks_to_polygons)
        import_dm_annotations(dataset, task_data)
