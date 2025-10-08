# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import zipfile
from pathlib import Path
from typing import BinaryIO

from datumaro.components.dataset import StreamDataset

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    NoMediaInAnnotationFileError,
    detect_dataset,
    import_dm_annotations,
)
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.models import DimensionType

from .registry import dm_env, exporter, importer


@exporter(name="Datumaro", ext="ZIP", version="1.0")
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data=instance_data, include_images=save_images) as extractor:
        dataset = StreamDataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, "datumaro", save_media=save_images)

    make_zip_archive(temp_dir, dst_file)


@importer(name="Datumaro", ext="JSON, ZIP", version="1.0")
def _import(src_file: BinaryIO, temp_dir, instance_data, load_data_callback=None, **kwargs):
    if zipfile.is_zipfile(src_file):
        zipfile.ZipFile(src_file).extractall(temp_dir)

        detect_dataset(temp_dir, format_name="datumaro", importer=dm_env.importers.get("datumaro"))
        dataset = StreamDataset.import_from(temp_dir, "datumaro", env=dm_env)
    else:
        if load_data_callback:
            raise NoMediaInAnnotationFileError()

        tmp_src_file_link = Path(temp_dir) / "annotations" / "default.json"
        tmp_src_file_link.parent.mkdir()
        tmp_src_file_link.symlink_to(src_file.name)
        dataset = StreamDataset.import_from(
            str(tmp_src_file_link.absolute()), "datumaro", env=dm_env
        )

    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)


@exporter(name="Datumaro 3D", ext="ZIP", version="1.0", dimension=DimensionType.DIM_3D)
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(
        instance_data=instance_data, include_images=save_images, dimension=DimensionType.DIM_3D
    ) as extractor:
        dataset = StreamDataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, "datumaro", save_media=save_images)

    make_zip_archive(temp_dir, dst_file)


@importer(name="Datumaro 3D", ext="JSON, ZIP", version="1.0", dimension=DimensionType.DIM_3D)
def _import(src_file: BinaryIO, temp_dir, instance_data, load_data_callback=None, **kwargs):
    if zipfile.is_zipfile(src_file):
        zipfile.ZipFile(src_file).extractall(temp_dir)

        detect_dataset(temp_dir, format_name="datumaro", importer=dm_env.importers.get("datumaro"))
        dataset = StreamDataset.import_from(temp_dir, "datumaro", env=dm_env)
    else:
        if load_data_callback:
            raise NoMediaInAnnotationFileError()

        tmp_src_file_link = Path(temp_dir) / "annotations" / "default.json"
        tmp_src_file_link.parent.mkdir()
        tmp_src_file_link.symlink_to(src_file.name)
        dataset = StreamDataset.import_from(
            str(tmp_src_file_link.absolute()), "datumaro", env=dm_env
        )

    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
