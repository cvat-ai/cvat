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
    extractor = CvatTaskDataExtractor(task_data, include_images=save_images)
    extractor = Dataset.from_extractors(extractor) # apply lazy transforms
    with TemporaryDirectory() as temp_dir:
        dm_env.converters.get('tf_detection_api').convert(extractor,
            save_dir=temp_dir, save_images=save_images)

        make_zip_archive(temp_dir, dst_file)

@importer(name='TFRecord', ext='ZIP', version='1.0', enabled=tf_available)
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        dataset = dm_env.make_importer('tf_detection_api')(tmp_dir).make_dataset()
        import_dm_annotations(dataset, task_data)
