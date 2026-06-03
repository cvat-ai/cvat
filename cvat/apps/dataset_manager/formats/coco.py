# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import shutil
import zipfile
from pathlib import Path
from typing import BinaryIO, Union

from datumaro.components.annotation import AnnotationType
from datumaro.components.dataset import StreamDataset
from datumaro.components.transformer import ItemTransform
from datumaro.plugins.data_formats.coco.importer import CocoImporter

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    NoMediaInAnnotationFileError,
    detect_dataset,
    import_dm_annotations,
)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer
from .transformations import EllipsesToMasks


def _fix_zero_category_ids(coco_json_path: Union[str, Path]) -> bool:
    """Fix COCO JSON files where category IDs start from 0.

    COCO standard conventionally reserves category_id 0 for background/no class,
    but some tools (like FiftyOne) export datasets with category_id=0 as a valid
    category. Datumaro's COCO parser treats category_id=0 as 'no label' (int 0 is
    falsy in Python), which causes import failures in CVAT.

    This function shifts all category IDs by +1 (and updates annotation references)
    to work around this limitation.

    Returns True if the file was modified, False otherwise.
    """
    with open(coco_json_path, "r") as f:
        data = json.load(f)

    if "categories" not in data:
        return False

    has_zero_id = any(cat.get("id") == 0 for cat in data["categories"])
    if not has_zero_id:
        return False

    # Build mapping: old category id -> new category id (+1 shift)
    id_map = {}
    for cat in data["categories"]:
        old_id = cat["id"]
        new_id = old_id + 1
        id_map[old_id] = new_id
        cat["id"] = new_id

    # Update category_id references in annotations
    for ann in data.get("annotations", []):
        old_cat_id = ann.get("category_id")
        if old_cat_id in id_map:
            ann["category_id"] = id_map[old_cat_id]

    # Also handle alternate annotation keys (e.g. stuff_annotations)
    for key in data:
        if key.endswith("_annotations") and isinstance(data[key], list):
            for ann in data[key]:
                old_cat_id = ann.get("category_id")
                if old_cat_id in id_map:
                    ann["category_id"] = id_map[old_cat_id]

    with open(coco_json_path, "w") as f:
        json.dump(data, f)

    return True


def _fix_coco_dir_annotations(temp_dir: Path) -> None:
    """Find and fix zero-based category IDs in all COCO JSON files
    under the annotations/ directory of an extracted COCO dataset."""
    annotations_dir = temp_dir / "annotations"
    if annotations_dir.is_dir():
        for json_file in sorted(annotations_dir.glob("*.json")):
            try:
                _fix_zero_category_ids(json_file)
            except Exception:
                pass  # skip malformed files, let datumaro fail with its own error


@exporter(name="COCO", ext="ZIP", version="1.0")
def _export_instances(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = StreamDataset.from_extractors(extractor, env=dm_env)
        dataset.transform(EllipsesToMasks)
        dataset.export(temp_dir, "coco_instances", save_media=save_images, merge_images=False)

    make_zip_archive(temp_dir, dst_file)


@importer(name="COCO", ext="JSON, ZIP", version="1.0")
def _import_instances(
    src_file: BinaryIO, temp_dir, instance_data, load_data_callback=None, **kwargs
):
    if zipfile.is_zipfile(src_file):
        zipfile.ZipFile(src_file).extractall(temp_dir)
        _fix_coco_dir_annotations(Path(temp_dir))
        # We use coco importer because it gives better error message
        detect_dataset(temp_dir, format_name="coco", importer=CocoImporter)
        dataset = StreamDataset.import_from(temp_dir, "coco_instances", env=dm_env)
        if load_data_callback is not None:
            load_data_callback(dataset, instance_data)
        import_dm_annotations(dataset, instance_data)
    else:
        if load_data_callback:
            raise NoMediaInAnnotationFileError()

        tmp_src_file_link = Path(temp_dir) / "annotations" / "default.json"
        tmp_src_file_link.parent.mkdir()

        # Copy the JSON file (we need to potentially modify it)
        shutil.copy2(src_file.name, str(tmp_src_file_link))
        _fix_zero_category_ids(tmp_src_file_link)

        dataset = StreamDataset.import_from(
            str(tmp_src_file_link.absolute()), "coco_instances", env=dm_env
        )
        import_dm_annotations(dataset, instance_data)


@exporter(name="COCO Keypoints", ext="ZIP", version="1.0")
def _export_keypoints(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = StreamDataset.from_extractors(extractor, env=dm_env)
        dataset.transform(EllipsesToMasks)
        dataset.export(
            temp_dir, "coco_person_keypoints", save_media=save_images, merge_images=False
        )

    make_zip_archive(temp_dir, dst_file)


class RemoveBboxAnnotations(ItemTransform):
    # Boxes would have invalid (skeleton) labels, so remove them
    # TODO: find a way to import boxes
    def transform_item(self, item):
        def convert_annotations():
            return [ann for ann in item.annotations if ann.type != AnnotationType.bbox]

        return item.wrap(annotations=convert_annotations)


@importer(name="COCO Keypoints", ext="JSON, ZIP", version="1.0")
def _import_keypoints(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    if zipfile.is_zipfile(src_file):
        zipfile.ZipFile(src_file).extractall(temp_dir)
        _fix_coco_dir_annotations(Path(temp_dir))
        # We use coco importer because it gives better error message
        detect_dataset(temp_dir, format_name="coco", importer=CocoImporter)
        dataset = StreamDataset.import_from(temp_dir, "coco_person_keypoints", env=dm_env)
        dataset = dataset.transform(RemoveBboxAnnotations)
        if load_data_callback is not None:
            load_data_callback(dataset, instance_data)
        import_dm_annotations(dataset, instance_data)
    else:
        if load_data_callback:
            raise NoMediaInAnnotationFileError()

        tmp_src_file_link = Path(temp_dir) / "annotations" / "default.json"
        tmp_src_file_link.parent.mkdir()

        # Copy the JSON file (we need to potentially modify it)
        shutil.copy2(src_file.name, str(tmp_src_file_link))
        _fix_zero_category_ids(tmp_src_file_link)

        dataset = StreamDataset.import_from(
            str(tmp_src_file_link.absolute()), "coco_person_keypoints", env=dm_env
        )
        dataset = dataset.transform(RemoveBboxAnnotations)
        import_dm_annotations(dataset, instance_data)
