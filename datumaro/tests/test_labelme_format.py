import numpy as np
import os.path as osp

from unittest import TestCase

from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, Bbox, Mask, Polygon, LabelCategories
)
from datumaro.components.project import Project
from datumaro.plugins.labelme_format import LabelMeImporter, \
    LabelMeConverter
from datumaro.util.test_utils import TestDir, compare_datasets


class LabelMeConverterTest(TestCase):
    def _test_save_and_load(self, source_dataset, converter, test_dir,
            target_dataset=None, importer_args=None):
        converter(source_dataset, test_dir)

        if importer_args is None:
            importer_args = {}
        parsed_dataset = LabelMeImporter()(test_dir, **importer_args) \
            .make_dataset()

        if target_dataset is None:
            target_dataset = source_dataset

        compare_datasets(self, expected=target_dataset, actual=parsed_dataset)

    def test_can_save_and_load(self):
        class SrcExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train',
                        image=np.ones((16, 16, 3)),
                        annotations=[
                            Bbox(0, 4, 4, 8, label=2, group=2),
                            Polygon([0, 4, 4, 4, 5, 6], label=3, attributes={
                                'occluded': True,
                                'a1': 'qwe',
                                'a2': True,
                                'a3': 123,
                            }),
                            Mask(np.array([[0, 1], [1, 0], [1, 1]]), group=2,
                                attributes={ 'username': 'test' }),
                            Bbox(1, 2, 3, 4, group=3),
                            Mask(np.array([[0, 0], [0, 0], [1, 1]]), group=3,
                                attributes={ 'occluded': True }
                            ),
                        ]
                    ),
                ])

            def categories(self):
                label_cat = LabelCategories()
                for label in range(10):
                    label_cat.add('label_' + str(label))
                return {
                    AnnotationType.label: label_cat,
                }

        class DstExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train',
                        image=np.ones((16, 16, 3)),
                        annotations=[
                            Bbox(0, 4, 4, 8, label=0, group=2, id=0,
                                attributes={
                                    'occluded': False, 'username': '',
                                }
                            ),
                            Polygon([0, 4, 4, 4, 5, 6], label=1, id=1,
                                attributes={
                                    'occluded': True, 'username': '',
                                    'a1': 'qwe',
                                    'a2': True,
                                    'a3': 123,
                                }
                            ),
                            Mask(np.array([[0, 1], [1, 0], [1, 1]]), group=2,
                                id=2, attributes={
                                    'occluded': False, 'username': 'test'
                                }
                            ),
                            Bbox(1, 2, 3, 4, group=1, id=3, attributes={
                                'occluded': False, 'username': '',
                            }),
                            Mask(np.array([[0, 0], [0, 0], [1, 1]]), group=1,
                                id=4, attributes={
                                    'occluded': True, 'username': ''
                                }
                            ),
                        ]
                    ),
                ])

            def categories(self):
                label_cat = LabelCategories()
                label_cat.add('label_2')
                label_cat.add('label_3')
                return {
                    AnnotationType.label: label_cat,
                }

        with TestDir() as test_dir:
            self._test_save_and_load(
                SrcExtractor(), LabelMeConverter(save_images=True),
                test_dir, target_dataset=DstExtractor())

    def test_cant_save_dataset_with_relative_paths(self):
        class SrcExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id='dir/1', image=np.ones((2, 6, 3))),
                ])

            def categories(self):
                return { AnnotationType.label: LabelCategories() }

        with self.assertRaisesRegex(Exception, r'only supports flat'):
            with TestDir() as test_dir:
                self._test_save_and_load(SrcExtractor(),
                    LabelMeConverter(save_images=True), test_dir)


DUMMY_DATASET_DIR = osp.join(osp.dirname(__file__), 'assets', 'labelme_dataset')

class LabelMeImporterTest(TestCase):
    def test_can_detect(self):
        self.assertTrue(LabelMeImporter.detect(DUMMY_DATASET_DIR))

    def test_can_import(self):
        class DstExtractor(Extractor):
            def __iter__(self):
                img1 = np.ones((77, 102, 3)) * 255
                img1[6:32, 7:41] = 0

                mask1 = np.zeros((77, 102), dtype=int)
                mask1[67:69, 58:63] = 1

                mask2 = np.zeros((77, 102), dtype=int)
                mask2[13:25, 54:71] = [
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
                    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
                    [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0],
                    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0],
                    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
                    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
                    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
                    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                ]

                return iter([
                    DatasetItem(id='img1', image=img1,
                        annotations=[
                            Polygon([43, 34, 45, 34, 45, 37, 43, 37],
                                label=0, id=0,
                                attributes={
                                    'occluded': False,
                                    'username': 'admin'
                                }
                            ),
                            Mask(mask1, label=1, id=1,
                                attributes={
                                    'occluded': False,
                                    'username': 'brussell'
                                }
                            ),
                            Polygon([30, 12, 42, 21, 24, 26, 15, 22, 18, 14, 22, 12, 27, 12],
                                label=2, group=2, id=2,
                                attributes={
                                    'a1': True,
                                    'occluded': True,
                                    'username': 'anonymous'
                                }
                            ),
                            Polygon([35, 21, 43, 22, 40, 28, 28, 31, 31, 22, 32, 25],
                                label=3, group=2, id=3,
                                attributes={
                                    'kj': True,
                                    'occluded': False,
                                    'username': 'anonymous'
                                }
                            ),
                            Bbox(13, 19, 10, 11, label=4, group=2, id=4,
                                attributes={
                                    'hg': True,
                                    'occluded': True,
                                    'username': 'anonymous'
                                }
                            ),
                            Mask(mask2, label=5, group=1, id=5,
                                attributes={
                                    'd': True,
                                    'occluded': False,
                                    'username': 'anonymous'
                                }
                            ),
                            Polygon([64, 21, 74, 24, 72, 32, 62, 34, 60, 27, 62, 22],
                                label=6, group=1, id=6,
                                attributes={
                                    'gfd lkj lkj hi': True,
                                    'occluded': False,
                                    'username': 'anonymous'
                                }
                            ),
                        ]
                    ),
                ])

            def categories(self):
                label_cat = LabelCategories()
                label_cat.add('window')
                label_cat.add('license plate')
                label_cat.add('o1')
                label_cat.add('q1')
                label_cat.add('b1')
                label_cat.add('m1')
                label_cat.add('hg')
                return {
                    AnnotationType.label: label_cat,
                }

        parsed = Project.import_from(DUMMY_DATASET_DIR, 'label_me') \
            .make_dataset()
        compare_datasets(self, expected=DstExtractor(), actual=parsed)