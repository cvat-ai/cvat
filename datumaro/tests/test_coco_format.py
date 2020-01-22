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
from datumaro.components.converters.coco import (
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
            project = Project.import_from(temp_dir.path, 'coco')
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
        project = Project.import_from(test_dir.path, 'coco',
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
                # We might find few corresponding items, so check them all
                ann_b_matches = [x for x in item_b.annotations
                    if x.id == ann_a.id and \
                        x.type == ann_a.type and x.group == ann_a.group]
                self.assertFalse(len(ann_b_matches) == 0, 'aid: %s' % ann_a.id)

                ann_b = find(ann_b_matches, lambda x: x == ann_a)
                self.assertEqual(ann_a, ann_b, 'aid: %s' % ann_a.id)
                item_b.annotations.remove(ann_b) # avoid repeats

    def test_can_save_and_load_captions(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            CaptionObject('hello', id=1, group=1),
                            CaptionObject('world', id=2, group=2),
                        ]),
                    DatasetItem(id=2, subset='train',
                        annotations=[
                            CaptionObject('test', id=3, group=3),
                        ]),

                    DatasetItem(id=3, subset='val',
                        annotations=[
                            CaptionObject('word', id=1, group=1),
                        ]
                    ),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoCaptionsConverter(), test_dir)

    def test_can_save_and_load_instances(self):
        label_categories = LabelCategories()
        for i in range(10):
            label_categories.add(str(i))
        categories = { AnnotationType.label: label_categories }

        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train', image=np.ones((4, 4, 3)),
                        annotations=[
                            # Bbox + single polygon
                            BboxObject(0, 1, 2, 2,
                                label=2, group=1, id=1,
                                attributes={ 'is_crowd': False }),
                            PolygonObject([0, 1, 2, 1, 2, 3, 0, 3],
                                attributes={ 'is_crowd': False },
                                label=2, group=1, id=1),
                        ]),
                    DatasetItem(id=2, subset='train', image=np.ones((4, 4, 3)),
                        annotations=[
                            # Mask + bbox
                            MaskObject(np.array([
                                    [0, 1, 0, 0],
                                    [0, 1, 0, 0],
                                    [0, 1, 1, 1],
                                    [0, 0, 0, 0]],
                                    ),
                                attributes={ 'is_crowd': True },
                                label=4, group=3, id=3),
                            BboxObject(1, 0, 2, 2, label=4, group=3, id=3,
                                attributes={ 'is_crowd': True }),
                        ]),

                    DatasetItem(id=3, subset='val', image=np.ones((4, 4, 3)),
                        annotations=[
                            # Bbox + mask
                            BboxObject(0, 1, 2, 2, label=4, group=3, id=3,
                                attributes={ 'is_crowd': True }),
                            MaskObject(np.array([
                                    [0, 0, 0, 0],
                                    [1, 1, 1, 0],
                                    [1, 1, 0, 0],
                                    [0, 0, 0, 0]],
                                    ),
                                attributes={ 'is_crowd': True },
                                label=4, group=3, id=3),
                        ]),
                ])

            def categories(self):
                return categories

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoInstancesConverter(), test_dir)

    def test_can_merge_polygons_on_loading(self):
        label_categories = LabelCategories()
        for i in range(10):
            label_categories.add(str(i))
        categories = { AnnotationType.label: label_categories }

        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=np.zeros((6, 10, 3)),
                        annotations=[
                            PolygonObject([0, 0, 4, 0, 4, 4],
                                label=3, id=4, group=4),
                            PolygonObject([5, 0, 9, 0, 5, 5],
                                label=3, id=4, group=4),
                        ]
                    ),
                ])

            def categories(self):
                return categories

        class TargetExtractor(TestExtractor):
            def __iter__(self):
                items = list(super().__iter__())
                items[0]._annotations = [
                    BboxObject(0, 0, 9, 5,
                        label=3, id=4, group=4,
                        attributes={ 'is_crowd': False }),
                    PolygonObject([0, 0, 4, 0, 4, 4],
                        label=3, id=4, group=4,
                        attributes={ 'is_crowd': False }),
                    PolygonObject([5, 0, 9, 0, 5, 5],
                        label=3, id=4, group=4,
                        attributes={ 'is_crowd': False }),
                    MaskObject(np.array([
                            [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
                            [0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
                            [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
                            [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                            # only internal fragment (without the border),
                            # but not everywhere...
                        ),
                        label=3, id=4, group=4,
                        attributes={ 'is_crowd': False }),
                ]
                return iter(items)

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoInstancesConverter(), test_dir,
                importer_params={'merge_instance_polygons': True},
                target_dataset=TargetExtractor())

    def test_can_crop_covered_segments(self):
        label_categories = LabelCategories()
        for i in range(10):
            label_categories.add(str(i))

        class SrcTestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id=1, image=np.zeros((5, 5, 3)),
                        annotations=[
                            MaskObject(np.array([
                                    [0, 0, 1, 1, 1],
                                    [0, 0, 1, 1, 1],
                                    [1, 1, 0, 1, 1],
                                    [1, 1, 1, 0, 0],
                                    [1, 1, 1, 0, 0]],
                                    ),
                                label=2, id=1, z_order=0),
                            PolygonObject([1, 1, 4, 1, 4, 4, 1, 4],
                                label=1, id=2, z_order=1),
                        ]
                    ),
                ]
                return iter(items)

            def categories(self):
                return { AnnotationType.label: label_categories }

        class DstTestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id=1, image=np.zeros((5, 5, 3)),
                        annotations=[
                            BboxObject(0, 0, 4, 4,
                                label=2, id=1, group=1,
                                attributes={ 'is_crowd': True }),
                            MaskObject(np.array([
                                    [0, 0, 1, 1, 1],
                                    [0, 0, 0, 0, 1],
                                    [1, 0, 0, 0, 1],
                                    [1, 0, 0, 0, 0],
                                    [1, 1, 1, 0, 0]],
                                    ),
                                attributes={ 'is_crowd': True },
                                label=2, id=1, group=1),

                            BboxObject(1, 1, 3, 3,
                                label=1, id=2, group=2,
                                attributes={ 'is_crowd': False }),
                            PolygonObject([1, 1, 4, 1, 4, 4, 1, 4],
                                label=1, id=2, group=2,
                                attributes={ 'is_crowd': False }),
                            # NOTE: Why it's 4 in COCOapi?..
                        ]
                    ),
                ]
                return iter(items)

            def categories(self):
                return { AnnotationType.label: label_categories }

        with TestDir() as test_dir:
            self._test_save_and_load(SrcTestExtractor(),
                CocoInstancesConverter(crop_covered=True), test_dir,
                target_dataset=DstTestExtractor())

    def test_can_convert_polygons_to_mask(self):
        label_categories = LabelCategories()
        for i in range(10):
            label_categories.add(str(i))

        class SrcTestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=np.zeros((6, 10, 3)),
                        annotations=[
                            PolygonObject([0, 0, 4, 0, 4, 4],
                                label=3, id=4, group=4),
                            PolygonObject([5, 0, 9, 0, 5, 5],
                                label=3, id=4, group=4),
                        ]
                    ),
                ])

            def categories(self):
                return { AnnotationType.label: label_categories }

        class DstTestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=np.zeros((6, 10, 3)),
                        annotations=[
                            BboxObject(0, 0, 9, 5, label=3, id=4, group=4,
                                attributes={ 'is_crowd': True }),
                            MaskObject(np.array([
                                    [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
                                    [0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
                                    [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
                                    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
                                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                                    # only internal fragment (without the border),
                                    # but not everywhere...
                                    ),
                                attributes={ 'is_crowd': True },
                                label=3, id=4, group=4),
                        ]
                    ),
                ])

            def categories(self):
                return { AnnotationType.label: label_categories }

        with TestDir() as test_dir:
            self._test_save_and_load(SrcTestExtractor(),
                CocoInstancesConverter(segmentation_mode='mask'), test_dir,
                target_dataset=DstTestExtractor())

    def test_can_convert_masks_to_polygons(self):
        label_categories = LabelCategories()
        for i in range(10):
            label_categories.add(str(i))

        class SrcTestExtractor(Extractor):
            def __iter__(self):
                items = [
                    DatasetItem(id=1, image=np.zeros((5, 10, 3)),
                        annotations=[
                            MaskObject(np.array([
                                        [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
                                        [0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
                                        [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
                                        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
                                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                                    ],
                                    ),
                                label=3, id=4, group=4),
                        ]
                    ),
                ]
                return iter(items)

            def categories(self):
                return { AnnotationType.label: label_categories }

        class DstTestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=np.zeros((5, 10, 3)),
                        annotations=[
                            BboxObject(1, 0, 7, 3, label=3, id=4, group=4,
                                attributes={ 'is_crowd': False }),
                            PolygonObject(
                                [3.0, 2.5, 1.0, 0.0, 3.5, 0.0, 3.0, 2.5],
                                label=3, id=4, group=4,
                                attributes={ 'is_crowd': False }),
                            PolygonObject(
                                [5.0, 3.5, 4.5, 0.0, 8.0, 0.0, 5.0, 3.5],
                                label=3, id=4, group=4,
                                attributes={ 'is_crowd': False }),
                        ]
                    ),
                ])

            def categories(self):
                return { AnnotationType.label: label_categories }

        with TestDir() as test_dir:
            self._test_save_and_load(SrcTestExtractor(),
                CocoInstancesConverter(segmentation_mode='polygons'), test_dir,
                target_dataset=DstTestExtractor())

    def test_can_save_and_load_images(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train'),
                    DatasetItem(id=2, subset='train'),

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
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            LabelObject(4, id=1, group=1),
                            LabelObject(9, id=2, group=2),
                        ]),
                    DatasetItem(id=2, subset='train',
                        annotations=[
                            LabelObject(4, id=4, group=4),
                        ]),

                    DatasetItem(id=3, subset='val',
                        annotations=[
                            LabelObject(2, id=1, group=1),
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
        label_categories = LabelCategories()
        points_categories = PointsCategories()
        for i in range(10):
            label_categories.add(str(i))
            points_categories.add(i, [])
        categories = {
            AnnotationType.label: label_categories,
            AnnotationType.points: points_categories,
        }

        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train', image=np.zeros((5, 5, 3)),
                        annotations=[
                            # Full instance annotations: polygon + keypoints
                            PointsObject([0, 0, 0, 2, 4, 1], [0, 1, 2],
                                label=3, group=1, id=1),
                            PolygonObject([0, 0, 4, 0, 4, 4],
                                label=3, group=1, id=1),

                            # Full instance annotations: bbox + keypoints
                            PointsObject([1, 2, 3, 4, 2, 3], group=2, id=2),
                            BboxObject(1, 2, 2, 2, group=2, id=2),
                        ]),
                    DatasetItem(id=2, subset='train',
                        annotations=[
                            # Solitary keypoints
                            PointsObject([1, 2, 0, 2, 4, 1], label=5, id=3),
                        ]),

                    DatasetItem(id=3, subset='val',
                        annotations=[
                            # Solitary keypoints with no label
                            PointsObject([0, 0, 1, 2, 3, 4], [0, 1, 2], id=3),
                        ]),
                ])

            def categories(self):
                return categories

        class DstTestExtractor(TestExtractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train', image=np.zeros((5, 5, 3)),
                        annotations=[
                            PointsObject([0, 0, 0, 2, 4, 1], [0, 1, 2],
                                label=3, group=1, id=1,
                                attributes={'is_crowd': False}),
                            PolygonObject([0, 0, 4, 0, 4, 4],
                                label=3, group=1, id=1,
                                attributes={'is_crowd': False}),
                            BboxObject(0, 0, 4, 4,
                                label=3, group=1, id=1,
                                attributes={'is_crowd': False}),

                            PointsObject([1, 2, 3, 4, 2, 3],
                                group=2, id=2,
                                attributes={'is_crowd': False}),
                            PolygonObject([1, 2, 3, 2, 3, 4, 1, 4],
                                group=2, id=2,
                                attributes={'is_crowd': False}),
                            BboxObject(1, 2, 2, 2,
                                group=2, id=2,
                                attributes={'is_crowd': False}),
                        ]),
                    DatasetItem(id=2, subset='train',
                        annotations=[
                            PointsObject([1, 2, 0, 2, 4, 1],
                                label=5, group=3, id=3,
                                attributes={'is_crowd': False}),
                            PolygonObject([0, 1, 4, 1, 4, 2, 0, 2],
                                label=5, group=3, id=3,
                                attributes={'is_crowd': False}),
                            BboxObject(0, 1, 4, 1,
                                label=5, group=3, id=3,
                                attributes={'is_crowd': False}),
                        ]),

                    DatasetItem(id=3, subset='val',
                        annotations=[
                            PointsObject([0, 0, 1, 2, 3, 4], [0, 1, 2],
                                group=3, id=3,
                                attributes={'is_crowd': False}),
                            PolygonObject([1, 2, 3, 2, 3, 4, 1, 4],
                                group=3, id=3,
                                attributes={'is_crowd': False}),
                            BboxObject(1, 2, 2, 2,
                                group=3, id=3,
                                attributes={'is_crowd': False}),
                        ]),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoPersonKeypointsConverter(), test_dir,
                target_dataset=DstTestExtractor())

    def test_can_save_dataset_with_no_subsets(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, annotations=[
                        LabelObject(2, id=1, group=1),
                    ]),

                    DatasetItem(id=2, annotations=[
                        LabelObject(3, id=2, group=2),
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