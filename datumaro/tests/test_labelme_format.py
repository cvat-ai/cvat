import numpy as np

from unittest import TestCase

from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, Bbox, Mask, Polygon, LabelCategories
)
from datumaro.plugins.labelme_format import LabelMeImporter, LabelMeConverter
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
                                'occluded': True
                            }),
                            Mask(np.array([[0, 1], [1, 0], [1, 1]]), group=2),
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
                            Bbox(0, 4, 4, 8, label=0, group=2, attributes={
                                'occluded': False
                            }),
                            Polygon([0, 4, 4, 4, 5, 6], label=1, attributes={
                                'occluded': True
                            }),
                            Mask(np.array([[0, 1], [1, 0], [1, 1]]), group=2,
                                attributes={ 'occluded': False }
                            ),
                            Bbox(1, 2, 3, 4, group=1, attributes={
                                'occluded': False
                            }),
                            Mask(np.array([[0, 0], [0, 0], [1, 1]]), group=1,
                                attributes={ 'occluded': True }
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

class LabelMeImporterTest(TestCase):
    def test_can_detect(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train',
                        image=np.ones((16, 16, 3)),
                        annotations=[
                            Bbox(0, 4, 4, 8, label=2),
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

        def generate_dummy(path):
            LabelMeConverter()(TestExtractor(), save_dir=path)

        with TestDir() as test_dir:
            generate_dummy(test_dir)

            self.assertTrue(LabelMeImporter.detect(test_dir))