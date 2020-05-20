import numpy as np
import os.path as osp

from unittest import TestCase

from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, Bbox, LabelCategories,
)
from datumaro.components.project import Project
from datumaro.plugins.yolo_format.importer import YoloImporter
from datumaro.plugins.yolo_format.converter import YoloConverter
from datumaro.util.image import Image, save_image
from datumaro.util.test_utils import TestDir, compare_datasets


class YoloFormatTest(TestCase):
    def test_can_save_and_load(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train', image=np.ones((8, 8, 3)),
                        annotations=[
                            Bbox(0, 2, 4, 2, label=2),
                            Bbox(0, 1, 2, 3, label=4),
                        ]),
                    DatasetItem(id=2, subset='train', image=np.ones((10, 10, 3)),
                        annotations=[
                            Bbox(0, 2, 4, 2, label=2),
                            Bbox(3, 3, 2, 3, label=4),
                            Bbox(2, 1, 2, 3, label=4),
                        ]),

                    DatasetItem(id=3, subset='valid', image=np.ones((8, 8, 3)),
                        annotations=[
                            Bbox(0, 1, 5, 2, label=2),
                            Bbox(0, 2, 3, 2, label=5),
                            Bbox(0, 2, 4, 2, label=6),
                            Bbox(0, 7, 3, 2, label=7),
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

            YoloConverter(save_images=True)(source_dataset, test_dir)
            parsed_dataset = YoloImporter()(test_dir).make_dataset()

            compare_datasets(self, source_dataset, parsed_dataset)

    def test_can_save_dataset_with_image_info(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train',
                        image=Image(path='1.jpg', size=(10, 15)),
                        annotations=[
                            Bbox(0, 2, 4, 2, label=2),
                            Bbox(3, 3, 2, 3, label=4),
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

            YoloConverter()(source_dataset, test_dir)

            save_image(osp.join(test_dir, 'obj_train_data', '1.jpg'),
                np.ones((10, 15, 3))) # put the image for dataset
            parsed_dataset = YoloImporter()(test_dir).make_dataset()

            compare_datasets(self, source_dataset, parsed_dataset)

    def test_can_load_dataset_with_exact_image_info(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train',
                        image=Image(path='1.jpg', size=(10, 15)),
                        annotations=[
                            Bbox(0, 2, 4, 2, label=2),
                            Bbox(3, 3, 2, 3, label=4),
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

            YoloConverter()(source_dataset, test_dir)

            parsed_dataset = YoloImporter()(test_dir,
                image_info={'1': (10, 15)}).make_dataset()

            compare_datasets(self, source_dataset, parsed_dataset)

    def test_relative_paths(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id='1', subset='train',
                        image=np.ones((4, 2, 3))),
                    DatasetItem(id='subdir1/1', subset='train',
                        image=np.ones((2, 6, 3))),
                    DatasetItem(id='subdir2/1', subset='train',
                        image=np.ones((5, 4, 3))),
                ])

            def categories(self):
                return { AnnotationType.label: LabelCategories() }

        for save_images in {True, False}:
            with self.subTest(save_images=save_images):
                with TestDir() as test_dir:
                    source_dataset = TestExtractor()

                    YoloConverter(save_images=save_images)(
                        source_dataset, test_dir)
                    parsed_dataset = YoloImporter()(test_dir).make_dataset()

                    compare_datasets(self, source_dataset, parsed_dataset)


DUMMY_DATASET_DIR = osp.join(osp.dirname(__file__), 'assets', 'yolo_dataset')

class YoloImporterTest(TestCase):
    def test_can_detect(self):
        self.assertTrue(YoloImporter.detect(DUMMY_DATASET_DIR))

    def test_can_import(self):
        class DstExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train',
                        image=np.ones((10, 15, 3)),
                        annotations=[
                            Bbox(0, 2, 4, 2, label=2),
                            Bbox(3, 3, 2, 3, label=4),
                        ]),
                ])

            def categories(self):
                label_categories = LabelCategories()
                for i in range(10):
                    label_categories.add('label_' + str(i))
                return {
                    AnnotationType.label: label_categories,
                }

        dataset = Project.import_from(DUMMY_DATASET_DIR, 'yolo') \
            .make_dataset()

        compare_datasets(self, DstExtractor(), dataset)
