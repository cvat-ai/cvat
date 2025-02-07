# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import zipfile

from datumaro.components.dataset import Dataset

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    TaskData,
    detect_dataset,
    import_dm_annotations,
)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name="VGGFace2", ext="ZIP", version="1.0")
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, "vgg_face2", save_images=save_images)

    make_zip_archive(temp_dir, dst_file)


@importer(name="VGGFace2", ext="ZIP", version="1.0")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    zipfile.ZipFile(src_file).extractall(temp_dir)

    detect_dataset(temp_dir, format_name="vgg_face2", importer=dm_env.importers.get("vgg_face2"))
    dataset = Dataset.import_from(temp_dir, "vgg_face2", env=dm_env)
    if isinstance(instance_data, TaskData):
        dataset.transform("rename", regex=r"|([^/]+/)?(.+)|\2|")
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
