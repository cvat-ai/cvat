# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os.path as osp
import tempfile
import unittest
from glob import glob

import datumaro as dm
import numpy as np
from datumaro.components.annotation import AnnotationType
from cvat.apps.dataset_manager.formats.registry import dm_env
from cvat.apps.dataset_manager.formats.yolo import CvatYoloExporter


class TestYoloExportWithRepeatedSkeletonSublabels(unittest.TestCase):
    def test_obj_names_match_remapped_annotation_class_ids(self):
        # Mimic HPE-style skeletons that reuse keypoint names across parents,
        # plus a top-level rectangle label added later (#8090).
        label_categories = dm.LabelCategories()
        points_categories = dm.PointsCategories()

        for skeleton_name in ("body", "face"):
            parent_id = label_categories.add(skeleton_name)
            for keypoint in ("1", "2", "3"):
                label_categories.add(keypoint, parent=skeleton_name)
            points_categories.add(parent_id, ["1", "2", "3"])

        taxi_id = label_categories.add("taxi")

        dataset = dm.Dataset.from_iterable(
            [
                dm.DatasetItem(
                    id="img0",
                    media=dm.Image.from_numpy(data=np.zeros((20, 20, 3), dtype=np.uint8)),
                    annotations=[dm.Bbox(1, 1, 10, 10, label=taxi_id)],
                )
            ],
            categories={
                AnnotationType.label: label_categories,
                AnnotationType.points: points_categories,
            },
            env=dm_env,
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            CvatYoloExporter.convert(dataset, save_dir=temp_dir, save_media=False)

            with open(osp.join(temp_dir, "obj.names"), encoding="utf-8") as f:
                names = [line.strip() for line in f if line.strip()]

            with open(osp.join(temp_dir, "obj.data"), encoding="utf-8") as f:
                classes_line = next(line for line in f if line.startswith("classes ="))
            classes_count = int(classes_line.split("=", 1)[1].strip())

            label_files = glob(osp.join(temp_dir, "**", "*.txt"), recursive=True)
            label_files = [
                path
                for path in label_files
                if osp.basename(path) not in {"obj.names", "obj.data"}
                and not path.endswith("train.txt")
                and not path.endswith("default.txt")
            ]
            self.assertTrue(label_files)
            with open(label_files[0], encoding="utf-8") as f:
                class_id = int(f.readline().split()[0])

            self.assertEqual(names, ["body", "face", "taxi"])
            self.assertEqual(classes_count, len(names))
            self.assertLess(class_id, len(names))
            self.assertEqual(names[class_id], "taxi")
