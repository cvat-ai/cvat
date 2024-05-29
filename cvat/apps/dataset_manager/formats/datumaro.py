# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.dataset import Dataset
from datumaro.components.extractor import ItemTransform
from datumaro.util.image import Image

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor, detect_dataset,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.models import DimensionType

from .registry import dm_env, exporter, importer

class DeleteImagePath(ItemTransform):
    def transform_item(self, item):
        image = None
        if item.has_image and item.image.has_data:
            image = Image(data=item.image.data, size=item.image.size)
        return item.wrap(image=image, point_cloud='', related_images=[])


@exporter(name="Datumaro", ext="ZIP", version="1.0")
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data=instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        if not save_images:
            dataset.transform(DeleteImagePath)
        dataset.export(temp_dir, 'datumaro', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)

@importer(name="Datumaro", ext="ZIP", version="1.0")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    detect_dataset(temp_dir, format_name='datumaro', importer=dm_env.importers.get('datumaro'))
    dataset = Dataset.import_from(temp_dir, 'datumaro', env=dm_env)

    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)

@exporter(name="Datumaro 3D", ext="ZIP", version="1.0", dimension=DimensionType.DIM_3D)
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(
        instance_data=instance_data, include_images=save_images,
        dimension=DimensionType.DIM_3D,
    ) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)

        if not save_images:
            dataset.transform(DeleteImagePath)
        dataset.export(temp_dir, 'datumaro', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)

@importer(name="Datumaro 3D", ext="ZIP", version="1.0", dimension=DimensionType.DIM_3D)
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    detect_dataset(temp_dir, format_name='datumaro', importer=dm_env.importers.get('datumaro'))
    dataset = Dataset.import_from(temp_dir, 'datumaro', env=dm_env)

    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
