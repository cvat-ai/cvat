# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from tempfile import TemporaryDirectory

from datumaro.components.project import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (CvatTaskDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer
from .utils import make_colormap


@exporter(name='CamVid', ext='ZIP', version='1.0')
def _export(dst_file, task_data, save_images=False):
    extractor = CvatTaskDataExtractor(task_data, include_images=save_images)
    envt = dm_env.transforms
    extractor = extractor.transform(envt.get('polygons_to_masks'))
    extractor = extractor.transform(envt.get('boxes_to_masks'))
    extractor = extractor.transform(envt.get('merge_instance_segments'))
    extractor = Dataset.from_extractors(extractor) # apply lazy transforms
    label_map = make_colormap(task_data)
    with TemporaryDirectory() as temp_dir:
        dm_env.converters.get('camvid').convert(extractor,
            save_dir=temp_dir, save_images=save_images, apply_colormap=True,
            label_map={label: label_map[label][0] for label in label_map})

        make_zip_archive(temp_dir, dst_file)

@importer(name='CamVid', ext='ZIP', version='1.0')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        dataset = dm_env.make_importer('camvid')(tmp_dir).make_dataset()
        masks_to_polygons = dm_env.transforms.get('masks_to_polygons')
        dataset = dataset.transform(masks_to_polygons)
        import_dm_annotations(dataset, task_data)
