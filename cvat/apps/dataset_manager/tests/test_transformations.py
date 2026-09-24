# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import tempfile
from pathlib import Path
from unittest import TestCase

import datumaro as dm
import numpy as np

from cvat.apps.dataset_manager.formats.transformations import (
    AddPoseBboxFromSkeleton,
    SetPoseBboxFromGroup,
)
from cvat.apps.dataset_manager.formats.yolo import dm_env


class AddPoseBboxFromSkeletonTest(TestCase):
    @staticmethod
    def _transform_annotations(annotations):
        dataset = dm.Dataset.from_iterable([dm.DatasetItem("image", annotations=annotations)])
        dataset.transform(AddPoseBboxFromSkeleton)
        return dataset.get("image").annotations

    def test_adds_rectangle_grouped_with_skeleton(self):
        skeleton = dm.Skeleton(
            [
                dm.Points([30, 40], [dm.Points.Visibility.visible]),
                dm.Points([50, 60], [dm.Points.Visibility.visible]),
            ],
            label=0,
        )

        annotations = self._transform_annotations([skeleton])
        transformed_skeleton = next(ann for ann in annotations if isinstance(ann, dm.Skeleton))
        rectangle = next(ann for ann in annotations if isinstance(ann, dm.Bbox))

        self.assertNotEqual(transformed_skeleton.group, 0)
        self.assertEqual(rectangle.group, transformed_skeleton.group)
        self.assertEqual(rectangle.label, transformed_skeleton.label)
        self.assertEqual(rectangle.get_bbox(), skeleton.get_bbox())

    def test_assigns_separate_groups_to_multiple_skeletons(self):
        skeletons = [
            dm.Skeleton([dm.Points([10, 20], [dm.Points.Visibility.visible])], label=0),
            dm.Skeleton([dm.Points([30, 40], [dm.Points.Visibility.visible])], label=0),
        ]

        annotations = self._transform_annotations(skeletons)
        skeleton_groups = {ann.group for ann in annotations if isinstance(ann, dm.Skeleton)}
        rectangle_groups = {ann.group for ann in annotations if isinstance(ann, dm.Bbox)}

        self.assertEqual(len(skeleton_groups), 2)
        self.assertEqual(rectangle_groups, skeleton_groups)



class SetPoseBboxFromGroupTest(TestCase):
    @staticmethod
    def _transform_annotations(annotations):
        dataset = dm.Dataset.from_iterable([dm.DatasetItem("image", annotations=annotations)])
        dataset.transform(SetPoseBboxFromGroup)
        return dataset.get("image").annotations

    def test_pose_bbox_is_taken_from_grouped_rectangle(self):
        skeleton = dm.Skeleton(
            [
                dm.Points([30, 40], [dm.Points.Visibility.visible]),
                dm.Points([50, 60], [dm.Points.Visibility.visible]),
            ],
            label=0,
            group=1,
        )
        rectangle = dm.Bbox(10, 20, 100, 200, label=1, group=1)
        transformed_skeleton = next(
            ann
            for ann in self._transform_annotations([rectangle, skeleton])
            if isinstance(ann, dm.Skeleton)
        )

        self.assertEqual(transformed_skeleton.get_bbox(), rectangle.get_bbox())
        self.assertEqual(transformed_skeleton.elements, skeleton.elements)

    def test_grouped_rectangle_is_exported_as_yolo_pose_bbox(self):
        skeleton = dm.Skeleton(
            [
                dm.Points([30, 40], [dm.Points.Visibility.visible], label=1),
                dm.Points([50, 60], [dm.Points.Visibility.visible], label=2),
            ],
            label=0,
            group=1,
        )
        rectangle = dm.Bbox(10, 20, 100, 200, label=3, group=1)
        dataset = dm.Dataset.from_iterable(
            [
                dm.DatasetItem(
                    "image",
                    subset="train",
                    media=dm.Image.from_numpy(data=np.ones((400, 200, 3))),
                    annotations=[rectangle, skeleton],
                )
            ],
            categories={
                dm.AnnotationType.label: dm.LabelCategories.from_iterable(
                    ["skeleton", ("point_1", "skeleton"), ("point_2", "skeleton"), "box"]
                ),
                dm.AnnotationType.points: dm.PointsCategories.from_iterable(
                    [(0, ["point_1", "point_2"], set())]
                ),
            },
        )
        dataset.transform(SetPoseBboxFromGroup)

        with tempfile.TemporaryDirectory() as temp_dir:
            dataset.export(temp_dir, "yolo_ultralytics_pose", save_media=False)
            values = (Path(temp_dir) / "labels" / "train" / "image.txt").read_text().split()

            imported_dataset = dm.StreamDataset.import_from(
                temp_dir,
                "yolo_ultralytics_pose",
                env=dm_env,
                image_info={"image": (400, 200)},
            )
            imported_dataset.transform(AddPoseBboxFromSkeleton)
            imported_annotations = next(iter(imported_dataset)).annotations

        self.assertEqual(values[:5], ["0", "0.300000", "0.300000", "0.500000", "0.500000"])
        imported_skeleton = next(
            ann for ann in imported_annotations if isinstance(ann, dm.Skeleton)
        )
        imported_rectangle = next(ann for ann in imported_annotations if isinstance(ann, dm.Bbox))
        self.assertEqual(imported_rectangle.group, imported_skeleton.group)
        self.assertEqual(imported_rectangle.get_bbox(), rectangle.get_bbox())

    def test_pose_bbox_is_unchanged_without_grouped_rectangle(self):
        skeleton = dm.Skeleton(
            [dm.Points([30, 40], [dm.Points.Visibility.visible])], label=0
        )

        [transformed_skeleton] = self._transform_annotations([skeleton])

        self.assertEqual(transformed_skeleton.get_bbox(), skeleton.get_bbox())

    def test_pose_bbox_is_unchanged_with_ambiguous_grouped_rectangles(self):
        skeleton = dm.Skeleton(
            [dm.Points([30, 40], [dm.Points.Visibility.visible])], label=0, group=1
        )
        rectangles = [
            dm.Bbox(10, 20, 100, 200, label=1, group=1),
            dm.Bbox(15, 25, 90, 190, label=2, group=1),
        ]

        transformed_skeleton = next(
            ann
            for ann in self._transform_annotations([*rectangles, skeleton])
            if isinstance(ann, dm.Skeleton)
        )

        self.assertEqual(transformed_skeleton.get_bbox(), skeleton.get_bbox())
