# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from cvat.apps.quality_control import models
from cvat.apps.quality_control.backends.cuboid import Cuboid3DBackend
from cvat.apps.quality_control.backends.datumaro import Datumaro2DBackend
from cvat.apps.quality_control.validation import validate_quality_task


def requirement(annotation_type, **overrides):
    return SimpleNamespace(
        **{
            **models.QualityRequirement.get_base_defaults(annotation_type),
            "annotation_type": annotation_type,
            "enabled": True,
            "filter": "",
            **overrides,
        }
    )


def task(dimension, media_type, validation_mode="gt"):
    return SimpleNamespace(
        dimension=dimension,
        media_type=media_type,
        data=SimpleNamespace(validation_mode=validation_mode),
    )


class TestQualityTaskValidation(unittest.TestCase):
    def test_valid_2d_and_3d_requirements_need_no_backend_instance(self):
        with (
            patch.object(Datumaro2DBackend, "__init__", side_effect=AssertionError("data read")),
            patch.object(Cuboid3DBackend, "__init__", side_effect=AssertionError("data read")),
        ):
            metrics_by_type = models.QualityRequirement.get_supported_similarity_metrics()
            for annotation_type, metrics in metrics_by_type.items():
                data = (
                    task("3d", "point_cloud")
                    if annotation_type == "cuboid"
                    else task("2d", "image")
                )
                for metric in metrics:
                    with self.subTest(annotation_type=annotation_type, metric=metric):
                        validate_quality_task(
                            data, [requirement(annotation_type, similarity_metric=metric)]
                        )
            validate_quality_task(task("2d", "image", "gt_pool"), [requirement("rectangle")])

    def test_task_data_is_checked_even_without_enabled_requirements(self):
        for data, error in (
            (task("3d", "image"), "point_cloud"),
            (task("2d", "point_cloud"), "image"),
            (task("2d", "audio"), "image"),
            (task("3d", "point_cloud", "gt_pool"), "ordinary"),
            (task("3d", "point_cloud", None), "ordinary"),
        ):
            with self.subTest(data=data), self.assertRaisesRegex(ValueError, error):
                validate_quality_task(data, [])

    def test_invalid_enabled_requirements_are_rejected(self):
        for data, invalid_requirement, error in (
            (task("3d", "point_cloud"), requirement("rectangle"), "only cuboid"),
            (task("2d", "image"), requirement("cuboid"), "requirements"),
            (
                task("3d", "point_cloud"),
                requirement("cuboid", compare_groups=True),
                "compare_groups",
            ),
            (
                task("3d", "point_cloud"),
                requirement("cuboid", group_match_threshold=0.5),
                "group_match_threshold",
            ),
            (
                task("3d", "point_cloud"),
                requirement("cuboid", similarity_metric="boundary_f"),
                "similarity metric",
            ),
            (
                task("2d", "image"),
                requirement("rectangle", similarity_metric="oks"),
                "similarity metric",
            ),
        ):
            with (
                self.subTest(requirement=invalid_requirement),
                self.assertRaisesRegex(ValueError, error),
            ):
                validate_quality_task(data, [invalid_requirement])

        invalid_requirement = requirement(
            "cuboid", enabled=False, compare_groups=True, iou_threshold={}
        )
        validate_quality_task(task("3d", "point_cloud"), [invalid_requirement])
        validate_quality_task(task("2d", "image"), [invalid_requirement])

    def test_cuboids_require_a_finite_numeric_iou_threshold(self):
        data = task("3d", "point_cloud")
        for threshold in (
            None,
            "0.5",
            {},
            {"type": "iou", "mode": "constant", "value": 0.5},
            float("nan"),
            float("inf"),
            -0.1,
            1.1,
        ):
            with (
                self.subTest(threshold=threshold),
                self.assertRaisesRegex(ValueError, "numeric threshold"),
            ):
                validate_quality_task(data, [requirement("cuboid", iou_threshold=threshold)])
        for threshold in (0, 0.5, 1):
            validate_quality_task(data, [requirement("cuboid", iou_threshold=threshold)])
