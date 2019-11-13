import json
import os
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project
from datumaro.components.extractor import *
from datumaro.components.converters.ms_coco import *
from datumaro.util.test_utils import *
from datumaro.util import find


class CocoImporterTest(TestCase):
    @staticmethod
    def generate_annotation():
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
            "width": 10,
            "height": 5,
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
            "segmentation": [[0, 0, 1, 0, 1, 2, 0, 2]],
            "area": 2,
            "bbox": [0, 0, 1, 2],
            "iscrowd": 0
        })
        annotation['annotations'].append({
            "id": 1,
            "image_id": 0,
            "category_id": 0,
            "segmentation": {
                "counts": [
                    0, 10,
                    5, 5,
                    5, 5,
                    0, 10,
                    10, 0],
                "size": [10, 5]},
            "area": 30,
            "bbox": [0, 0, 10, 4],
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

            self.assertListEqual(['val'], sorted(dataset.subsets()))
            self.assertEqual(1, len(dataset))

            item = next(iter(dataset))
            self.assertTrue(item.has_image)
            self.assertEqual(5, len(item.annotations))

            ann_0 = find(item.annotations, lambda x: x.id == 0)
            ann_0_poly = find(item.annotations, lambda x: \
                x.group == ann_0.id and x.type == AnnotationType.polygon)
            ann_0_mask = find(item.annotations, lambda x: \
                x.group == ann_0.id and x.type == AnnotationType.mask)
            self.assertFalse(ann_0 is None)
            self.assertFalse(ann_0_poly is None)
            self.assertFalse(ann_0_mask is None)

            ann_1 = find(item.annotations, lambda x: x.id == 1)
            ann_1_mask = find(item.annotations, lambda x: \
                x.group == ann_1.id and x.type == AnnotationType.mask)
            self.assertFalse(ann_1 is None)
            self.assertFalse(ann_1_mask is None)

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
            for ann_a in item_a.annotations:
                ann_b = find(item_b.annotations, lambda x: \
                    x.id == ann_a.id if ann_a.id else \
                    x.type == ann_a.type and x.group == ann_a.group)
                self.assertEqual(ann_a, ann_b)

    def test_can_save_and_load_captions(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id_=0, subset='train',
                        annotations=[
                            CaptionObject('hello', id_=1),
                            CaptionObject('world', id_=2),
                        ]),
                    DatasetItem(id_=1, subset='train',
                        annotations=[
                            CaptionObject('test', id_=3),
                        ]),

                    DatasetItem(id_=2, subset='val',
                        annotations=[
                            CaptionObject('word', id_=1),
                        ]
                    ),
                ]
                return iter(items)

            def subsets(self):
                return ['train', 'val']

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoCaptionsConverter, test_dir)

    def test_can_save_and_load_instances(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id_=0, subset='train', image=np.ones((4, 4, 3)),
                        annotations=[
                            BboxObject(0, 1, 2, 3, label=2, group=1,
                                attributes={ 'is_crowd': False }, id_=1),
                            PolygonObject([0, 1, 2, 1, 2, 3, 0, 3],
                                label=2, group=1),
                            MaskObject(np.array([[0, 0, 0, 0], [1, 1, 0, 0],
                                                 [1, 1, 0, 0], [0, 0, 0, 0]],
                                                 # does not include lower row
                                                 dtype=np.bool),
                                label=2, group=1),
                        ]),
                    DatasetItem(id_=1, subset='train',
                        annotations=[
                            BboxObject(0, 1, 3, 3, label=4, group=3,
                                attributes={ 'is_crowd': True }, id_=3),
                            MaskObject(np.array([[0, 0, 0, 0], [1, 0, 1, 0],
                                                 [1, 1, 0, 0], [0, 0, 1, 0]],
                                                 dtype=np.bool),
                                label=4, group=3),
                        ]),

                    DatasetItem(id_=2, subset='val',
                        annotations=[
                            BboxObject(0, 1, 3, 2, label=4, group=3,
                                attributes={ 'is_crowd': True }, id_=3),
                            MaskObject(np.array([[0, 0, 0, 0], [1, 0, 1, 0],
                                                 [1, 1, 0, 0], [0, 0, 0, 0]],
                                                 dtype=np.bool),
                                label=4, group=3),
                        ]),
                ]
                return iter(items)

            def subsets(self):
                return ['train', 'val']

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
                    DatasetItem(id_=0, subset='train'),
                    DatasetItem(id_=1, subset='train'),

                    DatasetItem(id_=2, subset='val'),
                    DatasetItem(id_=3, subset='val'),
                    DatasetItem(id_=4, subset='val'),

                    DatasetItem(id_=5, subset='test'),
                ]
                return iter(items)

            def subsets(self):
                return ['train', 'val', 'test']

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoImageInfoConverter, test_dir)

    def test_can_save_and_load_labels(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id_=0, subset='train',
                        annotations=[
                            LabelObject(4, id_=1),
                            LabelObject(9, id_=2),
                        ]),
                    DatasetItem(id_=1, subset='train',
                        annotations=[
                            LabelObject(4, id_=4),
                        ]),

                    DatasetItem(id_=2, subset='val',
                        annotations=[
                            LabelObject(2, id_=1),
                        ]),
                ]
                return iter(items)

            def subsets(self):
                return ['train', 'val']

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
                    DatasetItem(id_=0, subset='train',
                        annotations=[
                            PointsObject([1, 2, 0, 2, 4, 1], [0, 1, 2],
                                label=3, group=1, id_=1),
                            BboxObject(1, 2, 3, 4, label=3, group=1),
                            PointsObject([5, 6, 0, 7], group=2, id_=2),
                            BboxObject(1, 2, 3, 4, group=2),
                        ]),
                    DatasetItem(id_=1, subset='train',
                        annotations=[
                            PointsObject([1, 2, 0, 2, 4, 1], label=5,
                                group=3, id_=3),
                            BboxObject(1, 2, 3, 4, label=5, group=3),
                        ]),

                    DatasetItem(id_=2, subset='val',
                        annotations=[
                            PointsObject([0, 2, 0, 2, 4, 1], label=2,
                                group=3, id_=3),
                            BboxObject(0, 2, 4, 4, label=2, group=3),
                        ]),
                ]
                return iter(items)

            def subsets(self):
                return ['train', 'val']

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
