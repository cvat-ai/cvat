# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import zipfile

from datumaro.components.dataset import Dataset
from datumaro.components.transformer import ItemTransform

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    detect_dataset,
    import_dm_annotations,
)
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.models import DimensionType

from .registry import dm_env, exporter, importer


class RemoveTrackingInformation(ItemTransform):
    def transform_item(self, item):
        annotations = list(item.annotations)
        for anno in annotations:
            if hasattr(anno, "attributes") and "track_id" in anno.attributes:
                del anno.attributes["track_id"]
        return item.wrap(annotations=annotations)


@exporter(name="Kitti Raw Format", ext="ZIP", version="1.0", dimension=DimensionType.DIM_3D)
def _export_images(dst_file, temp_dir, task_data, save_images=False):
    with GetCVATDataExtractor(
        task_data,
        include_images=save_images,
        format_type="kitti_raw",
        dimension=DimensionType.DIM_3D,
    ) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.transform(RemoveTrackingInformation)
        dataset.export(temp_dir, "kitti_raw", save_images=save_images, reindex=True)

    make_zip_archive(temp_dir, dst_file)


@importer(name="Kitti Raw Format", ext="ZIP", version="1.0", dimension=DimensionType.DIM_3D)
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    if zipfile.is_zipfile(src_file):
        zipfile.ZipFile(src_file).extractall(temp_dir)
        detect_dataset(
            temp_dir, format_name="kitti_raw", importer=dm_env.importers.get("kitti_raw")
        )
        dataset = Dataset.import_from(temp_dir, "kitti_raw", env=dm_env)
    else:
        dataset = Dataset.import_from(src_file.name, "kitti_raw", env=dm_env)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
