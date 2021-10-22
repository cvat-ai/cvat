# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset
from datumaro.components.extractor import ItemTransform
from datumaro.util.image import Image
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer

class DeleteImagePath(ItemTransform):
    def transform_item(self, item):
        if not item.has_image:
            return item
        new_image = None
        if item.image.has_data:
            new_image = Image(data=item.image.data, size=item.image.size)
        return item.wrap(image=new_image)


@exporter(name="Datumaro", ext="ZIP", version="1.0")
def _export(dst_file, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data=instance_data, include_images=save_images), env=dm_env)
    if not save_images:
        dataset.transform(DeleteImagePath)
    with TemporaryDirectory() as tmp_dir:
        dataset.export(tmp_dir, 'datumaro', save_images=save_images)

        make_zip_archive(tmp_dir, dst_file)

@importer(name="Datumaro", ext="ZIP", version="1.0")
def _import(src_file, instance_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        dataset = Dataset.import_from(tmp_dir, 'datumaro', env=dm_env)

        import_dm_annotations(dataset, instance_data)
