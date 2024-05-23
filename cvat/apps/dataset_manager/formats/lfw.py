# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.dataset import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor, detect_dataset,
                                                import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@importer(name='LFW', ext='ZIP', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    detect_dataset(temp_dir, format_name='lfw', importer=dm_env.importers.get('lfw'))
    dataset = Dataset.import_from(temp_dir, 'lfw')
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)

@exporter(name='LFW', ext='ZIP', version='1.0')
def _exporter(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, format='lfw', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)
