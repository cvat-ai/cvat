# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import zipfile

from datumaro.components.dataset import Dataset

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    detect_dataset,
    import_dm_annotations,
)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name="WiderFace", ext="ZIP", version="1.0")
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, "wider_face", save_images=save_images)

    make_zip_archive(temp_dir, dst_file)


@importer(name="WiderFace", ext="ZIP", version="1.0")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    zipfile.ZipFile(src_file).extractall(temp_dir)

    detect_dataset(temp_dir, format_name="wider_face", importer=dm_env.importers.get("wider_face"))
    dataset = Dataset.import_from(temp_dir, "wider_face", env=dm_env)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
