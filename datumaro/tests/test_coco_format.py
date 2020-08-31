from functools import partial
import numpy as np
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project, Dataset
from datumaro.components.extractor import (DatasetItem,
    AnnotationType, Label, Mask, Points, Polygon, Bbox, Caption,
    LabelCategories, PointsCategories
)
from datumaro.plugins.coco_format.converter import (
    CocoConverter,
    CocoImageInfoConverter,
    CocoCaptionsConverter,
    CocoInstancesConverter,
    CocoPersonKeypointsConverter,
    CocoLabelsConverter,
)
from datumaro.plugins.coco_format.importer import CocoImporter
from datumaro.util.image import Image
from datumaro.util.test_utils import TestDir, compare_datasets


DUMMY_DATASET_DIR = osp.join(osp.dirname(__file__), 'assets', 'coco_dataset')

class CocoImporterTest(TestCase):
    def test_can_import(self):
        expected_dataset = Dataset.from_iterable([
            DatasetItem(id='000000000001', image=np.ones((10, 5, 3)),
                subset='val', attributes={'id': 1},
                annotations=[
                    Polygon([0, 0, 1, 0, 1, 2, 0, 2], label=0,
                        id=1, group=1, attributes={'is_crowd': False}),
                    Mask(np.array(
                        [[1, 0, 0, 1, 0]] * 5 +
                        [[1, 1, 1, 1, 0]] * 5
                        ), label=0,
                        id=2, group=2, attributes={'is_crowd': True}),
                ]
            ),
        ], categories=['TEST',])

        dataset = Project.import_from(DUMMY_DATASET_DIR, 'coco') \
            .make_dataset()

        compare_datasets(self, expected_dataset, dataset)

    def test_can_detect(self):
        self.assertTrue(CocoImporter.detect(DUMMY_DATASET_DIR))

