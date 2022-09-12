# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import zipfile
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset
from datumaro.components.annotation import AnnotationType

from cvat.apps.dataset_manager.bindings import GetCVATDataExtractor, \
    import_dm_annotations
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer

@exporter(name='COCO', ext='ZIP', version='1.0')
def _export(dst_file, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'coco_instances', save_images=save_images,
            merge_images=True)

        make_zip_archive(temp_dir, dst_file)

@importer(name='COCO', ext='JSON, ZIP', version='1.0')
def _import(src_file, instance_data, load_data_callback=None):
    if zipfile.is_zipfile(src_file):
        with TemporaryDirectory() as tmp_dir:
            zipfile.ZipFile(src_file).extractall(tmp_dir)
            dataset = Dataset.import_from(tmp_dir, 'coco_instances', env=dm_env)
            if load_data_callback is not None:
                load_data_callback(dataset, instance_data)
            import_dm_annotations(dataset, instance_data)
    else:
        dataset = Dataset.import_from(src_file.name,
            'coco_instances', env=dm_env)
        import_dm_annotations(dataset, instance_data)

@exporter(name='COCO Keypoints', ext='ZIP', version='1.0')
def _export(dst_file, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'coco_person_keypoints', save_images=save_images,
            merge_images=True)

        make_zip_archive(temp_dir, dst_file)

@importer(name='COCO Keypoints', ext='JSON, ZIP', version='1.0')
def _import(src_file, instance_data, load_data_callback=None):
    def remove_extra_annotations(dataset):
        for item in dataset:
            annotations = [ann for ann in item.annotations
                if ann.type != AnnotationType.bbox]
            item.annotations = annotations

    if zipfile.is_zipfile(src_file):
        with TemporaryDirectory() as tmp_dir:
            zipfile.ZipFile(src_file).extractall(tmp_dir)
            dataset = Dataset.import_from(tmp_dir, 'coco_person_keypoints', env=dm_env)
            remove_extra_annotations(dataset)
            if load_data_callback is not None:
                load_data_callback(dataset, instance_data)
            import_dm_annotations(dataset, instance_data)
    else:
        dataset = Dataset.import_from(src_file.name,
            'coco_person_keypoints', env=dm_env)
        remove_extra_annotations(dataset)
        import_dm_annotations(dataset, instance_data)
