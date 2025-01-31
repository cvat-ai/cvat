# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
import shutil
from glob import glob

from datumaro.components.dataset import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    detect_dataset,
    import_dm_annotations,
)
from cvat.apps.dataset_manager.formats.transformations import MaskToPolygonTransformation
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name="PASCAL VOC", ext="ZIP", version="1.1")
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)

        dataset.export(temp_dir, "voc", save_images=save_images, label_map="source")

    make_zip_archive(temp_dir, dst_file)


@importer(name="PASCAL VOC", ext="ZIP", version="1.1")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    # put label map from the task if not present
    labelmap_file = osp.join(temp_dir, "labelmap.txt")
    if not osp.isfile(labelmap_file):
        labels_meta = instance_data.meta[instance_data.META_FIELD]["labels"]
        labels = (label["name"] + ":::" for _, label in labels_meta)
        with open(labelmap_file, "w") as f:
            f.write("\n".join(labels))

    # support flat archive layout
    anno_dir = osp.join(temp_dir, "Annotations")
    if not osp.isdir(anno_dir):
        anno_files = glob(osp.join(temp_dir, "**", "*.xml"), recursive=True)
        subsets_dir = osp.join(temp_dir, "ImageSets", "Main")
        os.makedirs(subsets_dir, exist_ok=True)
        with open(osp.join(subsets_dir, "train.txt"), "w") as subset_file:
            for f in anno_files:
                subset_file.write(osp.splitext(osp.basename(f))[0] + "\n")

        os.makedirs(anno_dir, exist_ok=True)
        for f in anno_files:
            shutil.move(f, anno_dir)

    detect_dataset(temp_dir, format_name="voc", importer=dm_env.importers.get("voc"))
    dataset = Dataset.import_from(temp_dir, "voc", env=dm_env)
    dataset = MaskToPolygonTransformation.convert_dataset(dataset, **kwargs)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
