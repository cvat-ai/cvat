import json
from itertools import zip_longest
import os
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project
from datumaro.components.extractor import *
from datumaro.components.converters.ms_coco import *
from datumaro.util.test_utils import *
from datumaro.util import find


class CocoImporterTest(TestCase):
    def generate_annotation(self):
        annotation = {
            'licenses': [],
            'info': {},
            'categories': [],
            'images': [],
            'annotations': []
        }
        annotation['licenses'].append({
            'name': '',
            'id': 0,
            'url': ''
        })
        annotation['info'] = {
            'contributor': '',
            'date_created': '',
            'description': '',
            'url': '',
            'version': '',
            'year': ''
        }
        annotation['licenses'].append({
            'name': '',
            'id': 0,
            'url': ''
        })
        annotation['categories'].append({'id': 0, 'name': 'TEST', 'supercategory': ''})
        annotation['images'].append({
            "id": 0,
            "width": 100,
            "height": 100,
            "file_name": '000000000001.jpg',
            "license": 0,
            "flickr_url": '',
            "coco_url": '',
            "date_captured": 0
            })
        annotation['annotations'].append({
            "id": 0,
            "image_id": 0,
            "category_id": 0,
            "segmentation": [0.0, 1.0],
            "area": 2,
            "bbox": [0, 0, 1, 2],
            "iscrowd": 0
        })
        return annotation

    def COCO_dataset_generate(self, path):
        import numpy as np
        from PIL import Image

        img_dir = osp.join(path, 'images', 'val')
        ann_dir = osp.join(path, 'annotations')
        os.makedirs(img_dir)
        os.makedirs(ann_dir)
        a = np.random.rand(100, 100, 3) * 255
        im_out = Image.fromarray(a.astype('uint8')).convert('RGB')
        im_out.save(osp.join(img_dir, '000000000001.jpg'))
        annotation = self.generate_annotation()
        with open(osp.join(ann_dir, 'instances_val.json'), 'w') as outfile:
            json.dump(annotation, outfile)

    def test_can_import(self):
        with TestDir() as temp_dir:
            self.COCO_dataset_generate(temp_dir.path)
            project = Project.import_from(temp_dir.path, 'ms_coco')
            dataset = project.make_dataset()
            item = next(iter(dataset))

            self.assertTrue(item.image is not None)
            self.assertEqual(1, len(item.annotations))
            self.assertEqual(AnnotationType.bbox, item.annotations[0].type)
            self.assertListEqual(['val'], sorted(dataset.subsets()))

class CocoConverterTest(TestCase):
    def _test_save_and_load(self, source_dataset, converter_type, test_dir):
        converter = converter_type()
        converter(source_dataset, test_dir.path)

        project = Project.import_from(test_dir.path, 'ms_coco')
        parsed_dataset = project.make_dataset()

        self.assertListEqual(
            sorted(source_dataset.subsets()),
            sorted(parsed_dataset.subsets()),
        )

        self.assertEqual(len(source_dataset), len(parsed_dataset))

        for item_a in source_dataset:
            item_b = find(parsed_dataset, lambda x: x.id == item_a.id)
            self.assertFalse(item_b is None)
            self.assertEqual(len(item_a.annotations), len(item_b.annotations))
            for ann_a, ann_b in zip_longest(item_a.annotations, item_b.annotations):
                self.assertEqual(ann_a.type, ann_b.type)

    def test_can_save_and_load_captions(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id=0, subset='train',
                        annotations=[
                            CaptionObject('hello'),
                            CaptionObject('world'),
                        ]),
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            CaptionObject('test'),
                        ]),

                    DatasetItem(id=2, subset='test'),
                ]
                return iter(items)

            def subsets(self):
                return ['train', 'test']

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoCaptionsConverter, test_dir)

    def test_can_save_and_load_instances(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id=0, subset='train',
                        annotations=[
                            BboxObject(0, 1, 2, 3, label=2),
                            BboxObject(5, 6, 7, 8),
                        ]),
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            BboxObject(0, 1, 2, 3, label=4),
                        ]),

                    DatasetItem(id=2, subset='test'),
                ]
                return iter(items)

            def subsets(self):
                return ['train', 'test']

            def categories(self):
                label_categories = LabelCategories()
                for i in range(10):
                    label_categories.add(str(i))
                return {
                    AnnotationType.label: label_categories,
                }

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoInstancesConverter, test_dir)

    def test_can_save_and_load_images(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id=0, subset='train'),
                    DatasetItem(id=1, subset='train'),

                    DatasetItem(id=2, subset='test'),
                ]
                return iter(items)

            def subsets(self):
                return ['train', 'test']

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoImageInfoConverter, test_dir)

    def test_can_save_and_load_labels(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id=0, subset='train',
                        annotations=[
                            LabelObject(4),
                            LabelObject(9),
                        ]),
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            LabelObject(4),
                        ]),

                    DatasetItem(id=2, subset='test'),
                ]
                return iter(items)

            def subsets(self):
                return ['train', 'test']

            def categories(self):
                label_categories = LabelCategories()
                for i in range(10):
                    label_categories.add(str(i))
                return {
                    AnnotationType.label: label_categories,
                }

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoLabelsConverter, test_dir)

    def test_can_save_and_load_keypoints(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id=0, subset='train',
                        annotations=[
                            PointsObject([1, 2, 0, 2, 4, 1], label=3, group=1),
                            BboxObject(1, 2, 3, 4, label=3, group=1),
                            PointsObject([5, 6, 0, 7, 8, 2], group=2),
                            BboxObject(1, 2, 3, 4, label=4, group=2),
                        ]),
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            PointsObject([1, 2, 0, 2, 4, 1], label=5, group=3),
                            BboxObject(1, 2, 3, 4, label=5, group=3),
                        ]),

                    DatasetItem(id=2, subset='test'),
                ]
                return iter(items)

            def subsets(self):
                return ['train', 'test']

            def categories(self):
                label_categories = LabelCategories()
                points_categories = PointsCategories()
                for i in range(10):
                    label_categories.add(str(i))
                    points_categories.add(i, [])

                return {
                    AnnotationType.label: label_categories,
                    AnnotationType.points: points_categories,
                }

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoPersonKeypointsConverter, test_dir)