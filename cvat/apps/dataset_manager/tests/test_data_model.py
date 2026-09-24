# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import subprocess
import sys
import unittest
from unittest import mock

import datumaro as dm
import numpy as np

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.dataset_manager.data_model.adapters.datumaro import (
    DatumaroDatasetAdapter,
    adapt_annotation,
    to_datumaro_annotation_type,
)


class TestAnnotationHierarchy(unittest.TestCase):
    def test_abstract_annotations_require_an_implementation(self):
        for annotation_class in (cdm.Annotation, cdm.Interval, cdm.Dataset, cdm.Sample):
            with self.subTest(annotation_class=annotation_class):
                self.assertRaises(TypeError, annotation_class)

    def test_interval_subclass_inherits_type_and_preserves_open_end(self):
        class TestInterval(cdm.Interval):
            id = 1
            label = 0
            attributes = {}
            reference = cdm.AnnotationReference(1, 2, cdm.AnnotationReferenceType.INTERVAL)
            source = None
            group = 0
            score = 1.0
            start = 100
            stop = None

        interval = TestInterval()
        self.assertIsInstance(interval, cdm.Annotation)
        self.assertEqual(interval.annotation_type, "interval")
        self.assertEqual(interval.start, 100)
        self.assertIsNone(interval.stop)

    def test_model_and_adapter_can_be_imported_without_quality_control(self):
        subprocess.run(
            [
                sys.executable,
                "-B",
                "-c",
                (
                    "import sys; from cvat.apps.dataset_manager import data_model as cdm; "
                    "assert 'datumaro' not in sys.modules; assert 'django' not in sys.modules; "
                    "from cvat.apps.dataset_manager.data_model.adapters.datumaro "
                    "import DatumaroAnnotationAdapter; "
                    "assert issubclass(DatumaroAnnotationAdapter, cdm.Annotation); "
                    "assert 'django' not in sys.modules; "
                    "assert 'cvat.apps.quality_control' not in sys.modules"
                ),
            ],
            check=True,
        )


class TestDatumaroAnnotationAdapter(unittest.TestCase):
    def test_2d_adapters_preserve_native_area(self):
        annotations = (
            (dm.Bbox(1, 2, 10, 20), cdm.Rectangle),
            (dm.Polygon([0, 0, 10, 0, 10, 20, 0, 20]), cdm.Polygon),
            (dm.PolyLine([0, 0, 10, 20]), cdm.Polyline),
            (dm.Points([0, 0, 10, 20]), cdm.Points),
            (dm.Ellipse(0, 0, 10, 20), cdm.Ellipse),
            (dm.Mask(np.ones((2, 3), dtype=bool)), cdm.Mask),
            (dm.Skeleton([dm.Points([0, 0]), dm.Points([10, 20])]), cdm.Skeleton),
        )
        for native, annotation_type in annotations:
            with self.subTest(annotation_type=annotation_type):
                annotation = adapt_annotation(native, reference_getter=mock.Mock())
                self.assertIsInstance(annotation, annotation_type)
                self.assertIsInstance(annotation, cdm.Annotation2D)
                self.assertEqual(annotation.get_area(), native.get_area())
                self.assertIs(to_datumaro_annotation_type(annotation_type), native.type)

    def test_tags_and_cuboids_do_not_expose_2d_area(self):
        for native, annotation_type in (
            (dm.Label(label=0), cdm.Tag),
            (dm.Cuboid3d(position=[0, 0, 0]), cdm.Cuboid),
        ):
            with self.subTest(annotation_type=annotation_type):
                annotation = adapt_annotation(native, reference_getter=mock.Mock())
                self.assertIsInstance(annotation, annotation_type)
                self.assertNotIsInstance(annotation, cdm.Annotation2D)

    def test_native_geometry_and_lazy_source_reference_are_preserved(self):
        native = dm.Bbox(
            1, 2, 10, 20, label=0, id=7, group=3, attributes={"source": "manual", "text": "hello"}
        )
        reference = cdm.AnnotationReference(42, 5, cdm.AnnotationReferenceType.SHAPE, "rectangle")
        reference_getter = mock.Mock(return_value=reference)
        annotation = adapt_annotation(native, reference_getter=reference_getter)

        self.assertIsInstance(annotation, cdm.Annotation)
        self.assertIs(annotation.native_annotation, native)
        self.assertIsInstance(annotation, cdm.Rectangle)
        self.assertEqual(annotation.annotation_type, "rectangle")
        self.assertEqual(annotation.id, 7)
        self.assertEqual(annotation.label, 0)
        self.assertEqual(annotation.group, 3)
        self.assertEqual(annotation.source, "manual")
        self.assertEqual(annotation.score, 1.0)
        reference_getter.assert_not_called()

        self.assertIs(annotation.reference, reference)
        self.assertIs(annotation.reference, reference)
        reference_getter.assert_called_once_with(native)
        with self.assertRaises(TypeError):
            annotation.attributes["text"] = "changed"
        self.assertEqual(native.attributes["text"], "hello")

    def test_types_outside_quality_targets_are_supported(self):
        self.assertIs(to_datumaro_annotation_type(cdm.Cuboid), dm.AnnotationType.cuboid_3d)
        with self.assertRaisesRegex(ValueError, "No Datumaro representation"):
            to_datumaro_annotation_type(cdm.Interval)


