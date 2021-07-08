# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from tempfile import TemporaryDirectory

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (CvatTaskDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive
from datumaro.components.project import Dataset

from .registry import dm_env, exporter, importer


from datumaro.util.tf_util import import_tf
try:
    import_tf()
    tf_available = True
except ImportError:
    tf_available = False


@exporter(name='TFRecord', ext='ZIP', version='1.0', enabled=tf_available)
def _export(dst_file, task_data, save_images=False):
    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'tf_detection_api', save_images=save_images)

        make_zip_archive(temp_dir, dst_file)

@importer(name='TFRecord', ext='ZIP', version='1.0', enabled=tf_available)
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        dataset = Dataset.import_from(tmp_dir, 'tf_detection_api', env=dm_env)
        import_dm_annotations(dataset, task_data)
