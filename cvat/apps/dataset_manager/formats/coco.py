# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import zipfile
import json
import uuid
from datumaro.components.dataset import Dataset
from datumaro.components.annotation import AnnotationType

from cvat.apps.dataset_manager.bindings import GetCVATDataExtractor, \
    import_dm_annotations
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer

@exporter(name='COCO', ext='ZIP', version='1.0')
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, 'coco_instances', save_images=save_images,
            merge_images=True)

    make_zip_archive(temp_dir, dst_file)

@importer(name='COCO', ext='JSON, ZIP', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    if zipfile.is_zipfile(src_file):
        zipfile.ZipFile(src_file).extractall(temp_dir)
        dataset = Dataset.import_from(temp_dir, 'coco_instances', env=dm_env)
        if load_data_callback is not None:
            load_data_callback(dataset, instance_data)
        import_dm_annotations(dataset, instance_data)
    else:
        rename_mapping, src_file = update_annotation_data(src_file)
        #To get reverse map with image names without extension
        reverse_mapping = {value: key for key, value in rename_mapping.items()}
        reverse_no_ext_mapping = {key.rsplit('.', 1)[0]: value.rsplit('.', 1)[0] for key, value in reverse_mapping.items()}

        dataset = Dataset.import_from(src_file.name,
            'coco_instances', env=dm_env)
        #Reverse mapping names
        for item in dataset:
            item.id = reverse_no_ext_mapping[item.id]
        import_dm_annotations(dataset, instance_data)

@exporter(name='COCO Keypoints', ext='ZIP', version='1.0')
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, 'coco_person_keypoints', save_images=save_images,
            merge_images=True)

    make_zip_archive(temp_dir, dst_file)

@importer(name='COCO Keypoints', ext='JSON, ZIP', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    def remove_extra_annotations(dataset):
        for item in dataset:
            annotations = [ann for ann in item.annotations
                if ann.type != AnnotationType.bbox]
            item.annotations = annotations

    if zipfile.is_zipfile(src_file):
        zipfile.ZipFile(src_file).extractall(temp_dir)
        dataset = Dataset.import_from(temp_dir, 'coco_person_keypoints', env=dm_env)
        remove_extra_annotations(dataset)
        if load_data_callback is not None:
            load_data_callback(dataset, instance_data)
        import_dm_annotations(dataset, instance_data)
    else:
        dataset = Dataset.import_from(src_file.name,
            'coco_person_keypoints', env=dm_env)
        remove_extra_annotations(dataset)
        import_dm_annotations(dataset, instance_data)


def update_annotation_data(src_file):
    rename_mapping = {}
    with open(src_file.name, 'r') as f:
        annotation_data = json.load(f)

    for image in annotation_data['images']:
        original_filename = image['file_name']
        unique_id = str(uuid.uuid4())[:8]  # Generating a unique ID
        name, extension = original_filename.split('.')
        new_name = f"{name}_{unique_id}.{extension}"
        rename_mapping[original_filename] = new_name
        image['file_name'] = new_name

    with open(src_file.name, 'w') as f:
        json.dump(annotation_data, f, indent=4)

    # Returning src_file along with rename_mapping
    return rename_mapping, src_file