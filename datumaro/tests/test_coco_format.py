import json
import numpy as np
import os
import os.path as osp
from PIL import Image

from unittest import TestCase

from datumaro.components.project import Project
from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, LabelObject, MaskObject, PointsObject, PolygonObject,
    BboxObject, CaptionObject,
    LabelCategories, PointsCategories
)
from datumaro.components.converters.ms_coco import (
    CocoConverter,
    CocoImageInfoConverter,
    CocoCaptionsConverter,
    CocoInstancesConverter,
    CocoPersonKeypointsConverter,
    CocoLabelsConverter,
)
from datumaro.util import find
from datumaro.util.test_utils import TestDir


class CocoImporterTest(TestCase):
    @staticmethod
    def generate_annotation():
        annotation = {
            'licenses': [],
            'info': {},
            'categories': [],
            'images': [],
            'annotations': [],
        }
        annotation['licenses'].append({
            'name': '',
            'id': 0,
            'url': '',
        })
        annotation['info'] = {
            'contributor': '',
            'date_created': '',
            'description': '',
            'url': '',
            'version': '',
            'year': '',
        }
        annotation['licenses'].append({
            'name': '',
            'id': 0,
            'url': '',
        })
        annotation['categories'].append({
            'id': 1,
            'name': 'TEST',
            'supercategory': '',
        })
        annotation['images'].append({
            "id": 1,
            "width": 10,
            "height": 5,
            "file_name": '000000000001.jpg',
            "license": 0,
            "flickr_url": '',
            "coco_url": '',
            "date_captured": 0,
        })
        annotation['annotations'].append({
            "id": 1,
            "image_id": 1,
            "category_id": 1,
            "segmentation": [[0, 0, 1, 0, 1, 2, 0, 2]],
            "area": 2,
            "bbox": [0, 0, 1, 2],
            "iscrowd": 0,
        })
        annotation['annotations'].append({
            "id": 2,
            "image_id": 1,
            "category_id": 1,
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
            "iscrowd": 1,
        })
        return annotation

    def COCO_dataset_generate(self, path):
        img_dir = osp.join(path, 'images', 'val')
        ann_dir = osp.join(path, 'annotations')
        os.makedirs(img_dir)
        os.makedirs(ann_dir)

        image = np.ones((10, 5, 3), dtype=np.uint8)
        image = Image.fromarray(image).convert('RGB')
        image.save(osp.join(img_dir, '000000000001.jpg'))

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
            self.assertEqual(np.sum(item.image), np.prod(item.image.shape))
            self.assertEqual(4, len(item.annotations))

            ann_1 = find(item.annotations, lambda x: x.id == 1)
            ann_1_poly = find(item.annotations, lambda x: \
                x.group == ann_1.id and x.type == AnnotationType.polygon)
            self.assertFalse(ann_1 is None)
            self.assertFalse(ann_1_poly is None)

            ann_2 = find(item.annotations, lambda x: x.id == 2)
            ann_2_mask = find(item.annotations, lambda x: \
                x.group == ann_2.id and x.type == AnnotationType.mask)
            self.assertFalse(ann_2 is None)
            self.assertFalse(ann_2_mask is None)

