# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.dataset import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import GetCVATDataExtractor, import_dm_annotations
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer
from .transformations import MaskToPolygonTransformation, RotatedBoxesToPolygons
from .utils import make_colormap


@exporter(name="CamVid", ext="ZIP", version="1.0")
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.transform(RotatedBoxesToPolygons)
        dataset.transform("polygons_to_masks")
        dataset.transform("boxes_to_masks")
        dataset.transform("merge_instance_segments")
        label_map = make_colormap(instance_data)

        dataset.export(
            temp_dir,
            "camvid",
            save_images=save_images,
            apply_colormap=True,
            label_map={label: label_map[label][0] for label in label_map},
        )

    make_zip_archive(temp_dir, dst_file)


@importer(name="CamVid", ext="ZIP", version="1.0")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    # We do not run detect_dataset before import because the Camvid format
    # has problem with the dataset detection in case of empty annotation file(s)
    # Details in: https://github.com/cvat-ai/datumaro/issues/43
    dataset = Dataset.import_from(temp_dir, "camvid", env=dm_env)
    dataset = MaskToPolygonTransformation.convert_dataset(dataset, **kwargs)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
