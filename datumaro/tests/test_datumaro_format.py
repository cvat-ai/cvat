from functools import partial
import numpy as np

from unittest import TestCase
from datumaro.components.project import Dataset
from datumaro.components.project import Project
from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, Label, Mask, Points, Polygon,
    PolyLine, Bbox, Caption,
    LabelCategories, MaskCategories, PointsCategories
)
from datumaro.plugins.datumaro_format.importer import DatumaroImporter
from datumaro.plugins.datumaro_format.converter import DatumaroConverter
from datumaro.util.mask_tools import generate_colormap
from datumaro.util.image import Image
from datumaro.util.test_utils import TestDir, compare_datasets_strict


class DatumaroConverterTest(TestCase):
    def _test_save_and_load(self, source_dataset, converter, test_dir,
            target_dataset=None, importer_args=None):
        converter(source_dataset, test_dir)

        if importer_args is None:
            importer_args = {}
        parsed_dataset = Project.import_from(
            test_dir, 'datumaro', **importer_args).make_dataset()

        if target_dataset is None:
            target_dataset = source_dataset

        compare_datasets_strict(self,
            expected=target_dataset, actual=parsed_dataset)

    @property
    def test_dataset(self):
        label_categories = LabelCategories()
        for i in range(5):
            label_categories.add('cat' + str(i))

        mask_categories = MaskCategories(
            generate_colormap(len(label_categories.items)))

        points_categories = PointsCategories()
        for index, _ in enumerate(label_categories.items):
            points_categories.add(index, ['cat1', 'cat2'], joints=[[0, 1]])

        return Dataset.from_iterable([
            DatasetItem(id=100, subset='train', image=np.ones((10, 6, 3)),
                annotations=[
                    Caption('hello', id=1),
                    Caption('world', id=2, group=5),
                    Label(2, id=3, attributes={
                        'x': 1,
                        'y': '2',
                    }),
                    Bbox(1, 2, 3, 4, label=4, id=4, z_order=1, attributes={
                        'score': 1.0,
                    }),
                    Bbox(5, 6, 7, 8, id=5, group=5),
                    Points([1, 2, 2, 0, 1, 1], label=0, id=5, z_order=4),
                    Mask(label=3, id=5, z_order=2, image=np.ones((2, 3))),
                ]),
            DatasetItem(id=21, subset='train',
                annotations=[
                    Caption('test'),
                    Label(2),
                    Bbox(1, 2, 3, 4, label=5, id=42, group=42)
                ]),

            DatasetItem(id=2, subset='val',
                annotations=[
                    PolyLine([1, 2, 3, 4, 5, 6, 7, 8], id=11, z_order=1),
                    Polygon([1, 2, 3, 4, 5, 6, 7, 8], id=12, z_order=4),
                ]),

            DatasetItem(id=42, subset='test',
                attributes={'a1': 5, 'a2': '42'}),

            DatasetItem(id=42),
            DatasetItem(id=43, image=Image(path='1/b/c.qq', size=(2, 4))),
        ], categories={
            AnnotationType.label: label_categories,
            AnnotationType.mask: mask_categories,
            AnnotationType.points: points_categories,
        })

    def test_can_save_and_load(self):
        with TestDir() as test_dir:
            self._test_save_and_load(self.test_dataset,
                partial(DatumaroConverter.convert, save_images=True), test_dir)

    def test_can_detect(self):
        with TestDir() as test_dir:
            DatumaroConverter.convert(self.test_dataset, save_dir=test_dir)

            self.assertTrue(DatumaroImporter.detect(test_dir))

    def test_relative_paths(self):
        test_dataset = Dataset.from_iterable([
            DatasetItem(id='1', image=np.ones((4, 2, 3))),
            DatasetItem(id='subdir1/1', image=np.ones((2, 6, 3))),
            DatasetItem(id='subdir2/1', image=np.ones((5, 4, 3))),
        ])

        with TestDir() as test_dir:
            self._test_save_and_load(test_dataset,
                partial(DatumaroConverter.convert, save_images=True), test_dir)
