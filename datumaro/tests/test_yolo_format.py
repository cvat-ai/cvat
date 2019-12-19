import numpy as np

from unittest import TestCase

from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, BboxObject, LabelCategories,
)
from datumaro.components.importers.yolo import YoloImporter
from datumaro.components.converters.yolo import YoloConverter
from datumaro.util.test_utils import TestDir


class YoloFormatTest(TestCase):
    def test_can_save_and_load(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train', image=np.ones((8, 8, 3)),
                        annotations=[
                            BboxObject(0, 2, 4, 2, label=2),
                            BboxObject(0, 1, 2, 3, label=4),
                        ]),
                    DatasetItem(id=2, subset='train', image=np.ones((10, 10, 3)),
                        annotations=[
                            BboxObject(0, 2, 4, 2, label=2),
                            BboxObject(3, 3, 2, 3, label=4),
                            BboxObject(2, 1, 2, 3, label=4),
                        ]),

                    DatasetItem(id=3, subset='valid', image=np.ones((8, 8, 3)),
                        annotations=[
                            BboxObject(0, 1, 5, 2, label=2),
                            BboxObject(0, 2, 3, 2, label=5),
                            BboxObject(0, 2, 4, 2, label=6),
                            BboxObject(0, 7, 3, 2, label=7),
                        ]),
                ])

            def categories(self):
                label_categories = LabelCategories()
                for i in range(10):
                    label_categories.add('label_' + str(i))
                return {
                    AnnotationType.label: label_categories,
                }

        with TestDir() as test_dir:
            source_dataset = TestExtractor()

            YoloConverter(save_images=True)(source_dataset, test_dir.path)
            parsed_dataset = YoloImporter()(test_dir.path).make_dataset()

            self.assertListEqual(
                sorted(source_dataset.subsets()),
                sorted(parsed_dataset.subsets()),
            )
            self.assertEqual(len(source_dataset), len(parsed_dataset))
            for subset_name in source_dataset.subsets():
                source_subset = source_dataset.get_subset(subset_name)
                parsed_subset = parsed_dataset.get_subset(subset_name)
                for item_a, item_b in zip(source_subset, parsed_subset):
                    self.assertEqual(len(item_a.annotations), len(item_b.annotations))
                    for ann_a, ann_b in zip(item_a.annotations, item_b.annotations):
                        self.assertEqual(ann_a.type, ann_b.type)
                        self.assertAlmostEqual(ann_a.x, ann_b.x)
                        self.assertAlmostEqual(ann_a.y, ann_b.y)
                        self.assertAlmostEqual(ann_a.w, ann_b.w)
                        self.assertAlmostEqual(ann_a.h, ann_b.h)