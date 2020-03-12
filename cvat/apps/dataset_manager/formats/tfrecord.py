# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "TFRecord",
    "dumpers": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.0",
            "handler": "dump"
        },
    ],
    "loaders": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.0",
            "handler": "load"
        },
    ],
}

from datumaro.plugins.tf_detection_api_format.converter import \
    TfDetectionApiConverter as _TfDetectionApiConverter
class CvatTfrecordConverter(_TfDetectionApiConverter):
    NAME = 'cvat_tfrecord'

def dump(file_object, annotations):
    from cvat.apps.dataset_manager.bindings import CvatAnnotationsExtractor
    from cvat.apps.dataset_manager.util import make_zip_archive
    from tempfile import TemporaryDirectory

    extractor = CvatAnnotationsExtractor('', annotations)
    converter = CvatTfrecordConverter()
    with TemporaryDirectory() as temp_dir:
        converter(extractor, save_dir=temp_dir)
        make_zip_archive(temp_dir, file_object)

def load(file_object, annotations):
    from pyunpack import Archive
    from tempfile import TemporaryDirectory
    from datumaro.plugins.tf_detection_api_format.importer import TfDetectionApiImporter
    from cvat.apps.dataset_manager.bindings import import_dm_annotations

    archive_file = file_object if isinstance(file_object, str) else getattr(file_object, "name")
    with TemporaryDirectory() as tmp_dir:
        Archive(archive_file).extractall(tmp_dir)

        dm_project = TfDetectionApiImporter()(tmp_dir)
        dm_dataset = dm_project.make_dataset()
        import_dm_annotations(dm_dataset, annotations)
