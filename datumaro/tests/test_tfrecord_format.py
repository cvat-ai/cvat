import numpy as np

from unittest import TestCase

from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, Bbox, LabelCategories
)
from datumaro.plugins.tf_detection_api_format.importer import TfDetectionApiImporter
from datumaro.plugins.tf_detection_api_format.extractor import TfDetectionApiExtractor
from datumaro.plugins.tf_detection_api_format.converter import TfDetectionApiConverter
from datumaro.util.test_utils import TestDir, compare_datasets


class TfrecordConverterTest(TestCase):
    def _test_save_and_load(self, source_dataset, converter, test_dir,
            target_dataset=None, importer_args=None):
        converter(source_dataset, test_dir)

        if importer_args is None:
            importer_args = {}
        parsed_dataset = TfDetectionApiImporter()(test_dir, **importer_args) \
            .make_dataset()

        if target_dataset is None:
            target_dataset = source_dataset

        compare_datasets(self, expected=target_dataset, actual=parsed_dataset)

    def test_can_save_bboxes(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train',
                        image=np.ones((16, 16, 3)),
                        annotations=[
                            Bbox(0, 4, 4, 8, label=2, id=0),
                            Bbox(0, 4, 4, 4, label=3, id=1),
                            Bbox(2, 4, 4, 4, id=2),
                        ]
                    ),

                    DatasetItem(id=2, subset='val',
                        image=np.ones((8, 8, 3)),
                        annotations=[
                            Bbox(1, 2, 4, 2, label=3, id=0),
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
            self._test_save_and_load(
                TestExtractor(), TfDetectionApiConverter(save_images=True),
                test_dir)

    def test_can_save_dataset_with_no_subsets(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1,
                        image=np.ones((16, 16, 3)),
                        annotations=[
                            Bbox(2, 1, 4, 4, label=2, id=0),
                            Bbox(4, 2, 8, 4, label=3, id=1),
                        ]
                    ),

                    DatasetItem(id=2,
                        image=np.ones((8, 8, 3)) * 2,
                        annotations=[
                            Bbox(4, 4, 4, 4, label=3, id=0),
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
            self._test_save_and_load(
                TestExtractor(), TfDetectionApiConverter(save_images=True),
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
        parsed = TfDetectionApiExtractor._parse_labelmap(text)

        self.assertEqual(expected, parsed)
