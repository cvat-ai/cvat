import numpy as np
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project
from datumaro.components.extractor import Extractor, DatasetItem
from datumaro.util.test_utils import TestDir, compare_datasets
from datumaro.util.image import save_image


class ImageDirFormatTest(TestCase):
    class TestExtractor(Extractor):
        def __iter__(self):
            return iter([
                DatasetItem(id=1, image=np.ones((10, 6, 3))),
                DatasetItem(id=2, image=np.ones((5, 4, 3))),
            ])

    def test_can_load(self):
        with TestDir() as test_dir:
            source_dataset = self.TestExtractor()

            for item in source_dataset:
                save_image(osp.join(test_dir, '%s.jpg' % item.id), item.image)

            project = Project.import_from(test_dir, 'image_dir')
            parsed_dataset = project.make_dataset()

            compare_datasets(self, source_dataset, parsed_dataset)
