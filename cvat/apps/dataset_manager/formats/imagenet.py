# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
import zipfile
from glob import glob

from datumaro.components.dataset import Dataset

from cvat.apps.dataset_manager.bindings import GetCVATDataExtractor, import_dm_annotations
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name="ImageNet", ext="ZIP", version="1.0")
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        if save_images:
            dataset.export(temp_dir, "imagenet", save_images=save_images)
        else:
            dataset.export(temp_dir, "imagenet_txt", save_images=save_images)

    make_zip_archive(temp_dir, dst_file)


@importer(name="ImageNet", ext="ZIP", version="1.0")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    zipfile.ZipFile(src_file).extractall(temp_dir)

    # We do not run detect_dataset before import because the Imagenet format
    # has problem with the dataset detection in case of empty annotation file(s)
    # Details in: https://github.com/cvat-ai/datumaro/issues/43
    if glob(osp.join(temp_dir, "*.txt")):
        dataset = Dataset.import_from(temp_dir, "imagenet_txt", env=dm_env)
    else:
        dataset = Dataset.import_from(temp_dir, "imagenet", env=dm_env)
        if load_data_callback is not None:
            load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
