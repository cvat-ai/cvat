import os
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project, Environment
from datumaro.components.extractor import *
from datumaro.components.config import Config


class ExtractorTest(TestCase):
    def test_custom_extractor_can_be_created(self):
        class CustomExtractor(Extractor):
            def __init__(self, url):
                super().__init__()

            def __iter__(self):
                return iter([
                    DatasetItem(id=0, subset='train'),
                    DatasetItem(id=1, subset='train'),
                    DatasetItem(id=2, subset='train'),

                    DatasetItem(id=3, subset='test'),
                ])

            def subsets(self):
                return ['train', 'test']

        extractor_name = 'ext1'
        project = Project()
        project.env.extractors.register(extractor_name, CustomExtractor)
        project.add_source('src1', {
            'url': 'path',
            'format': extractor_name,
        })
        project.set_subsets(['train'])

        dataset = project.make_dataset()

        self.assertEqual(3, len(dataset))
