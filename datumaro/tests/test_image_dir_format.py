import numpy as np
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project
from datumaro.components.extractor import Extractor, DatasetItem
from datumaro.util.test_utils import TestDir
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
                save_image(osp.join(test_dir.path, '%s.jpg' % item.id),
                    item.image)

            project = Project.import_from(test_dir.path, 'image_dir')
            parsed_dataset = project.make_dataset()

            self.assertListEqual(
                sorted(source_dataset.subsets()),
                sorted(parsed_dataset.subsets()),
            )

            self.assertEqual(len(source_dataset), len(parsed_dataset))

            for subset_name in source_dataset.subsets():
                source_subset = source_dataset.get_subset(subset_name)
                parsed_subset = parsed_dataset.get_subset(subset_name)
                self.assertEqual(len(source_subset), len(parsed_subset))
                for idx, (item_a, item_b) in enumerate(
                        zip(source_subset, parsed_subset)):
                    self.assertEqual(item_a, item_b, str(idx))

            self.assertEqual(
                source_dataset.categories(),
                parsed_dataset.categories())