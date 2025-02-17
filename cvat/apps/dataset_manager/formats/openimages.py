# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import glob
import os.path as osp

from datumaro.components.dataset import Dataset, DatasetItem
from datumaro.plugins.data_formats.open_images import OpenImagesPath
from datumaro.util.image import DEFAULT_IMAGE_META_FILE_NAME
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    detect_dataset,
    find_dataset_root,
    import_dm_annotations,
    match_dm_item,
)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer
from .transformations import MaskToPolygonTransformation, RotatedBoxesToPolygons


def find_item_ids(path):
    image_desc_patterns = (
        OpenImagesPath.FULL_IMAGE_DESCRIPTION_FILE_NAME,
        *OpenImagesPath.SUBSET_IMAGE_DESCRIPTION_FILE_PATTERNS,
    )

    image_desc_patterns = (
        osp.join(path, OpenImagesPath.ANNOTATIONS_DIR, pattern) for pattern in image_desc_patterns
    )

    for pattern in image_desc_patterns:
        for path in glob.glob(pattern):
            with open(path, "r") as desc:
                next(desc)
                for row in desc:
                    yield row.split(",")[0]


@exporter(name="Open Images V6", ext="ZIP", version="1.0")
def _export(dst_file, temp_dir, task_data, save_images=False):
    with GetCVATDataExtractor(task_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.transform(RotatedBoxesToPolygons)
        dataset.transform("polygons_to_masks")
        dataset.transform("merge_instance_segments")

        dataset.export(temp_dir, "open_images", save_images=save_images)

    make_zip_archive(temp_dir, dst_file)


@importer(name="Open Images V6", ext="ZIP", version="1.0")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    image_meta_path = osp.join(
        temp_dir, OpenImagesPath.ANNOTATIONS_DIR, DEFAULT_IMAGE_META_FILE_NAME
    )
    image_meta = None

    if not osp.isfile(image_meta_path):
        image_meta = {}
        item_ids = list(find_item_ids(temp_dir))

        root_hint = find_dataset_root(
            [DatasetItem(id=item_id) for item_id in item_ids], instance_data
        )

        for item_id in item_ids:
            frame_info = None
            try:
                frame_id = match_dm_item(DatasetItem(id=item_id), instance_data, root_hint)
                frame_info = instance_data.frame_info[frame_id]
            except Exception:  # nosec
                pass
            if frame_info is not None:
                image_meta[item_id] = (frame_info["height"], frame_info["width"])

    detect_dataset(
        temp_dir, format_name="open_images", importer=dm_env.importers.get("open_images")
    )
    dataset = Dataset.import_from(temp_dir, "open_images", image_meta=image_meta, env=dm_env)
    dataset = MaskToPolygonTransformation.convert_dataset(dataset, **kwargs)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
