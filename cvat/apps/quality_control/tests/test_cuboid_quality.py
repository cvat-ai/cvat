# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import json
import unittest
from types import SimpleNamespace
from unittest import mock

import datumaro as dm
import numpy as np
from attrs import evolve
from scipy.spatial import ConvexHull
from scipy.spatial.transform import Rotation

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.dataset_manager.bindings import CommonData
from cvat.apps.engine.models import DimensionType
from cvat.apps.quality_control.backends import make_quality_backend
from cvat.apps.quality_control.backends.cuboid import Cuboid3DBackend
from cvat.apps.quality_control.backends.datumaro.data_provider import (
    DatumaroJobDataProvider,
    _MemoizingAnnotationConverterFactory,
    _Quality3DDataExtractor,
)
from cvat.apps.quality_control.comparison_report import ComparisonReport, ComparisonReportParameters
from cvat.apps.quality_control.geometry.cuboid import CuboidGeometry, cuboid_iou
from cvat.apps.quality_control.quality_handlers import DatasetQualityEstimator
from cvat.apps.quality_control.tests.test_quality_backends import make_requirement


def box(*, x=0, y=0, z=0, size=2, angles=(0, 0, 0)):
    return [x, y, z, *angles, *([size] * 3 if np.isscalar(size) else size)]


def iou(a, b):
    return cuboid_iou(CuboidGeometry.from_points(a), CuboidGeometry.from_points(b))


def intersection_oracle(a, b):
    """Independent construction: intersections of all triples of halfspace planes."""
    geometries = [CuboidGeometry.from_points(points) for points in (a, b)]
    normals, bounds = [], []
    for geometry in geometries:
        for axis, sign in itertools.product(range(3), (-1, 1)):
            normal = sign * geometry.rotation[:, axis]
            normals.append(normal)
            bounds.append(normal @ geometry.center + geometry.size[axis] / 2)
    normals, bounds = np.array(normals), np.array(bounds)
    vertices = []
    for indices in itertools.combinations(range(12), 3):
        planes = normals[list(indices)]
        if abs(np.linalg.det(planes)) < 1e-12:
            continue
        point = np.linalg.solve(planes, bounds[list(indices)])
        if (normals @ point <= bounds + 1e-10).all():
            vertices.append(point)
    if len(vertices) < 4 or np.linalg.matrix_rank(np.array(vertices) - vertices[0]) < 3:
        return 0
    intersection = ConvexHull(vertices).volume
    return intersection / (sum(np.prod(g.size) for g in geometries) - intersection)


class TestCuboidGeometry(unittest.TestCase):
    def test_analytic_examples(self):
        for a, b, expected in [
            (box(), box(), 1),
            (box(), box(x=1), 1 / 3),
            (box(), box(size=1), 1 / 8),
            (box(), box(x=2), 0),
            (box(), box(x=3), 0),
            (box(), box(size=0), 0),
            (box(), box(x=2, y=2), 0),
            (box(), box(x=2, y=2, z=2), 0),
        ]:
            with self.subTest(a=a, b=b):
                self.assertAlmostEqual(iou(a, b), expected, places=12)

    def test_three_js_euler_xyz_fixture(self):
        # THREE.Vector3(1,2,3).applyEuler(new THREE.Euler(.31,-.47,.83,'XYZ')).
        geometry = CuboidGeometry.from_points(box(size=(2, 4, 6), angles=(0.31, -0.47, 0.83)))
        np.testing.assert_allclose(
            geometry.offsets[-1],
            [-2.0727934486782265, 1.2828905382489628, 2.8386121936587094],
            atol=1e-14,
        )

    def test_independent_oracle_symmetry_and_rigid_transforms(self):
        rng = np.random.default_rng(20261124)
        for _ in range(35):
            a = np.r_[rng.uniform(-1, 1, 3), rng.uniform(-3, 3, 3), rng.uniform(0.1, 3, 3)]
            b = np.r_[rng.uniform(-1, 1, 3), rng.uniform(-3, 3, 3), rng.uniform(0.1, 3, 3)]
            expected = intersection_oracle(a, b)
            self.assertAlmostEqual(iou(a, b), expected, places=10)
            self.assertAlmostEqual(iou(b, a), expected, places=10)
            rotation = Rotation.from_euler("XYZ", [0.3, -0.6, 0.7])
            transformed = []
            for points in (a, b):
                transformed.append(
                    np.r_[
                        rotation.apply(points[:3]) + [4, 7, -3],
                        (rotation * Rotation.from_euler("XYZ", points[3:6])).as_euler("XYZ"),
                        points[6:],
                    ]
                )
            self.assertAlmostEqual(iou(*transformed), expected, places=10)

    def test_units_large_origins_and_identical_rotated_boxes(self):
        for scale in (1e-9, 1e-6, 1, 1e6):
            for origin in (0, 1e3 * scale):
                a, b = np.array(box(x=origin), dtype=float), np.array(
                    box(x=origin + scale), dtype=float
                )
                a[6:] *= scale
                b[6:] *= scale
                self.assertAlmostEqual(iou(a, b), 1 / 3, places=10)
        self.assertAlmostEqual(iou(box(x=1e9), box(x=1e9 + 1)), 1 / 3)
        self.assertEqual(iou(box(angles=(0.31, -0.47, 0.83)), box(angles=(0.31, -0.47, 0.83))), 1)

    def test_invalid_geometry_is_not_a_missing_object(self):
        for points in ([1, 2], box(size=-1), box(x=np.nan), box(z=np.inf)):
            with self.subTest(points=points), self.assertRaises(ValueError):
                CuboidGeometry.from_points(points)


