import json
import numpy as np
import os
import os.path as osp

from unittest import TestCase

from datumaro.components.project import Project
from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, Label, Mask, Points, Polygon, Bbox, Caption,
    LabelCategories, PointsCategories
)
from datumaro.plugins.coco_format.converter import (
    CocoConverter,
    CocoImageInfoConverter,
    CocoCaptionsConverter,
    CocoInstancesConverter,
    CocoPersonKeypointsConverter,
    CocoLabelsConverter,
)
from datumaro.plugins.coco_format.importer import CocoImporter
from datumaro.util.image import save_image, Image
from datumaro.util.test_utils import TestDir, compare_datasets


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
            "width": 5,
            "height": 10,
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

        image = np.ones((10, 5, 3))
        save_image(osp.join(img_dir, '000000000001.jpg'), image)

        annotation = self.generate_annotation()

        with open(osp.join(ann_dir, 'instances_val.json'), 'w') as outfile:
            json.dump(annotation, outfile)

    def test_can_import(self):
        class DstExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=np.ones((10, 5, 3)), subset='val',
                        annotations=[
                            Polygon([0, 0, 1, 0, 1, 2, 0, 2], label=0,
                                id=1, group=1, attributes={'is_crowd': False}),
                            Mask(np.array(
                                [[1, 0, 0, 1, 0]] * 5 +
                                [[1, 1, 1, 1, 0]] * 5
                                ), label=0,
                                id=2, group=2, attributes={'is_crowd': True}),
                        ]
                    ),
                ])

            def categories(self):
                label_cat = LabelCategories()
                label_cat.add('TEST')
                return { AnnotationType.label: label_cat }

        with TestDir() as test_dir:
            self.COCO_dataset_generate(test_dir)

            dataset = Project.import_from(test_dir, 'coco').make_dataset()

            compare_datasets(self, DstExtractor(), dataset)

    def test_can_detect(self):
        with TestDir() as test_dir:
            self.COCO_dataset_generate(test_dir)

            self.assertTrue(CocoImporter.detect(test_dir))

