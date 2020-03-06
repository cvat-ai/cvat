from collections import OrderedDict
import numpy as np
import os
import os.path as osp
from xml.etree import ElementTree as ET
import shutil

from unittest import TestCase

from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, Label, Bbox, Mask, LabelCategories,
)
import datumaro.plugins.voc_format.format as VOC
from datumaro.plugins.voc_format.extractor import (
    VocClassificationExtractor,
    VocDetectionExtractor,
    VocSegmentationExtractor,
    VocLayoutExtractor,
    VocActionExtractor,
)
from datumaro.plugins.voc_format.converter import (
    VocConverter,
    VocClassificationConverter,
    VocDetectionConverter,
    VocLayoutConverter,
    VocActionConverter,
    VocSegmentationConverter,
)
from datumaro.plugins.voc_format.importer import VocImporter
from datumaro.components.project import Project
from datumaro.util.image import save_image, Image
from datumaro.util.test_utils import TestDir, compare_datasets


class VocTest(TestCase):
    def test_colormap_generator(self):
        reference = np.array([
            [  0,   0,   0],
            [128,   0,   0],
            [  0, 128,   0],
            [128, 128,   0],
            [  0,   0, 128],
            [128,   0, 128],
            [  0, 128, 128],
            [128, 128, 128],
            [ 64,   0,   0],
            [192,   0,   0],
            [ 64, 128,   0],
            [192, 128,   0],
            [ 64,   0, 128],
            [192,   0, 128],
            [ 64, 128, 128],
            [192, 128, 128],
            [  0,  64,   0],
            [128,  64,   0],
            [  0, 192,   0],
            [128, 192,   0],
            [  0,  64, 128],
            [224, 224, 192], # ignored
        ])

        self.assertTrue(np.array_equal(reference, list(VOC.VocColormap.values())))

def get_label(extractor, label_id):
    return extractor.categories()[AnnotationType.label].items[label_id].name

