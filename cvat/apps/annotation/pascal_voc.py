# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "PASCAL VOC",
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

def load(file_object, annotations):
    from pyunpack import Archive
    from tempfile import TemporaryDirectory
    from datumaro.plugins.voc_format.importer import VocImporter
    from cvat.apps.dataset_manager.bindings import import_dm_annotations

    archive_file = file_object if isinstance(file_object, str) else getattr(file_object, "name")
    with TemporaryDirectory() as tmp_dir:
        Archive(archive_file).extractall(tmp_dir)

        dm_project = VocImporter()(tmp_dir)
        dm_dataset = dm_project.make_dataset()
        import_dm_annotations(dm_dataset, annotations)

def dump(file_object, annotations):
    from cvat.apps.dataset_manager.bindings import CvatAnnotationsExtractor
    from cvat.apps.dataset_manager.util import make_zip_archive
    from datumaro.components.project import Environment
    from tempfile import TemporaryDirectory

    env = Environment()
    id_from_image = env.transforms.get('id_from_image_name')

    extractor = CvatAnnotationsExtractor('', annotations)
    extractor = extractor.transform(id_from_image)
    converter = env.make_converter('voc_detection')
    with TemporaryDirectory() as temp_dir:
        converter(extractor, save_dir=temp_dir)
        make_zip_archive(temp_dir, file_object)