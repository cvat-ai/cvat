from unittest import TestCase

from datumaro.components.project import Project
from datumaro.components.extractor import *


class ExtractorTest(TestCase):
    def test_custom_extractor_can_be_created(self):
        class CustomExtractor(Extractor):
            def __init__(self, url):
                super().__init__()

            def __iter__(self):
                return iter([
                    DatasetItem(id_=0, subset='train'),
                    DatasetItem(id_=1, subset='train'),
                    DatasetItem(id_=2, subset='train'),

                    DatasetItem(id_=3, subset='test'),
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