class CocoConverterTest(TestCase):
    def _test_save_and_load(self, source_dataset, converter, test_dir,
            importer_params=None, target_dataset=None):
        converter(source_dataset, test_dir.path)

        if not importer_params:
            importer_params = {}
        project = Project.import_from(test_dir.path, 'ms_coco',
            **importer_params)
        parsed_dataset = project.make_dataset()

        if target_dataset is not None:
            source_dataset = target_dataset
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
                    x.id == ann_a.id and \
                    x.type == ann_a.type and x.group == ann_a.group)
                self.assertEqual(ann_a, ann_b, 'id: ' + str(ann_a.id))

    def test_can_save_and_load_captions(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0, subset='train',
                        annotations=[
                            CaptionObject('hello', id=1),
                            CaptionObject('world', id=2),
                        ]),
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            CaptionObject('test', id=3),
                        ]),

                    DatasetItem(id=2, subset='val',
                        annotations=[
                            CaptionObject('word', id=1),
                        ]
                    ),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoCaptionsConverter(), test_dir)

    def test_can_save_and_load_instances(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0, subset='train', image=np.ones((4, 4, 3)),
                        annotations=[
                            # Bbox + single polygon
                            BboxObject(0, 1, 2, 3, label=2, group=1, id=1,
                                attributes={ 'is_crowd': False }),
                            PolygonObject([0, 1, 2, 1, 2, 3, 0, 3],
                                attributes={ 'is_crowd': False },
                                label=2, group=1, id=1),
                        ]),
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            # Mask + bbox
                            MaskObject(np.array([[0, 0, 0, 0], [1, 0, 1, 0],
                                                 [1, 1, 0, 0], [0, 0, 1, 0]],
                                                 dtype=np.bool),
                                attributes={ 'is_crowd': True },
                                label=4, group=3, id=3),
                            BboxObject(0, 1, 3, 3, label=4, group=3, id=3,
                                attributes={ 'is_crowd': True }),
                        ]),

                    DatasetItem(id=3, subset='val',
                        annotations=[
                            # Bbox + mask
                            BboxObject(0, 1, 3, 2, label=4, group=3, id=3,
                                attributes={ 'is_crowd': True }),
                            MaskObject(np.array([[0, 0, 0, 0], [1, 0, 1, 0],
                                                 [1, 1, 0, 0], [0, 0, 0, 0]],
                                                 dtype=np.bool),
                                attributes={ 'is_crowd': True },
                                label=4, group=3, id=3),
                        ]),
                ])

            def categories(self):
                label_categories = LabelCategories()
                for i in range(10):
                    label_categories.add(str(i))
                return {
                    AnnotationType.label: label_categories,
                }

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoInstancesConverter(), test_dir)

    def test_can_save_and_load_instances_with_mask_conversion(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0, image=np.zeros((5, 5, 3)), subset='train',
                        annotations=[
                            BboxObject(0, 0, 5, 5, label=3, id=4, group=4,
                                attributes={ 'is_crowd': False }),
                            PolygonObject([0, 0, 4, 0, 4, 4],
                                label=3, id=4, group=4,
                                attributes={ 'is_crowd': False }),
                            MaskObject(np.array([
                                    [0, 1, 1, 1, 0],
                                    [0, 0, 1, 1, 0],
                                    [0, 0, 0, 1, 0],
                                    [0, 0, 0, 0, 0],
                                    [0, 0, 0, 0, 0]],
                                    # only internal fragment (without the border),
                                    # but not everywhere...
                                    dtype=np.bool),
                                attributes={ 'is_crowd': False },
                                label=3, id=4, group=4),
                        ]
                    ),
                ])

            def categories(self):
                label_categories = LabelCategories()
                for i in range(10):
                    label_categories.add(str(i))
                return {
                    AnnotationType.label: label_categories,
                }

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoInstancesConverter(), test_dir,
                {'merge_instance_polygons': True})

    def test_can_merge_instance_polygons_to_mask_in_coverter(self):
        label_categories = LabelCategories()
        for i in range(10):
            label_categories.add(str(i))

        class SrcTestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0, image=np.zeros((5, 10, 3)),
                        annotations=[
                            PolygonObject([0, 0, 4, 0, 4, 4],
                                label=3, id=4, group=4,
                                attributes={ 'is_crowd': False }),
                            PolygonObject([5, 0, 9, 0, 5, 5],
                                label=3, id=4, group=4,
                                attributes={ 'is_crowd': False }),
                        ]
                    ),
                ])

            def categories(self):
                return { AnnotationType.label: label_categories }

        class DstTestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0, image=np.zeros((5, 10, 3)),
                        annotations=[
                            BboxObject(1, 0, 8, 4, label=3, id=4, group=4,
                                attributes={ 'is_crowd': True }),
                            MaskObject(np.array([
                                    [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
                                    [0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
                                    [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
                                    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
                                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                                    # only internal fragment (without the border),
                                    # but not everywhere...
                                    dtype=np.bool),
                                attributes={ 'is_crowd': True },
                                label=3, id=4, group=4),
                        ]
                    ),
                ])

            def categories(self):
                return { AnnotationType.label: label_categories }

        with TestDir() as test_dir:
            self._test_save_and_load(SrcTestExtractor(),
                CocoInstancesConverter(merge_polygons=True), test_dir,
                target_dataset=DstTestExtractor())

    def test_can_save_and_load_images(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0, subset='train'),
                    DatasetItem(id=1, subset='train'),

                    DatasetItem(id=2, subset='val'),
                    DatasetItem(id=3, subset='val'),
                    DatasetItem(id=4, subset='val'),

                    DatasetItem(id=5, subset='test'),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoImageInfoConverter(), test_dir)

    def test_can_save_and_load_labels(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0, subset='train',
                        annotations=[
                            LabelObject(4, id=1),
                            LabelObject(9, id=2),
                        ]),
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            LabelObject(4, id=4),
                        ]),

                    DatasetItem(id=2, subset='val',
                        annotations=[
                            LabelObject(2, id=1),
                        ]),
                ])

            def categories(self):
                label_categories = LabelCategories()
                for i in range(10):
                    label_categories.add(str(i))
                return {
                    AnnotationType.label: label_categories,
                }

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoLabelsConverter(), test_dir)

    def test_can_save_and_load_keypoints(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0, subset='train',
                        annotations=[
                            PointsObject([1, 2, 0, 2, 4, 1], [0, 1, 2],
                                label=3, group=1, id=1),
                            BboxObject(1, 2, 3, 4, label=3, group=1),
                            PointsObject([5, 6, 0, 7], group=2, id=2),
                            BboxObject(1, 2, 3, 4, group=2),
                        ]),
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            PointsObject([1, 2, 0, 2, 4, 1], label=5,
                                group=3, id=3),
                            BboxObject(1, 2, 3, 4, label=5, group=3),
                        ]),

                    DatasetItem(id=2, subset='val',
                        annotations=[
                            PointsObject([0, 2, 0, 2, 4, 1], label=2,
                                group=3, id=3),
                            BboxObject(0, 2, 4, 4, label=2, group=3),
                        ]),
                ])

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
                CocoPersonKeypointsConverter(), test_dir)

    def test_can_save_dataset_with_no_subsets(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, annotations=[
                        LabelObject(2, id=1),
                    ]),

                    DatasetItem(id=2, image=np.zeros((5, 5, 3)), annotations=[
                        LabelObject(3, id=3),
                        BboxObject(0, 0, 5, 5, label=3, id=4, group=4,
                            attributes={ 'is_crowd': False }),
                        PolygonObject([0, 0, 4, 0, 4, 4], label=3, id=4, group=4,
                            attributes={ 'is_crowd': False }),
                    ]),
                ])

            def categories(self):
                label_cat = LabelCategories()
                for label in range(10):
                    label_cat.add('label_' + str(label))
                return {
                    AnnotationType.label: label_cat,
                }

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoConverter(), test_dir)