import numpy as np

from unittest import TestCase

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
from datumaro.util.test_utils import TestDir, item_to_str


class DatumaroConverterTest(TestCase):
    class TestExtractor(Extractor):
        def __iter__(self):
            return iter([
                DatasetItem(id=100, subset='train', image=np.ones((10, 6, 3)),
                    annotations=[
                        Caption('hello', id=1),
                        Caption('world', id=2, group=5),
                        Label(2, id=3, attributes={
                            'x': 1,
                            'y': '2',
                        }),
                        Bbox(1, 2, 3, 4, label=4, id=4, attributes={
                            'score': 1.0,
                        }),
                        Bbox(5, 6, 7, 8, id=5, group=5),
                        Points([1, 2, 2, 0, 1, 1], label=0, id=5),
                        Mask(label=3, id=5, image=np.ones((2, 3))),
                    ]),
                DatasetItem(id=21, subset='train',
                    annotations=[
                        Caption('test'),
                        Label(2),
                        Bbox(1, 2, 3, 4, 5, id=42, group=42)
                    ]),

                DatasetItem(id=2, subset='val',
                    annotations=[
                        PolyLine([1, 2, 3, 4, 5, 6, 7, 8], id=11),
                        Polygon([1, 2, 3, 4, 5, 6, 7, 8], id=12),
                    ]),

                DatasetItem(id=42, subset='test'),

                DatasetItem(id=42),
                DatasetItem(id=43, image=Image(path='1/b/c.qq', size=(2, 4))),
            ])

        def categories(self):
            label_categories = LabelCategories()
            for i in range(5):
                label_categories.add('cat' + str(i))

            mask_categories = MaskCategories(
                generate_colormap(len(label_categories.items)))

            points_categories = PointsCategories()
            for index, _ in enumerate(label_categories.items):
                points_categories.add(index, ['cat1', 'cat2'], adjacent=[0, 1])

            return {
                AnnotationType.label: label_categories,
                AnnotationType.mask: mask_categories,
                AnnotationType.points: points_categories,
            }

    def test_can_save_and_load(self):
        with TestDir() as test_dir:
            source_dataset = self.TestExtractor()

            converter = DatumaroConverter(save_images=True)
            converter(source_dataset, test_dir)

            project = Project.import_from(test_dir, 'datumaro')
            parsed_dataset = project.make_dataset()

            self.assertListEqual(
                sorted(source_dataset.subsets()),
                sorted(parsed_dataset.subsets()),
            )

            self.assertEqual(len(source_dataset), len(parsed_dataset))

            for subset_name in source_dataset.subsets():
                source_subset = source_dataset.get_subset(subset_name)
                parsed_subset = parsed_dataset.get_subset(subset_name)
                self.assertEqual(len(source_subset), len(parsed_subset))
                for idx, (item_a, item_b) in enumerate(
                        zip(source_subset, parsed_subset)):
                    self.assertEqual(item_a, item_b, '%s:\n%s\nvs.\n%s\n' % \
                        (idx, item_to_str(item_a), item_to_str(item_b)))

            self.assertEqual(
                source_dataset.categories(),
                parsed_dataset.categories())

    def test_can_detect(self):
        with TestDir() as test_dir:
            DatumaroConverter()(self.TestExtractor(), save_dir=test_dir)

            self.assertTrue(DatumaroImporter.detect(test_dir))