def generate_dummy_voc(path):
    cls_subsets_dir = osp.join(path, 'ImageSets', 'Main')
    action_subsets_dir = osp.join(path, 'ImageSets', 'Action')
    layout_subsets_dir = osp.join(path, 'ImageSets', 'Layout')
    segm_subsets_dir = osp.join(path, 'ImageSets', 'Segmentation')
    ann_dir = osp.join(path, 'Annotations')
    img_dir = osp.join(path, 'JPEGImages')
    segm_dir = osp.join(path, 'SegmentationClass')
    inst_dir = osp.join(path, 'SegmentationObject')

    os.makedirs(cls_subsets_dir)
    os.makedirs(ann_dir)
    os.makedirs(img_dir)
    os.makedirs(segm_dir)
    os.makedirs(inst_dir)

    subsets = {
        'train': ['2007_000001'],
        'test': ['2007_000002'],
    }

    # Subsets
    for subset_name, subset in subsets.items():
        for item in subset:
            with open(osp.join(cls_subsets_dir, subset_name + '.txt'), 'w') as f:
                for item in subset:
                    f.write('%s\n' % item)
    shutil.copytree(cls_subsets_dir, action_subsets_dir)
    shutil.copytree(cls_subsets_dir, layout_subsets_dir)
    shutil.copytree(cls_subsets_dir, segm_subsets_dir)

    # Classification
    subset_name = 'train'
    subset = subsets[subset_name]
    for label in VOC.VocLabel:
        with open(osp.join(cls_subsets_dir, '%s_%s.txt' % \
                (label.name, subset_name)), 'w') as f:
            for item in subset:
                presence = label.value % 2
                f.write('%s %2d\n' % (item, 1 if presence else -1))

    # Detection + Action + Layout
    subset_name = 'train'
    subset = subsets[subset_name]
    for item in subset:
        root_elem = ET.Element('annotation')
        ET.SubElement(root_elem, 'folder').text = 'VOC' + item.split('_')[0]
        ET.SubElement(root_elem, 'filename').text = item + '.jpg'

        size_elem = ET.SubElement(root_elem, 'size')
        ET.SubElement(size_elem, 'width').text = '10'
        ET.SubElement(size_elem, 'height').text = '20'
        ET.SubElement(size_elem, 'depth').text = '3'

        ET.SubElement(root_elem, 'segmented').text = '1'

        obj1_elem = ET.SubElement(root_elem, 'object')
        ET.SubElement(obj1_elem, 'name').text = 'cat'
        ET.SubElement(obj1_elem, 'pose').text = VOC.VocPose(1).name
        ET.SubElement(obj1_elem, 'truncated').text = '1'
        ET.SubElement(obj1_elem, 'difficult').text = '0'
        obj1bb_elem = ET.SubElement(obj1_elem, 'bndbox')
        ET.SubElement(obj1bb_elem, 'xmin').text = '1'
        ET.SubElement(obj1bb_elem, 'ymin').text = '2'
        ET.SubElement(obj1bb_elem, 'xmax').text = '3'
        ET.SubElement(obj1bb_elem, 'ymax').text = '4'

        obj2_elem = ET.SubElement(root_elem, 'object')
        ET.SubElement(obj2_elem, 'name').text = 'person'
        obj2bb_elem = ET.SubElement(obj2_elem, 'bndbox')
        ET.SubElement(obj2bb_elem, 'xmin').text = '4'
        ET.SubElement(obj2bb_elem, 'ymin').text = '5'
        ET.SubElement(obj2bb_elem, 'xmax').text = '6'
        ET.SubElement(obj2bb_elem, 'ymax').text = '7'
        obj2head_elem = ET.SubElement(obj2_elem, 'part')
        ET.SubElement(obj2head_elem, 'name').text = VOC.VocBodyPart(1).name
        obj2headbb_elem = ET.SubElement(obj2head_elem, 'bndbox')
        ET.SubElement(obj2headbb_elem, 'xmin').text = '5.5'
        ET.SubElement(obj2headbb_elem, 'ymin').text = '6'
        ET.SubElement(obj2headbb_elem, 'xmax').text = '7.5'
        ET.SubElement(obj2headbb_elem, 'ymax').text = '8'
        obj2act_elem = ET.SubElement(obj2_elem, 'actions')
        for act in VOC.VocAction:
            ET.SubElement(obj2act_elem, act.name).text = '%s' % (act.value % 2)

        with open(osp.join(ann_dir, item + '.xml'), 'w') as f:
            f.write(ET.tostring(root_elem, encoding='unicode'))

    # Segmentation + Instances
    subset_name = 'train'
    subset = subsets[subset_name]
    for item in subset:
        save_image(osp.join(segm_dir, item + '.png'),
            np.tile(VOC.VocColormap[2][::-1], (5, 10, 1))
        )
        save_image(osp.join(inst_dir, item + '.png'),
            np.tile(1, (5, 10, 1)))

    # Test images
    subset_name = 'test'
    subset = subsets[subset_name]
    for item in subset:
        save_image(osp.join(img_dir, item + '.jpg'),
            np.ones([10, 20, 3]))

    return subsets

class TestExtractorBase(Extractor):
    def _label(self, voc_label):
        return self.categories()[AnnotationType.label].find(voc_label)[0]

    def categories(self):
        return VOC.make_voc_categories()

