from functools import partial
import numpy as np
import os.path as osp

from unittest import TestCase, skipIf
from datumaro.components.project import Dataset
from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, Bbox, Mask, LabelCategories
)
from datumaro.components.project import Project
from datumaro.util.image import Image
from datumaro.util.test_utils import TestDir, compare_datasets
from datumaro.util.tf_util import check_import

try:
    from datumaro.plugins.tf_detection_api_format.importer import TfDetectionApiImporter
    from datumaro.plugins.tf_detection_api_format.extractor import TfDetectionApiExtractor
    from datumaro.plugins.tf_detection_api_format.converter import TfDetectionApiConverter
    import_failed = False
except ImportError:
    import_failed = True

    import importlib
    module_found = importlib.util.find_spec('tensorflow') is not None

    @skipIf(not module_found, "Tensorflow package is not found")
    class TfImportTest(TestCase):
        def test_raises_when_crashes_on_import(self):
            # Should fire if import can't be done for any reason except
            # module unavailability and import crash
            with self.assertRaisesRegex(ImportError, 'Test process exit code'):
                check_import()

@skipIf(import_failed, "Failed to import tensorflow")
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
        test_dataset = Dataset.from_iterable([
            DatasetItem(id=1, subset='train',
                image=np.ones((16, 16, 3)),
                annotations=[
                    Bbox(0, 4, 4, 8, label=2),
                    Bbox(0, 4, 4, 4, label=3),
                    Bbox(2, 4, 4, 4),
                ], attributes={'source_id': ''}
            ),
        ], categories={
            AnnotationType.label: LabelCategories.from_iterable(
                'label_' + str(label) for label in range(10)),
        })

        with TestDir() as test_dir:
            self._test_save_and_load(
                test_dataset,
                partial(TfDetectionApiConverter.convert, save_images=True),
                test_dir)

    def test_can_save_masks(self):
        test_dataset = Dataset.from_iterable([
            DatasetItem(id=1, subset='train', image=np.ones((4, 5, 3)),
                annotations=[
                    Mask(image=np.array([
                        [1, 0, 0, 1],
                        [0, 1, 1, 0],
                        [0, 1, 1, 0],
                        [1, 0, 0, 1],
                    ]), label=1),
                ],
                attributes={'source_id': ''}
            ),
        ], categories={
            AnnotationType.label: LabelCategories.from_iterable(
                'label_' + str(label) for label in range(10)),
        })

        with TestDir() as test_dir:
            self._test_save_and_load(
                test_dataset,
                partial(TfDetectionApiConverter.convert, save_masks=True),
                test_dir)

    def test_can_save_dataset_with_no_subsets(self):
        test_dataset = Dataset.from_iterable([
            DatasetItem(id=1,
                image=np.ones((16, 16, 3)),
                annotations=[
                    Bbox(2, 1, 4, 4, label=2),
                    Bbox(4, 2, 8, 4, label=3),
                ],
                attributes={'source_id': ''}
            ),

            DatasetItem(id=2,
                image=np.ones((8, 8, 3)) * 2,
                annotations=[
                    Bbox(4, 4, 4, 4, label=3),
                ],
                attributes={'source_id': ''}
            ),

            DatasetItem(id=3,
                image=np.ones((8, 4, 3)) * 3,
                attributes={'source_id': ''}
            ),
        ], categories={
            AnnotationType.label: LabelCategories.from_iterable(
                'label_' + str(label) for label in range(10)),
        })

        with TestDir() as test_dir:
            self._test_save_and_load(
                test_dataset,
                partial(TfDetectionApiConverter.convert, save_images=True),
                test_dir)

    def test_can_save_dataset_with_image_info(self):
        test_dataset = Dataset.from_iterable([
            DatasetItem(id='1/q.e',
                image=Image(path='1/q.e', size=(10, 15)),
                attributes={'source_id': ''}
            )
        ], categories={
            AnnotationType.label: LabelCategories(),
        })

        with TestDir() as test_dir:
            self._test_save_and_load(test_dataset,
                TfDetectionApiConverter.convert, test_dir)

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


DUMMY_DATASET_DIR = osp.join(osp.dirname(__file__),
    'assets', 'tf_detection_api_dataset')

@skipIf(import_failed, "Failed to import tensorflow")
class TfrecordImporterTest(TestCase):
    def test_can_detect(self):
        self.assertTrue(TfDetectionApiImporter.detect(DUMMY_DATASET_DIR))

    def test_can_import(self):
        target_dataset = Dataset.from_iterable([
            DatasetItem(id=1, subset='train',
                image=np.ones((16, 16, 3)),
                annotations=[
                    Bbox(0, 4, 4, 8, label=2),
                    Bbox(0, 4, 4, 4, label=3),
                    Bbox(2, 4, 4, 4),
                ],
                attributes={'source_id': '1'}
            ),

            DatasetItem(id=2, subset='val',
                image=np.ones((8, 8, 3)),
                annotations=[
                    Bbox(1, 2, 4, 2, label=3),
                ],
                attributes={'source_id': '2'}
            ),

            DatasetItem(id=3, subset='test',
                image=np.ones((5, 4, 3)) * 3,
                attributes={'source_id': '3'}
            ),
        ], categories={
            AnnotationType.label: LabelCategories.from_iterable(
                'label_' + str(label) for label in range(10)),
        })

        dataset = Project.import_from(DUMMY_DATASET_DIR, 'tf_detection_api') \
            .make_dataset()

        compare_datasets(self, target_dataset, dataset)
