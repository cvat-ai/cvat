import numpy as np

from unittest import TestCase

from datumaro.components.project import Project
from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, BboxObject, LabelCategories
)
from datumaro.components.extractors.tfrecord import DetectionApiExtractor
from datumaro.components.converters.tfrecord import DetectionApiConverter
from datumaro.util import find
from datumaro.util.test_utils import TestDir


class TfrecordConverterTest(TestCase):
    def _test_can_save_and_load(self, source_dataset, converter, test_dir,
            importer_params=None):
        converter(source_dataset, test_dir.path)

        if not importer_params:
            importer_params = {}
        project = Project.import_from(test_dir.path, 'tf_detection_api',
            **importer_params)
        parsed_dataset = project.make_dataset()

        self.assertListEqual(
            sorted(source_dataset.subsets()),
            sorted(parsed_dataset.subsets()),
        )

        self.assertEqual(len(source_dataset), len(parsed_dataset))

        for item_a in source_dataset:
            item_b = find(parsed_dataset, lambda x: x.id == item_a.id)
            self.assertFalse(item_b is None)
            self.assertEqual(len(item_a.annotations), len(item_b.annotations))
            for ann_a in item_a.annotations:
                ann_b = find(item_b.annotations, lambda x: \
                    x.id == ann_a.id and \
                    x.type == ann_a.type and x.group == ann_a.group)
                self.assertEqual(ann_a, ann_b, 'id: ' + str(ann_a.id))

    def test_can_save_bboxes(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train',
                        image=np.ones((16, 16, 3)),
                        annotations=[
                            BboxObject(0, 4, 4, 8, label=2, id=0),
                            BboxObject(0, 4, 4, 4, label=3, id=1),
                            BboxObject(2, 4, 4, 4, id=2),
                        ]
                    ),

                    DatasetItem(id=2, subset='val',
                        image=np.ones((8, 8, 3)),
                        annotations=[
                            BboxObject(1, 2, 4, 2, label=3, id=0),
                        ]
                    ),

                    DatasetItem(id=3, subset='test',
                        image=np.ones((5, 4, 3)) * 3,
                    ),
                ])

            def categories(self):
                label_cat = LabelCategories()
                for label in range(10):
                    label_cat.add('label_' + str(label))
                return {
                    AnnotationType.label: label_cat,
                }

        with TestDir() as test_dir:
            self._test_can_save_and_load(
                TestExtractor(), DetectionApiConverter(save_images=True),
                test_dir)

    def test_can_save_dataset_with_no_subsets(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1,
                        image=np.ones((16, 16, 3)),
                        annotations=[
                            BboxObject(2, 1, 4, 4, label=2, id=0),
                            BboxObject(4, 2, 8, 4, label=3, id=1),
                        ]
                    ),

                    DatasetItem(id=2,
                        image=np.ones((8, 8, 3)) * 2,
                        annotations=[
                            BboxObject(4, 4, 4, 4, label=3, id=0),
                        ]
                    ),

                    DatasetItem(id=3,
                        image=np.ones((8, 4, 3)) * 3,
                    ),
                ])

            def categories(self):
                label_cat = LabelCategories()
                for label in range(10):
                    label_cat.add('label_' + str(label))
                return {
                    AnnotationType.label: label_cat,
                }

        with TestDir() as test_dir:
            self._test_can_save_and_load(
                TestExtractor(), DetectionApiConverter(save_images=True),
                test_dir)

    def test_labelmap_parsing(self):
        text = """
            {
                id: 4
                name: 'qw1'
            }
            {
                id: 5 name: 'qw2'
            }

            {
                name: 'qw3'
                id: 6
            }
            {name:'qw4' id:7}
        """
        expected = {
            'qw1': 4,
            'qw2': 5,
            'qw3': 6,
            'qw4': 7,
        }
        parsed = DetectionApiExtractor._parse_labelmap(text)

        self.assertEqual(expected, parsed)