class VocExtractorTest(TestCase):
    def test_can_load_voc_cls(self):
        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id='2007_000001', subset='train',
                        annotations=[
                            Label(self._label(l.name))
                            for l in VOC.VocLabel if l.value % 2 == 1
                        ]
                    ),
                ])

        with TestDir() as test_dir:
            generate_dummy_voc(test_dir)

            parsed_train = VocClassificationExtractor(
                osp.join(test_dir, 'ImageSets', 'Main', 'train.txt'))
            compare_datasets(self, DstExtractor(), parsed_train)

    def test_can_load_voc_det(self):
        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id='2007_000001', subset='train',
                        annotations=[
                            Bbox(1, 2, 2, 2, label=self._label('cat'),
                                attributes={
                                    'pose': VOC.VocPose(1).name,
                                    'truncated': True,
                                    'difficult': False,
                                    'occluded': False,
                                },
                                id=1, group=1,
                            ),
                            Bbox(4, 5, 2, 2, label=self._label('person'),
                                attributes={
                                    'truncated': False,
                                    'difficult': False,
                                    'occluded': False,
                                    **{
                                        a.name: a.value % 2 == 1
                                        for a in VOC.VocAction
                                    }
                                },
                                id=2, group=2,
                                # TODO: Actions and group should be excluded
                                # as soon as correct merge is implemented
                            ),
                        ]
                    ),
                ])

        with TestDir() as test_dir:
            generate_dummy_voc(test_dir)
            parsed_train = VocDetectionExtractor(
                osp.join(test_dir, 'ImageSets', 'Main', 'train.txt'))
            compare_datasets(self, DstExtractor(), parsed_train)

    def test_can_load_voc_segm(self):
        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id='2007_000001', subset='train',
                        annotations=[
                            Mask(image=np.ones([5, 10]),
                                label=self._label(VOC.VocLabel(2).name),
                                group=1,
                            ),
                        ]
                    ),
                ])

        with TestDir() as test_dir:
            generate_dummy_voc(test_dir)
            parsed_train = VocSegmentationExtractor(
                osp.join(test_dir, 'ImageSets', 'Segmentation', 'train.txt'))
            compare_datasets(self, DstExtractor(), parsed_train)

    def test_can_load_voc_layout(self):
        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id='2007_000001', subset='train',
                        annotations=[
                            Bbox(4, 5, 2, 2, label=self._label('person'),
                                attributes={
                                    'truncated': False,
                                    'difficult': False,
                                    'occluded': False,
                                    **{
                                        a.name: a.value % 2 == 1
                                        for a in VOC.VocAction
                                    }
                                },
                                id=2, group=2,
                                # TODO: Actions should be excluded
                                # as soon as correct merge is implemented
                            ),
                            Bbox(5.5, 6, 2, 2, label=self._label(
                                    VOC.VocBodyPart(1).name),
                                group=2
                            )
                        ]
                    ),
                ])

        with TestDir() as test_dir:
            generate_dummy_voc(test_dir)
            parsed_train = VocLayoutExtractor(
                osp.join(test_dir, 'ImageSets', 'Layout', 'train.txt'))
            compare_datasets(self, DstExtractor(), parsed_train)

    def test_can_load_voc_action(self):
        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id='2007_000001', subset='train',
                        annotations=[
                            Bbox(4, 5, 2, 2, label=self._label('person'),
                                attributes={
                                    'truncated': False,
                                    'difficult': False,
                                    'occluded': False,
                                    **{
                                        a.name: a.value % 2 == 1
                                        for a in VOC.VocAction
                                    }
                                    # TODO: group should be excluded
                                    # as soon as correct merge is implemented
                                },
                                id=2, group=2,
                            ),
                        ]
                    ),
                ])

        with TestDir() as test_dir:
            generate_dummy_voc(test_dir)
            parsed_train = VocActionExtractor(
                osp.join(test_dir, 'ImageSets', 'Action', 'train.txt'))
            compare_datasets(self, DstExtractor(), parsed_train)

