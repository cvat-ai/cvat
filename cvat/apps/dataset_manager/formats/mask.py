# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from tempfile import TemporaryDirectory

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import CvatAnnotationsExtractor, \
    import_dm_annotations
from cvat.apps.dataset_manager.formats import dm_env, exporter, importer
from cvat.apps.dataset_manager.util import make_zip_archive
from datumaro.components.project import Dataset


@exporter(name="MASK", ext="ZIP", version="1.1")
def export_mask(dst_file, annotations, **options):
    extractor = CvatAnnotationsExtractor(annotations)
    with TemporaryDirectory() as temp_dir:
        envt = dm_env.transforms
        extractor = extractor.transform(envt.get('polygons_to_masks'))
        extractor = extractor.transform(envt.get('boxes_to_masks'))
        extractor = extractor.transform(envt.get('merge_instance_segments'))
        extractor = extractor.transform(envt.get('id_from_image_name'))
        extractor = Dataset.from_extractors(extractor) # apply lazy transforms

        converter = dm_env.make_converter('voc_segmentation',
            apply_colormap=True, label_map='source',
            save_images=save_images)
        converter(extractor, save_dir=temp_dir)

        make_zip_archive(temp_dir, file_object)

@importer(name="MASK", ext="ZIP", version="1.0")
def import_mask(src_file, annotations, **options):
    archive_file = file_object if isinstance(file_object, str) else getattr(file_object, "name")
    with TemporaryDirectory() as tmp_dir:
        Archive(archive_file).extractall(tmp_dir)

        dm_dataset = dm_env.make_importer('voc')(tmp_dir).make_dataset()
        masks_to_polygons = Environment().transforms.get('masks_to_polygons')
        dm_dataset = dm_dataset.transform(masks_to_polygons)
        import_dm_annotations(dm_dataset, annotations)