class CocoConverterTest(TestCase):
    def _test_save_and_load(self, source_dataset, converter, test_dir,
            target_dataset=None, importer_args=None):
        converter(source_dataset, test_dir)

        if importer_args is None:
            importer_args = {}
        parsed_dataset = CocoImporter()(test_dir, **importer_args).make_dataset()

        if target_dataset is None:
            target_dataset = source_dataset

        compare_datasets(self, expected=target_dataset, actual=parsed_dataset)

    def test_can_save_and_load_captions(self):
        expected_dataset = Dataset.from_iterable([
            DatasetItem(id=1, subset='train',
                annotations=[
                    Caption('hello', id=1, group=1),
                    Caption('world', id=2, group=2),
                ], attributes={'id': 1}),
            DatasetItem(id=2, subset='train',
                annotations=[
                    Caption('test', id=3, group=3),
                ], attributes={'id': 2}),

            DatasetItem(id=3, subset='val',
                annotations=[
                    Caption('word', id=1, group=1),
                ], attributes={'id': 1}),
            ])

        with TestDir() as test_dir:
            self._test_save_and_load(expected_dataset,
                CocoCaptionsConverter.convert, test_dir)

    def test_can_save_and_load_instances(self):
        source_dataset = Dataset.from_iterable([
            DatasetItem(id=1, subset='train', image=np.ones((4, 4, 3)),
                annotations=[
                    # Bbox + single polygon
                    Bbox(0, 1, 2, 2,
                        label=2, group=1, id=1,
                        attributes={ 'is_crowd': False }),
                    Polygon([0, 1, 2, 1, 2, 3, 0, 3],
                        attributes={ 'is_crowd': False },
                        label=2, group=1, id=1),
                ], attributes={'id': 1}),
            DatasetItem(id=2, subset='train', image=np.ones((4, 4, 3)),
                annotations=[
                    # Mask + bbox
                    Mask(np.array([
                            [0, 1, 0, 0],
                            [0, 1, 0, 0],
                            [0, 1, 1, 1],
                            [0, 0, 0, 0]],
                        ),
                        attributes={ 'is_crowd': True },
                        label=4, group=3, id=3),
                    Bbox(1, 0, 2, 2, label=4, group=3, id=3,
                        attributes={ 'is_crowd': True }),
                ], attributes={'id': 2}),

            DatasetItem(id=3, subset='val', image=np.ones((4, 4, 3)),
                annotations=[
                    # Bbox + mask
                    Bbox(0, 1, 2, 2, label=4, group=3, id=3,
                        attributes={ 'is_crowd': True }),
                    Mask(np.array([
                            [0, 0, 0, 0],
                            [1, 1, 1, 0],
                            [1, 1, 0, 0],
                            [0, 0, 0, 0]],
                        ),
                        attributes={ 'is_crowd': True },
                        label=4, group=3, id=3),
                ], attributes={'id': 1}),
            ], categories=[str(i) for i in range(10)])

        target_dataset = Dataset.from_iterable([
            DatasetItem(id=1, subset='train', image=np.ones((4, 4, 3)),
                annotations=[
                    Polygon([0, 1, 2, 1, 2, 3, 0, 3],
                        attributes={ 'is_crowd': False },
                        label=2, group=1, id=1),
                ], attributes={'id': 1}),
            DatasetItem(id=2, subset='train', image=np.ones((4, 4, 3)),
                annotations=[
                    Mask(np.array([
                            [0, 1, 0, 0],
                            [0, 1, 0, 0],
                            [0, 1, 1, 1],
                            [0, 0, 0, 0]],
                        ),
                        attributes={ 'is_crowd': True },
                        label=4, group=3, id=3),
                ], attributes={'id': 2}),

            DatasetItem(id=3, subset='val', image=np.ones((4, 4, 3)),
                annotations=[
                    Mask(np.array([
                            [0, 0, 0, 0],
                            [1, 1, 1, 0],
                            [1, 1, 0, 0],
                            [0, 0, 0, 0]],
                        ),
                        attributes={ 'is_crowd': True },
                        label=4, group=3, id=3),
                ], attributes={'id': 1})
            ], categories=[str(i) for i in range(10)])

        with TestDir() as test_dir:
            self._test_save_and_load(source_dataset,
                CocoInstancesConverter.convert, test_dir,
                target_dataset=target_dataset)

    def test_can_merge_polygons_on_loading(self):
        source_dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=np.zeros((6, 10, 3)),
                annotations=[
                    Polygon([0, 0, 4, 0, 4, 4],
                        label=3, id=4, group=4),
                    Polygon([5, 0, 9, 0, 5, 5],
                        label=3, id=4, group=4),
                ]
            ),
        ], categories=[str(i) for i in range(10)])

        target_dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=np.zeros((6, 10, 3)),
                annotations=[
                    Mask(np.array([
                        [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
                        [0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
                        [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
                        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                        # only internal fragment (without the border),
                        # but not everywhere...
                    ),
                    label=3, id=4, group=4,
                    attributes={ 'is_crowd': False }),
                ], attributes={'id': 1}
            ),
        ], categories=[str(i) for i in range(10)])

        with TestDir() as test_dir:
            self._test_save_and_load(source_dataset,
                CocoInstancesConverter.convert, test_dir,
                importer_args={'merge_instance_polygons': True},
                target_dataset=target_dataset)

    def test_can_crop_covered_segments(self):
        source_dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=np.zeros((5, 5, 3)),
                annotations=[
                    Mask(np.array([
                            [0, 0, 1, 1, 1],
                            [0, 0, 1, 1, 1],
                            [1, 1, 0, 1, 1],
                            [1, 1, 1, 0, 0],
                            [1, 1, 1, 0, 0]],
                        ),
                        label=2, id=1, z_order=0),
                    Polygon([1, 1, 4, 1, 4, 4, 1, 4],
                        label=1, id=2, z_order=1),
                ]
            ),
        ], categories=[str(i) for i in range(10)])

        target_dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=np.zeros((5, 5, 3)),
                annotations=[
                    Mask(np.array([
                            [0, 0, 1, 1, 1],
                            [0, 0, 0, 0, 1],
                            [1, 0, 0, 0, 1],
                            [1, 0, 0, 0, 0],
                            [1, 1, 1, 0, 0]],
                        ),
                        attributes={ 'is_crowd': True },
                        label=2, id=1, group=1),

                    Polygon([1, 1, 4, 1, 4, 4, 1, 4],
                        label=1, id=2, group=2,
                        attributes={ 'is_crowd': False }),
                ], attributes={'id': 1}
            ),
        ], categories=[str(i) for i in range(10)])

        with TestDir() as test_dir:
            self._test_save_and_load(source_dataset,
                 partial(CocoInstancesConverter.convert, crop_covered=True),
                 test_dir, target_dataset=target_dataset)

    def test_can_convert_polygons_to_mask(self):
        source_dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=np.zeros((6, 10, 3)),
                annotations=[
                    Polygon([0, 0, 4, 0, 4, 4],
                        label=3, id=4, group=4),
                    Polygon([5, 0, 9, 0, 5, 5],
                        label=3, id=4, group=4),
                ]
            ),
        ], categories=[str(i) for i in range(10)])

        target_dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=np.zeros((6, 10, 3)),
                annotations=[
                    Mask(np.array([
                            [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
                            [0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
                            [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
                            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                            # only internal fragment (without the border),
                            # but not everywhere...
                        ),
                        attributes={ 'is_crowd': True },
                        label=3, id=4, group=4),
                ], attributes={'id': 1}
            ),
        ], categories=[str(i) for i in range(10)])

        with TestDir() as test_dir:
            self._test_save_and_load(source_dataset,
                partial(CocoInstancesConverter.convert, segmentation_mode='mask'),
                test_dir, target_dataset=target_dataset)

    def test_can_convert_masks_to_polygons(self):
        source_dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=np.zeros((5, 10, 3)),
                annotations=[
                    Mask(np.array([
                            [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
                            [0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
                            [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
                            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        ]),
                        label=3, id=4, group=4),
                ]
            ),
        ], categories=[str(i) for i in range(10)])

        target_dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=np.zeros((5, 10, 3)),
                annotations=[
                    Polygon(
                        [3.0, 2.5, 1.0, 0.0, 3.5, 0.0, 3.0, 2.5],
                        label=3, id=4, group=4,
                        attributes={ 'is_crowd': False }),
                    Polygon(
                        [5.0, 3.5, 4.5, 0.0, 8.0, 0.0, 5.0, 3.5],
                        label=3, id=4, group=4,
                        attributes={ 'is_crowd': False }),
                ], attributes={'id': 1}
            ),
        ], categories=[str(i) for i in range(10)])

        with TestDir() as test_dir:
            self._test_save_and_load(source_dataset,
                partial(CocoInstancesConverter.convert, segmentation_mode='polygons'),
                test_dir,
                target_dataset=target_dataset)

    def test_can_save_and_load_images(self):
        expected_dataset = Dataset.from_iterable([
            DatasetItem(id=1, subset='train', attributes={'id': 1}),
            DatasetItem(id=2, subset='train', attributes={'id': 2}),

            DatasetItem(id=2, subset='val', attributes={'id': 2}),
            DatasetItem(id=3, subset='val', attributes={'id': 3}),
            DatasetItem(id=4, subset='val', attributes={'id': 4}),

            DatasetItem(id=5, subset='test', attributes={'id': 1}),
        ])

        with TestDir() as test_dir:
            self._test_save_and_load(expected_dataset,
                CocoImageInfoConverter.convert, test_dir)

    def test_can_save_and_load_labels(self):
        expected_dataset = Dataset.from_iterable([
            DatasetItem(id=1, subset='train',
                annotations=[
                    Label(4, id=1, group=1),
                    Label(9, id=2, group=2),
                ], attributes={'id': 1}),
        ], categories=[str(i) for i in range(10)])

        with TestDir() as test_dir:
            self._test_save_and_load(expected_dataset,
                CocoLabelsConverter.convert, test_dir)

    def test_can_save_and_load_keypoints(self):
        source_dataset = Dataset.from_iterable([
            DatasetItem(id=1, subset='train', image=np.zeros((5, 5, 3)),
                annotations=[
                    # Full instance annotations: polygon + keypoints
                    Points([0, 0, 0, 2, 4, 1], [0, 1, 2],
                        label=3, group=1, id=1),
                    Polygon([0, 0, 4, 0, 4, 4],
                        label=3, group=1, id=1),

                    # Full instance annotations: bbox + keypoints
                    Points([1, 2, 3, 4, 2, 3], group=2, id=2),
                    Bbox(1, 2, 2, 2, group=2, id=2),

                    # Solitary keypoints
                    Points([1, 2, 0, 2, 4, 1], label=5, id=3),

                    # Some other solitary annotations (bug #1387)
                    Polygon([0, 0, 4, 0, 4, 4], label=3, id=4),

                    # Solitary keypoints with no label
                    Points([0, 0, 1, 2, 3, 4], [0, 1, 2], id=5),
                ]),
            ], categories={
                AnnotationType.label: LabelCategories.from_iterable(
                    str(i) for i in range(10)),
                AnnotationType.points: PointsCategories.from_iterable(
                    (i, None, [[0, 1], [1, 2]]) for i in range(10)
                ),
            })

        target_dataset = Dataset.from_iterable([
            DatasetItem(id=1, subset='train', image=np.zeros((5, 5, 3)),
                annotations=[
                    Points([0, 0, 0, 2, 4, 1], [0, 1, 2],
                        label=3, group=1, id=1,
                        attributes={'is_crowd': False}),
                    Polygon([0, 0, 4, 0, 4, 4],
                        label=3, group=1, id=1,
                        attributes={'is_crowd': False}),

                    Points([1, 2, 3, 4, 2, 3],
                        group=2, id=2,
                        attributes={'is_crowd': False}),
                    Bbox(1, 2, 2, 2,
                        group=2, id=2,
                        attributes={'is_crowd': False}),

                    Points([1, 2, 0, 2, 4, 1],
                        label=5, group=3, id=3,
                        attributes={'is_crowd': False}),
                    Bbox(0, 1, 4, 1,
                        label=5, group=3, id=3,
                        attributes={'is_crowd': False}),

                    Points([0, 0, 1, 2, 3, 4], [0, 1, 2],
                        group=5, id=5,
                        attributes={'is_crowd': False}),
                    Bbox(1, 2, 2, 2,
                        group=5, id=5,
                        attributes={'is_crowd': False}),
                ], attributes={'id': 1}),
            ], categories={
                AnnotationType.label: LabelCategories.from_iterable(
                    str(i) for i in range(10)),
                AnnotationType.points: PointsCategories.from_iterable(
                    (i, None, [[0, 1], [1, 2]]) for i in range(10)
                ),
            })

        with TestDir() as test_dir:
            self._test_save_and_load(source_dataset,
                CocoPersonKeypointsConverter.convert, test_dir,
                target_dataset=target_dataset)

    def test_can_save_dataset_with_no_subsets(self):
        test_dataset = Dataset.from_iterable([
            DatasetItem(id=1, attributes={'id': 1}),
            DatasetItem(id=2, attributes={'id': 2}),
        ])

        with TestDir() as test_dir:
            self._test_save_and_load(test_dataset,
                CocoConverter.convert, test_dir)

    def test_can_save_dataset_with_image_info(self):
        expected_dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=Image(path='1.jpg', size=(10, 15)),
                attributes={'id': 1}),
        ])

        with TestDir() as test_dir:
            self._test_save_and_load(expected_dataset,
                CocoImageInfoConverter.convert, test_dir)

    def test_relative_paths(self):
        expected_dataset = Dataset.from_iterable([
            DatasetItem(id='1', image=np.ones((4, 2, 3)),
                attributes={'id': 1}),
            DatasetItem(id='subdir1/1', image=np.ones((2, 6, 3)),
                attributes={'id': 2}),
            DatasetItem(id='subdir2/1', image=np.ones((5, 4, 3)),
                attributes={'id': 3}),
        ])

        with TestDir() as test_dir:
            self._test_save_and_load(expected_dataset,
                partial(CocoImageInfoConverter.convert, save_images=True), test_dir)

    def test_preserve_coco_ids(self):
        expected_dataset = Dataset.from_iterable([
            DatasetItem(id='some/name1', image=np.ones((4, 2, 3)),
                attributes={'id': 40}),
        ])

        with TestDir() as test_dir:
            self._test_save_and_load(expected_dataset,
                partial(CocoImageInfoConverter.convert, save_images=True), test_dir)

    def test_annotation_attributes(self):
        expected_dataset = Dataset.from_iterable([
            DatasetItem(id=1, image=np.ones((4, 2, 3)), annotations=[
                Polygon([0, 0, 4, 0, 4, 4], label=5, group=1, id=1,
                    attributes={'is_crowd': False, 'x': 5, 'y': 'abc'}),
            ], attributes={'id': 1})
        ], categories=[str(i) for i in range(10)])

        with TestDir() as test_dir:
            self._test_save_and_load(expected_dataset,
                CocoConverter.convert, test_dir)
