import numpy as np

from unittest import TestCase

from datumaro.components.project import Project
from datumaro.components.extractor import Extractor, DatasetItem
from datumaro.plugins.image_dir import ImageDirConverter
from datumaro.util.test_utils import TestDir, compare_datasets


class ImageDirFormatTest(TestCase):
    def test_can_load(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=np.ones((10, 6, 3))),
                    DatasetItem(id=2, image=np.ones((5, 4, 3))),
                ])

        with TestDir() as test_dir:
            source_dataset = TestExtractor()

            ImageDirConverter.convert(source_dataset, save_dir=test_dir)

            project = Project.import_from(test_dir, 'image_dir')
            parsed_dataset = project.make_dataset()

            compare_datasets(self, source_dataset, parsed_dataset)

    def test_relative_paths(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id='1', image=np.ones((4, 2, 3))),
                    DatasetItem(id='subdir1/1', image=np.ones((2, 6, 3))),
                    DatasetItem(id='subdir2/1', image=np.ones((5, 4, 3))),
                ])

        with TestDir() as test_dir:
            source_dataset = TestExtractor()

            ImageDirConverter.convert(source_dataset, save_dir=test_dir)

            project = Project.import_from(test_dir, 'image_dir')
            parsed_dataset = project.make_dataset()

            compare_datasets(self, source_dataset, parsed_dataset)

