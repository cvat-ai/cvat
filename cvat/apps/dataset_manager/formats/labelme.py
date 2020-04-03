# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "LabelMe",
    "dumpers": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "3.0",
            "handler": "dump"
        }
    ],
    "loaders": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "3.0",
            "handler": "load",
        }
    ],
}


from datumaro.components.converter import Converter
class CvatLabelMeConverter(Converter):
    def __init__(self, save_images=False):
        self._save_images = save_images

    def __call__(self, extractor, save_dir):
        from datumaro.components.project import Environment, Dataset

        env = Environment()
        id_from_image = env.transforms.get('id_from_image_name')

        extractor = extractor.transform(id_from_image)
        extractor = Dataset.from_extractors(extractor) # apply lazy transforms

        converter = env.make_converter('label_me', save_images=self._save_images)
        converter(extractor, save_dir=save_dir)

def dump(file_object, annotations):
    from cvat.apps.dataset_manager.bindings import CvatAnnotationsExtractor
    from cvat.apps.dataset_manager.util import make_zip_archive
    from tempfile import TemporaryDirectory

    extractor = CvatAnnotationsExtractor('', annotations)
    converter = CvatLabelMeConverter()
    with TemporaryDirectory() as temp_dir:
        converter(extractor, save_dir=temp_dir)
        make_zip_archive(temp_dir, file_object)

def load(file_object, annotations):
    from pyunpack import Archive
    from tempfile import TemporaryDirectory
    from datumaro.plugins.labelme_format import LabelMeImporter
    from datumaro.components.project import Environment
    from cvat.apps.dataset_manager.bindings import import_dm_annotations

    archive_file = file_object if isinstance(file_object, str) else getattr(file_object, "name")
    with TemporaryDirectory() as tmp_dir:
        Archive(archive_file).extractall(tmp_dir)

        dm_dataset = LabelMeImporter()(tmp_dir).make_dataset()
        masks_to_polygons = Environment().transforms.get('masks_to_polygons')
        dm_dataset = dm_dataset.transform(masks_to_polygons)
        import_dm_annotations(dm_dataset, annotations)
