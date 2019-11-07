import json
from itertools import zip_longest
import numpy as np
import os
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project
from datumaro.components.extractor import *
from datumaro.components.converters.datumaro import *
from datumaro.util.test_utils import *
from datumaro.util import find
from datumaro.util.mask_tools import generate_colormap


class DatumaroConverterTest(TestCase):
    class TestExtractor(Extractor):
        def __iter__(self):
            items = [
                DatasetItem(id=100, subset='train',
                    annotations=[
                        CaptionObject('hello', id=1),
                        CaptionObject('world', id=2, group=5),
                        LabelObject(2, id=3, attributes={
                            'x': 1,
                            'y': '2',
                        }),
                        BboxObject(1, 2, 3, 4, label=4, id=4, attributes={
                            'score': 10.0,
                        }),
                        BboxObject(5, 6, 7, 8, id=5, group=5),
                        PointsObject([1, 2, 2, 0, 1, 1], label=0, id=5),
                        MaskObject(label=3, id=5, image=np.ones((2, 3))),
                    ]),
                DatasetItem(id=21, subset='train',
                    annotations=[
                        CaptionObject('test'),
                        LabelObject(2),
                        BboxObject(1, 2, 3, 4, 5, id=42, group=42)
                    ]),

                DatasetItem(id=42, subset='test'),
            ]
            return iter(items)

        def subsets(self):
            return ['train', 'test']

        def categories(self):
            label_categories = LabelCategories()
            for i in range(5):
                label_categories.add('cat' + str(i))

            mask_categories = MaskCategories(
                generate_colormap(len(label_categories.items)))

            points_categories = PointsCategories()
            for index, label in enumerate(label_categories.items):
                points_categories.add(index, ['cat1', 'cat2'], adjacent=[0, 1])

            return {
                AnnotationType.label: label_categories,
                AnnotationType.mask: mask_categories,
                AnnotationType.points: points_categories,
            }

    def test_can_save_and_load(self):
        with TestDir() as test_dir:
            source_dataset = self.TestExtractor()

            converter = DatumaroConverter(
                save_images=True, apply_colormap=True)
            converter(source_dataset, test_dir.path)

            project = Project.import_from(test_dir.path, 'datumaro')
            parsed_dataset = project.make_dataset()

            self.assertListEqual(
                sorted(source_dataset.subsets()),
                sorted(parsed_dataset.subsets()),
            )

            self.assertEqual(len(source_dataset), len(parsed_dataset))

            for subset_name in source_dataset.subsets():
                source_subset = source_dataset.get_subset(subset_name)
                parsed_subset = parsed_dataset.get_subset(subset_name)
                for idx, (item_a, item_b) in enumerate(
                        zip_longest(source_subset, parsed_subset)):
                    self.assertEqual(item_a, item_b, str(idx))

            self.assertEqual(
                source_dataset.categories(),
                parsed_dataset.categories())