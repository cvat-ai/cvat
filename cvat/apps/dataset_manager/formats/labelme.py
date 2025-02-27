# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.dataset import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    detect_dataset,
    import_dm_annotations,
)
from cvat.apps.dataset_manager.formats.transformations import MaskToPolygonTransformation
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name="LabelMe", ext="ZIP", version="3.0")
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, "label_me", save_images=save_images)

    make_zip_archive(temp_dir, dst_file)


@importer(name="LabelMe", ext="ZIP", version="3.0")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    detect_dataset(temp_dir, format_name="label_me", importer=dm_env.importers.get("label_me"))
    dataset = Dataset.import_from(temp_dir, "label_me", env=dm_env)
    dataset = MaskToPolygonTransformation.convert_dataset(dataset, **kwargs)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