class TestDatumaroDatasetAdapter(unittest.TestCase):
    def test_items_preserve_subsets_frames_native_data_and_category_order(self):
        labels = (
            cdm.Label(30, "head", "points", parent="person"),
            cdm.Label(10, "unused", "any"),
            cdm.Label(20, "person", "skeleton"),
        )
        categories = dm.LabelCategories()
        for label in (labels[2], labels[0], labels[1]):
            categories.add(label.name, parent=label.parent)
        native = dm.Dataset.from_iterable(
            [
                dm.DatasetItem(
                    "same-id", subset="train", annotations=[dm.Points([1, 2], label=1, id=7)]
                ),
                dm.DatasetItem("same-id", subset="validation", annotations=[]),
            ],
            categories={dm.AnnotationType.label: categories},
        )
        reference = cdm.AnnotationReference(70, 2, cdm.AnnotationReferenceType.SHAPE, "points")
        dataset = DatumaroDatasetAdapter(
            native,
            label_catalog=cdm.LabelCatalog(labels),
            reference_getter=lambda ann: reference,
            frame_id_getter=lambda item: 100 if item.subset == "train" else 200,
        )

        self.assertIsInstance(dataset, cdm.Dataset)
        self.assertIs(dataset.native_dataset, native)
        self.assertEqual(len(dataset), 2)
        self.assertEqual(dataset.label_catalog.labels, (labels[2], labels[0], labels[1]))
        items = list(dataset)
        self.assertEqual(
            [(item.id, item.subset) for item in items],
            [("same-id", "train"), ("same-id", "validation")],
        )
        item = dataset.get("same-id", subset="train")
        self.assertIsInstance(item, cdm.Sample)
        self.assertIs(item.native_item, native.get("same-id", subset="train"))
        self.assertEqual(item.frame_id, 100)
        self.assertIs(item.annotations, item.annotations)
        self.assertEqual(dataset.label_catalog.labels[item.annotations[0].label], labels[0])
        self.assertIs(item.annotations[0].reference, reference)
        self.assertEqual(dataset.get("same-id", subset="validation").frame_id, 200)
        self.assertEqual(dataset.get("same-id", subset="validation").annotations, ())
        self.assertIsNone(dataset.get("same-id", subset="missing"))

    def test_empty_annotations_do_not_remove_an_item_or_invent_a_frame(self):
        dataset = DatumaroDatasetAdapter(
            dm.Dataset.from_iterable([dm.DatasetItem("recording")], categories=[]),
            label_catalog=cdm.LabelCatalog(()),
            reference_getter=mock.Mock(side_effect=AssertionError),
        )
        self.assertEqual(len(dataset), 1)
        self.assertEqual(dataset.label_catalog.labels, ())
        item = next(iter(dataset))
        self.assertEqual(item.annotations, ())
        self.assertIsNone(item.frame_id)