def provider(job_id, frames):
    result = DatumaroJobDataProvider.__new__(DatumaroJobDataProvider)
    result.job_id = job_id
    result._annotation_memo = _MemoizingAnnotationConverterFactory()
    result._load_label_catalog = lambda: cdm.LabelCatalog(
        (cdm.Label(10, "car", "cuboid"), cdm.Label(20, "person", "cuboid"))
    )
    result.dm_item_id_to_frame_id = lambda item: int(item.id)
    result.job_data = type(
        "JobData",
        (list,),
        {
            "db_instance": SimpleNamespace(
                segment=SimpleNamespace(task=SimpleNamespace(dimension=DimensionType.DIM_3D))
            )
        },
    )(frames)
    items = []
    for frame, annotations in frames.items():
        native = []
        for source_id, label, points, track_id in annotations:
            attrs = {"track_id": track_id} if track_id is not None else {}
            ann = dm.Cuboid3d(
                position=points[:3],
                rotation=points[3:6],
                scale=points[6:],
                label=label,
                id=source_id,
                attributes=attrs,
            )
            source = CommonData.LabeledShape(
                type="cuboid",
                frame=frame,
                label="car",
                points=points,
                occluded=False,
                attributes=[],
                source="manual",
                id=source_id,
            )
            if track_id is not None:
                source = CommonData.TrackedShape(
                    type="cuboid",
                    frame=frame,
                    points=points,
                    occluded=False,
                    outside=False,
                    keyframe=False,
                    attributes=[],
                    track_id=track_id,
                    id=source_id,
                )
            result._annotation_memo.remember_conversion(source, [ann])
            result._annotation_memo._user_attributes[id(ann)] = {}
            native.append(ann)
        items.append(
            dm.DatasetItem(
                id=str(frame), annotations=native, media=dm.PointCloud.from_file(f"{frame}.pcd")
            )
        )
    result.dm_dataset = dm.Dataset.from_iterable(
        items, categories=["car", "person"], media_type=dm.PointCloud
    )
    return result