class VocConverterTest(TestCase):
    def _test_save_and_load(self, source_dataset, converter, test_dir,
            target_dataset=None, importer_args=None):
        converter(source_dataset, test_dir)

        if importer_args is None:
            importer_args = {}
        parsed_dataset = VocImporter()(test_dir, **importer_args).make_dataset()

        if target_dataset is None:
            target_dataset = source_dataset

        compare_datasets(self, expected=target_dataset, actual=parsed_dataset)

    def test_can_save_voc_cls(self):
        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=0, subset='a', annotations=[
                        Label(1),
                        Label(2),
                        Label(3),
                    ]),

                    DatasetItem(id=1, subset='b', annotations=[
                        Label(4),
                    ]),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                VocClassificationConverter(label_map='voc'), test_dir)

    def test_can_save_voc_det(self):
        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', annotations=[
                        Bbox(2, 3, 4, 5, label=2,
                            attributes={ 'occluded': True }
                        ),
                        Bbox(2, 3, 4, 5, label=3,
                            attributes={ 'truncated': True },
                        ),
                    ]),

                    DatasetItem(id=2, subset='b', annotations=[
                        Bbox(5, 4, 6, 5, label=3,
                            attributes={ 'difficult': True },
                        ),
                    ]),
                ])

        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', annotations=[
                        Bbox(2, 3, 4, 5, label=2, id=1, group=1,
                            attributes={
                                'truncated': False,
                                'difficult': False,
                                'occluded': True,
                            }
                        ),
                        Bbox(2, 3, 4, 5, label=3, id=2, group=2,
                            attributes={
                                'truncated': True,
                                'difficult': False,
                                'occluded': False,
                            },
                        ),
                    ]),

                    DatasetItem(id=2, subset='b', annotations=[
                        Bbox(5, 4, 6, 5, label=3, id=1, group=1,
                            attributes={
                                'truncated': False,
                                'difficult': True,
                                'occluded': False,
                            },
                        ),
                    ]),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                VocDetectionConverter(label_map='voc'), test_dir,
                target_dataset=DstExtractor())

    def test_can_save_voc_segm(self):
        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', annotations=[
                        # overlapping masks, the first should be truncated
                        # the second and third are different instances
                        Mask(image=np.array([[0, 1, 1, 1, 0]]), label=4,
                            z_order=1),
                        Mask(image=np.array([[1, 1, 0, 0, 0]]), label=3,
                            z_order=2),
                        Mask(image=np.array([[0, 0, 0, 1, 0]]), label=3,
                            z_order=2),
                    ]),
                ])

        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', annotations=[
                        Mask(image=np.array([[0, 0, 1, 0, 0]]), label=4,
                            group=1),
                        Mask(image=np.array([[1, 1, 0, 0, 0]]), label=3,
                            group=2),
                        Mask(image=np.array([[0, 0, 0, 1, 0]]), label=3,
                            group=3),
                    ]),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                VocSegmentationConverter(label_map='voc'), test_dir,
                target_dataset=DstExtractor())

    def test_can_save_voc_layout(self):
        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', annotations=[
                        Bbox(2, 3, 4, 5, label=2, id=1, group=1,
                            attributes={
                                'pose': VOC.VocPose(1).name,
                                'truncated': True,
                                'difficult': False,
                                'occluded': False,
                            }
                        ),
                        Bbox(2, 3, 1, 1, label=self._label(
                            VOC.VocBodyPart(1).name), group=1),
                        Bbox(5, 4, 3, 2, label=self._label(
                            VOC.VocBodyPart(2).name), group=1),
                    ]),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                VocLayoutConverter(label_map='voc'), test_dir)

    def test_can_save_voc_action(self):
        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', annotations=[
                        Bbox(2, 3, 4, 5, label=2,
                            attributes={
                                'truncated': True,
                                VOC.VocAction(1).name: True,
                                VOC.VocAction(2).name: True,
                            }
                        ),
                        Bbox(5, 4, 3, 2, label=self._label('person'),
                            attributes={
                                'truncated': True,
                                VOC.VocAction(1).name: True,
                                VOC.VocAction(2).name: True,
                            }
                        ),
                    ]),
                ])

        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', annotations=[
                        Bbox(2, 3, 4, 5, label=2,
                            id=1, group=1, attributes={
                                'truncated': True,
                                'difficult': False,
                                'occluded': False,
                                # no attributes here in the label categories
                            }
                        ),
                        Bbox(5, 4, 3, 2, label=self._label('person'),
                            id=2, group=2, attributes={
                                'truncated': True,
                                'difficult': False,
                                'occluded': False,
                                VOC.VocAction(1).name: True,
                                VOC.VocAction(2).name: True,
                                **{
                                    a.name: False for a in VOC.VocAction
                                        if a.value not in {1, 2}
                                }
                            }
                        ),
                    ]),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                VocActionConverter(label_map='voc'), test_dir,
                target_dataset=DstExtractor())

    def test_can_save_dataset_with_no_subsets(self):
        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, annotations=[
                        Label(2),
                        Label(3),
                    ]),

                    DatasetItem(id=2, annotations=[
                        Label(3),
                    ]),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                VocConverter(label_map='voc'), test_dir)

    def test_can_save_dataset_with_images(self):
        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', image=np.ones([4, 5, 3])),
                    DatasetItem(id=2, subset='a', image=np.ones([5, 4, 3])),

                    DatasetItem(id=3, subset='b', image=np.ones([2, 6, 3])),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                VocConverter(label_map='voc', save_images=True), test_dir)

    def test_dataset_with_voc_labelmap(self):
        class SrcExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    Bbox(2, 3, 4, 5, label=self._label('cat'), id=1),
                    Bbox(1, 2, 3, 4, label=self._label('non_voc_label'), id=2),
                ])

            def categories(self):
                label_cat = LabelCategories()
                label_cat.add(VOC.VocLabel.cat.name)
                label_cat.add('non_voc_label')
                return {
                    AnnotationType.label: label_cat,
                }

        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    # drop non voc label
                    Bbox(2, 3, 4, 5, label=self._label('cat'), id=1, group=1,
                        attributes={
                            'truncated': False,
                            'difficult': False,
                            'occluded': False,
                        }
                    ),
                ])

            def categories(self):
                return VOC.make_voc_categories()

        with TestDir() as test_dir:
            self._test_save_and_load(
                SrcExtractor(), VocConverter(label_map='voc'),
                test_dir, target_dataset=DstExtractor())

    def test_dataset_with_guessed_labelmap(self):
        class SrcExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    Bbox(2, 3, 4, 5, label=0, id=1),
                    Bbox(1, 2, 3, 4, label=1, id=2),
                ])

            def categories(self):
                label_cat = LabelCategories()
                label_cat.add(VOC.VocLabel(1).name)
                label_cat.add('non_voc_label')
                return {
                    AnnotationType.label: label_cat,
                }

        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    Bbox(2, 3, 4, 5, label=self._label(VOC.VocLabel(1).name),
                        id=1, group=1, attributes={
                            'truncated': False,
                            'difficult': False,
                            'occluded': False,
                        }
                    ),
                    Bbox(1, 2, 3, 4, label=self._label('non_voc_label'),
                        id=2, group=2, attributes={
                            'truncated': False,
                            'difficult': False,
                            'occluded': False,
                        }
                    ),
                ])

            def categories(self):
                label_map = VOC.make_voc_label_map()
                label_map['non_voc_label'] = [None, [], []]
                for label_desc in label_map.values():
                    label_desc[0] = None # rebuild colormap
                return VOC.make_voc_categories(label_map)

        with TestDir() as test_dir:
            self._test_save_and_load(
                SrcExtractor(), VocConverter(label_map='guess'),
                test_dir, target_dataset=DstExtractor())

    def test_dataset_with_source_labelmap(self):
        class SrcExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    Bbox(2, 3, 4, 5, label=0, id=1),
                    Bbox(1, 2, 3, 4, label=1, id=2),
                ])

            def categories(self):
                label_cat = LabelCategories()
                label_cat.add('label_1')
                label_cat.add('label_2')
                return {
                    AnnotationType.label: label_cat,
                }

        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    Bbox(2, 3, 4, 5, label=self._label('label_1'),
                        id=1, group=1, attributes={
                            'truncated': False,
                            'difficult': False,
                            'occluded': False,
                        }
                    ),
                    Bbox(1, 2, 3, 4, label=self._label('label_2'),
                        id=2, group=2, attributes={
                            'truncated': False,
                            'difficult': False,
                            'occluded': False,
                        }
                    ),
                ])

            def categories(self):
                label_map = OrderedDict()
                label_map['background'] = [None, [], []]
                label_map['label_1'] = [None, [], []]
                label_map['label_2'] = [None, [], []]
                return VOC.make_voc_categories(label_map)

        with TestDir() as test_dir:
            self._test_save_and_load(
                SrcExtractor(), VocConverter(label_map='source'),
                test_dir, target_dataset=DstExtractor())

    def test_dataset_with_fixed_labelmap(self):
        class SrcExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    Bbox(2, 3, 4, 5, label=0, id=1),
                    Bbox(1, 2, 3, 4, label=1, id=2, group=2,
                        attributes={'act1': True}),
                    Bbox(2, 3, 4, 5, label=2, id=3, group=2),
                    Bbox(2, 3, 4, 6, label=3, id=4, group=2),
                ])

            def categories(self):
                label_cat = LabelCategories()
                label_cat.add('foreign_label')
                label_cat.add('label', attributes=['act1', 'act2'])
                label_cat.add('label_part1')
                label_cat.add('label_part2')
                return {
                    AnnotationType.label: label_cat,
                }

        label_map = {
            'label': [None, ['label_part1', 'label_part2'], ['act1', 'act2']]
        }

        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    Bbox(1, 2, 3, 4, label=0, id=1, group=1,
                        attributes={
                            'act1': True,
                            'act2': False,
                            'truncated': False,
                            'difficult': False,
                            'occluded': False,
                        }
                    ),
                    Bbox(2, 3, 4, 5, label=1, group=1),
                    Bbox(2, 3, 4, 6, label=2, group=1),
                ])

            def categories(self):
                return VOC.make_voc_categories(label_map)

        with TestDir() as test_dir:
            self._test_save_and_load(
                SrcExtractor(), VocConverter(label_map=label_map),
                test_dir, target_dataset=DstExtractor())

    def test_can_save_dataset_with_image_info(self):
        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, image=Image(path='1.jpg', size=(10, 15))),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                VocConverter(label_map='voc'), test_dir)

class VocImportTest(TestCase):
    def test_can_import(self):
        with TestDir() as test_dir:
            subsets = generate_dummy_voc(test_dir)

            dataset = Project.import_from(test_dir, 'voc').make_dataset()

            self.assertEqual(len(VOC.VocTask) * len(subsets),
                len(dataset.sources))
            self.assertEqual(set(subsets), set(dataset.subsets()))
            self.assertEqual(
                sum([len(s) for _, s in subsets.items()]),
                len(dataset))

    def test_can_detect_voc(self):
        with TestDir() as test_dir:
            generate_dummy_voc(test_dir)

            dataset_found = VocImporter.detect(test_dir)

            self.assertTrue(dataset_found)

class VocFormatTest(TestCase):
    def test_can_write_and_parse_labelmap(self):
        src_label_map = VOC.make_voc_label_map()
        src_label_map['qq'] = [None, ['part1', 'part2'], ['act1', 'act2']]
        src_label_map['ww'] = [(10, 20, 30), [], ['act3']]

        with TestDir() as test_dir:
            file_path = osp.join(test_dir, 'test.txt')

            VOC.write_label_map(file_path, src_label_map)
            dst_label_map = VOC.parse_label_map(file_path)

            self.assertEqual(src_label_map, dst_label_map)