class CocoConverterTest(TestCase):
    def _test_save_and_load(self, source_dataset, converter, test_dir,
            target_dataset=None, importer_args=None):
        converter(source_dataset, test_dir)

        if importer_args is None:
            importer_args = {}
        parsed_dataset = CocoImporter()(test_dir, **importer_args).make_dataset()

        if target_dataset is None:
            target_dataset = source_dataset

        compare_datasets(self, expected=target_dataset, actual=parsed_dataset)

    def test_can_save_and_load_captions(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train',
                        annotations=[
                            Caption('hello', id=1, group=1),
                            Caption('world', id=2, group=2),
                        ]),
                    DatasetItem(id=2, subset='train',
                        annotations=[
                            Caption('test', id=3, group=3),
                        ]),

                    DatasetItem(id=3, subset='val',
                        annotations=[
                            Caption('word', id=1, group=1),
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
                            Bbox(0, 1, 2, 2,
                                label=2, group=1, id=1,
                                attributes={ 'is_crowd': False }),
                            Polygon([0, 1, 2, 1, 2, 3, 0, 3],
                                attributes={ 'is_crowd': False },
                                label=2, group=1, id=1),
                        ]),
                    DatasetItem(id=2, subset='train', image=np.ones((4, 4, 3)),
                        annotations=[
                            # Mask + bbox
                            Mask(np.array([
                                    [0, 1, 0, 0],
                                    [0, 1, 0, 0],
                                    [0, 1, 1, 1],
                                    [0, 0, 0, 0]],
                                ),
                                attributes={ 'is_crowd': True },
                                label=4, group=3, id=3),
                            Bbox(1, 0, 2, 2, label=4, group=3, id=3,
                                attributes={ 'is_crowd': True }),
                        ]),

                    DatasetItem(id=3, subset='val', image=np.ones((4, 4, 3)),
                        annotations=[
                            # Bbox + mask
                            Bbox(0, 1, 2, 2, label=4, group=3, id=3,
                                attributes={ 'is_crowd': True }),
                            Mask(np.array([
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

        class DstExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train', image=np.ones((4, 4, 3)),
                        annotations=[
                            Polygon([0, 1, 2, 1, 2, 3, 0, 3],
                                attributes={ 'is_crowd': False },
                                label=2, group=1, id=1),
                        ]),
                    DatasetItem(id=2, subset='train', image=np.ones((4, 4, 3)),
                        annotations=[
                            Mask(np.array([
                                    [0, 1, 0, 0],
                                    [0, 1, 0, 0],
                                    [0, 1, 1, 1],
                                    [0, 0, 0, 0]],
                                ),
                                attributes={ 'is_crowd': True },
                                label=4, group=3, id=3),
                        ]),

                    DatasetItem(id=3, subset='val', image=np.ones((4, 4, 3)),
                        annotations=[
                            Mask(np.array([
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
                CocoInstancesConverter(), test_dir,
                target_dataset=DstExtractor())

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
                            Polygon([0, 0, 4, 0, 4, 4],
                                label=3, id=4, group=4),
                            Polygon([5, 0, 9, 0, 5, 5],
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
                    Mask(np.array([
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
                importer_args={'merge_instance_polygons': True},
                target_dataset=TargetExtractor())

    def test_can_crop_covered_segments(self):
        label_categories = LabelCategories()
        for i in range(10):
            label_categories.add(str(i))

        class SrcTestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=np.zeros((5, 5, 3)),
                        annotations=[
                            Mask(np.array([
                                    [0, 0, 1, 1, 1],
                                    [0, 0, 1, 1, 1],
                                    [1, 1, 0, 1, 1],
                                    [1, 1, 1, 0, 0],
                                    [1, 1, 1, 0, 0]],
                                ),
                                label=2, id=1, z_order=0),
                            Polygon([1, 1, 4, 1, 4, 4, 1, 4],
                                label=1, id=2, z_order=1),
                        ]
                    ),
                ])

            def categories(self):
                return { AnnotationType.label: label_categories }

        class DstTestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=np.zeros((5, 5, 3)),
                        annotations=[
                            Mask(np.array([
                                    [0, 0, 1, 1, 1],
                                    [0, 0, 0, 0, 1],
                                    [1, 0, 0, 0, 1],
                                    [1, 0, 0, 0, 0],
                                    [1, 1, 1, 0, 0]],
                                ),
                                attributes={ 'is_crowd': True },
                                label=2, id=1, group=1),

                            Polygon([1, 1, 4, 1, 4, 4, 1, 4],
                                label=1, id=2, group=2,
                                attributes={ 'is_crowd': False }),
                        ]
                    ),
                ])

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
                            Polygon([0, 0, 4, 0, 4, 4],
                                label=3, id=4, group=4),
                            Polygon([5, 0, 9, 0, 5, 5],
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
                            Mask(np.array([
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
                return iter([
                    DatasetItem(id=1, image=np.zeros((5, 10, 3)),
                        annotations=[
                            Mask(np.array([
                                    [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
                                    [0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
                                    [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
                                    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
                                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                                ]),
                                label=3, id=4, group=4),
                        ]
                    ),
                ])

            def categories(self):
                return { AnnotationType.label: label_categories }

        class DstTestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=np.zeros((5, 10, 3)),
                        annotations=[
                            Polygon(
                                [3.0, 2.5, 1.0, 0.0, 3.5, 0.0, 3.0, 2.5],
                                label=3, id=4, group=4,
                                attributes={ 'is_crowd': False }),
                            Polygon(
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
                            Label(4, id=1, group=1),
                            Label(9, id=2, group=2),
                        ]),
                    DatasetItem(id=2, subset='train',
                        annotations=[
                            Label(4, id=4, group=4),
                        ]),

                    DatasetItem(id=3, subset='val',
                        annotations=[
                            Label(2, id=1, group=1),
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
                            Points([0, 0, 0, 2, 4, 1], [0, 1, 2],
                                label=3, group=1, id=1),
                            Polygon([0, 0, 4, 0, 4, 4],
                                label=3, group=1, id=1),

                            # Full instance annotations: bbox + keypoints
                            Points([1, 2, 3, 4, 2, 3], group=2, id=2),
                            Bbox(1, 2, 2, 2, group=2, id=2),
                        ]),
                    DatasetItem(id=2, subset='train',
                        annotations=[
                            # Solitary keypoints
                            Points([1, 2, 0, 2, 4, 1], label=5, id=3),
                        ]),

                    DatasetItem(id=3, subset='val',
                        annotations=[
                            # Solitary keypoints with no label
                            Points([0, 0, 1, 2, 3, 4], [0, 1, 2], id=3),
                        ]),
                ])

            def categories(self):
                return categories

        class DstTestExtractor(TestExtractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='train', image=np.zeros((5, 5, 3)),
                        annotations=[
                            Points([0, 0, 0, 2, 4, 1], [0, 1, 2],
                                label=3, group=1, id=1,
                                attributes={'is_crowd': False}),
                            Polygon([0, 0, 4, 0, 4, 4],
                                label=3, group=1, id=1,
                                attributes={'is_crowd': False}),

                            Points([1, 2, 3, 4, 2, 3],
                                group=2, id=2,
                                attributes={'is_crowd': False}),
                            Polygon([1, 2, 3, 2, 3, 4, 1, 4],
                                group=2, id=2,
                                attributes={'is_crowd': False}),
                        ]),
                    DatasetItem(id=2, subset='train',
                        annotations=[
                            Points([1, 2, 0, 2, 4, 1],
                                label=5, group=3, id=3,
                                attributes={'is_crowd': False}),
                            Polygon([0, 1, 4, 1, 4, 2, 0, 2],
                                label=5, group=3, id=3,
                                attributes={'is_crowd': False}),
                        ]),

                    DatasetItem(id=3, subset='val',
                        annotations=[
                            Points([0, 0, 1, 2, 3, 4], [0, 1, 2],
                                group=3, id=3,
                                attributes={'is_crowd': False}),
                            Polygon([1, 2, 3, 2, 3, 4, 1, 4],
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
                        Label(2, id=1, group=1),
                    ]),

                    DatasetItem(id=2, annotations=[
                        Label(3, id=2, group=2),
                    ]),
                ])

            def categories(self):
                label_cat = LabelCategories()
                point_cat = PointsCategories()
                for label in range(10):
                    label_cat.add('label_' + str(label))
                    point_cat.add(label)
                return {
                    AnnotationType.label: label_cat,
                    AnnotationType.points: point_cat,
                }

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoConverter(), test_dir)

    def test_can_save_dataset_with_image_info(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=Image(path='1.jpg', size=(10, 15))),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                CocoConverter(tasks='image_info'), test_dir)