class TestCuboidReports(unittest.TestCase):
    def report(self, gt_frames, ds_frames, **requirement_fields):
        gt, ds = provider(1, gt_frames), provider(2, ds_frames)
        self.assertIsInstance(make_quality_backend(ds, gt), Cuboid3DBackend)
        requirement = evolve(make_requirement("cuboid", iou_threshold=0.5), **requirement_fields)
        return DatasetQualityEstimator(
            ds, gt, requirements=[requirement], report_parameters=ComparisonReportParameters()
        ).generate_report()

    def test_3d_annotation_volume_preserves_source_precision(self):
        points = box(size=(0.004, 0.006, 0.008), angles=(0.31, -0.47, 0.83))
        data_provider = provider(1, {0: [(7, 0, points, None)]})
        backend = Cuboid3DBackend(data_provider, data_provider)
        iterator = backend.iter_samples()
        self.addCleanup(iterator.close)
        annotation = next(iterator).gt_annotations[0]

        self.assertIsInstance(annotation, cdm.Annotation3D)
        self.assertNotIsInstance(annotation, cdm.Annotation2D)
        self.assertEqual(annotation.get_volume(), 0.004 * 0.006 * 0.008)
        self.assertEqual(annotation.reference.obj_id, 7)

    def test_metrics_conflicts_references_and_json_round_trip(self):
        gt = [(i + 1, 0, box(x=10 * i), None) for i in range(5)]
        ds = [(i + 11, int(i == 3), box(x=10 * i), 99 if i == 3 else None) for i in range(4)]
        ds.append((15, 0, box(x=100), None))
        report = self.report({7: gt}, {7: ds})
        group = report.groups["cuboid"]
        self.assertEqual(group.comparison_summary.score, 0.5)
        restored = ComparisonReport.from_json(report.to_json())
        self.assertEqual(json.loads(report.to_json()), json.loads(restored.to_json()))
        conflicts = [c.to_dict() for c in restored.get_conflicts()]
        self.assertEqual(
            {c["type"] for c in conflicts},
            {"missing_annotation", "extra_annotation", "mismatching_label"},
        )
        for conflict in conflicts:
            self.assertEqual(conflict["frame_id"], 7)
            for reference in conflict["annotation_ids"]:
                self.assertEqual(reference["shape_type"], "cuboid")
            if conflict["type"] == "mismatching_label":
                self.assertEqual([r["job_id"] for r in conflict["annotation_ids"]], [2, 1])
                self.assertEqual(conflict["annotation_ids"][0]["obj_id"], 99)
                self.assertEqual(conflict["annotation_ids"][0]["type"], "track")

    def test_empty_sides_no_common_frames_and_source_precision(self):
        ann = (1, 0, box(x=0.123456, size=0.004), None)
        self.assertEqual(
            self.report({3: [ann]}, {3: [ann]}).groups["cuboid"].comparison_summary.score, 1
        )
        self.assertEqual(
            self.report({3: [ann]}, {3: []}).groups["cuboid"].comparison_summary.score, 0
        )
        self.assertEqual(
            self.report({3: []}, {3: [ann]}).groups["cuboid"].comparison_summary.score, 0
        )
        self.assertIsNone(self.report({3: []}, {3: []}).groups["cuboid"].comparison_summary.score)
        self.assertEqual(self.report({3: [ann]}, {4: [ann]}).comparison_summary.frames, [])

    def test_frame_ids_do_not_depend_on_pcd_basename_or_media_contents(self):
        extractor = _Quality3DDataExtractor.__new__(_Quality3DDataExtractor)
        extractor._instance_meta = {"labels": []}
        extractor._read_cvat_anno = mock.Mock(return_value=[])
        items = [
            extractor._process_one_frame_data(
                SimpleNamespace(idx=idx, name=name, frame=10 + idx * 3, subset="default")
            )
            for idx, name in enumerate(("a/frame.pcd", "b/frame.pcd"))
        ]
        dataset = dm.Dataset.from_iterable(items, media_type=dm.PointCloud)
        self.assertEqual(
            [(item.id, item.attributes["frame"]) for item in dataset], [("0", 10), ("1", 13)]
        )

    def test_runtime_rejects_area_filters(self):
        with self.assertRaisesRegex(Exception, "shape.area"):
            self.report({0: []}, {0: []}, filter='{"var":"shape.area"}')

    def test_label_first_matching_thresholds_and_duplicates(self):
        gt = [(1, 0, box(), None), (2, 1, box(x=1), None)]
        ds = [(11, 1, box(), None), (12, 0, box(x=1), None)]
        self.assertEqual(
            self.report({0: gt}, {0: ds}, iou_threshold=0.3)
            .groups["cuboid"]
            .comparison_summary.score,
            1,
        )
        self.assertEqual(
            self.report({0: gt}, {0: ds}, iou_threshold=0.5)
            .groups["cuboid"]
            .comparison_summary.score,
            0,
        )
        gt = [(1, 0, box(), None)]
        ds = [(11, 0, box(), None), (12, 0, box(), None)]
        self.assertEqual(
            self.report({0: gt}, {0: ds}).groups["cuboid"].comparison_summary.score, 0.5
        )
        disjoint = [(11, 0, box(x=10), None)]
        self.assertEqual(
            len(self.report({0: gt}, {0: disjoint}, iou_threshold=0).get_conflicts()), 2
        )
