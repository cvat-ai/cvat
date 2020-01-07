import cv2
import numpy as np
import os
import os.path as osp
from xml.etree import ElementTree as ET
import shutil

from unittest import TestCase

from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, BboxObject, LabelCategories,
)
import datumaro.components.formats.voc as VOC
from datumaro.components.extractors.voc import (
    VocClassificationExtractor,
    VocDetectionExtractor,
    VocSegmentationExtractor,
    VocLayoutExtractor,
    VocActionExtractor,
)
from datumaro.components.converters.voc import (
    VocConverter,
    VocClassificationConverter,
    VocDetectionConverter,
    VocLayoutConverter,
    VocActionConverter,
    VocSegmentationConverter,
)
from datumaro.components.importers.voc import VocImporter
from datumaro.components.project import Project
from datumaro.util import find
from datumaro.util.test_utils import TestDir


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
        ET.SubElement(obj1_elem, 'name').text = VOC.VocLabel(1).name
        ET.SubElement(obj1_elem, 'pose').text = VOC.VocPose(1).name
        ET.SubElement(obj1_elem, 'truncated').text = '1'
        ET.SubElement(obj1_elem, 'difficult').text = '0'
        obj1bb_elem = ET.SubElement(obj1_elem, 'bndbox')
        ET.SubElement(obj1bb_elem, 'xmin').text = '1'
        ET.SubElement(obj1bb_elem, 'ymin').text = '2'
        ET.SubElement(obj1bb_elem, 'xmax').text = '3'
        ET.SubElement(obj1bb_elem, 'ymax').text = '4'

        obj2_elem = ET.SubElement(root_elem, 'object')
        ET.SubElement(obj2_elem, 'name').text = VOC.VocLabel.person.name
        obj2bb_elem = ET.SubElement(obj2_elem, 'bndbox')
        ET.SubElement(obj2bb_elem, 'xmin').text = '4'
        ET.SubElement(obj2bb_elem, 'ymin').text = '5'
        ET.SubElement(obj2bb_elem, 'xmax').text = '6'
        ET.SubElement(obj2bb_elem, 'ymax').text = '7'
        obj2head_elem = ET.SubElement(obj2_elem, 'part')
        ET.SubElement(obj2head_elem, 'name').text = VOC.VocBodyPart(1).name
        obj2headbb_elem = ET.SubElement(obj2head_elem, 'bndbox')
        ET.SubElement(obj2headbb_elem, 'xmin').text = '5'
        ET.SubElement(obj2headbb_elem, 'ymin').text = '6'
        ET.SubElement(obj2headbb_elem, 'xmax').text = '7'
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
        cv2.imwrite(osp.join(segm_dir, item + '.png'),
            np.ones([10, 20, 3]) * VOC.VocColormap[2])
        cv2.imwrite(osp.join(inst_dir, item + '.png'),
            np.ones([10, 20, 3]) * VOC.VocColormap[2])

    # Test images
    subset_name = 'test'
    subset = subsets[subset_name]
    for item in subset:
        cv2.imwrite(osp.join(img_dir, item + '.jpg'),
            np.ones([10, 20, 3]))

    return subsets

class VocExtractorTest(TestCase):
    def test_can_load_voc_cls(self):
        with TestDir() as test_dir:
            generated_subsets = generate_dummy_voc(test_dir.path)

            extractor = VocClassificationExtractor(test_dir.path)

            self.assertEqual(len(generated_subsets), len(extractor.subsets()))

            subset_name = 'train'
            generated_subset = generated_subsets[subset_name]
            for id_ in generated_subset:
                parsed_subset = extractor.get_subset(subset_name)
                self.assertEqual(len(generated_subset), len(parsed_subset))

                item = find(parsed_subset, lambda x: x.id == id_)
                self.assertFalse(item is None)

                count = 0
                for label in VOC.VocLabel:
                    if label.value % 2 == 1:
                        count += 1
                        ann = find(item.annotations,
                            lambda x: x.type == AnnotationType.label and \
                                get_label(extractor, x.label) == label.name)
                        self.assertFalse(ann is None)
                self.assertEqual(count, len(item.annotations))

            subset_name = 'test'
            generated_subset = generated_subsets[subset_name]
            for id_ in generated_subset:
                parsed_subset = extractor.get_subset(subset_name)
                self.assertEqual(len(generated_subset), len(parsed_subset))

                item = find(parsed_subset, lambda x: x.id == id_)
                self.assertFalse(item is None)

                self.assertEqual(0, len(item.annotations))

    def test_can_load_voc_det(self):
        with TestDir() as test_dir:
            generated_subsets = generate_dummy_voc(test_dir.path)

            extractor = VocDetectionExtractor(test_dir.path)

            self.assertEqual(len(generated_subsets), len(extractor.subsets()))

            subset_name = 'train'
            generated_subset = generated_subsets[subset_name]
            for id_ in generated_subset:
                parsed_subset = extractor.get_subset(subset_name)
                self.assertEqual(len(generated_subset), len(parsed_subset))

                item = find(parsed_subset, lambda x: x.id == id_)
                self.assertFalse(item is None)

                obj1 = find(item.annotations,
                    lambda x: x.type == AnnotationType.bbox and \
                        get_label(extractor, x.label) == VOC.VocLabel(1).name)
                self.assertFalse(obj1 is None)
                self.assertListEqual([1, 2, 2, 2], obj1.get_bbox())
                self.assertDictEqual(
                    {
                        'pose': VOC.VocPose(1).name,
                        'truncated': True,
                        'occluded': False,
                        'difficult': False,
                    },
                    obj1.attributes)

                obj2 = find(item.annotations,
                    lambda x: x.type == AnnotationType.bbox and \
                        get_label(extractor, x.label) == VOC.VocLabel.person.name)
                self.assertFalse(obj2 is None)
                self.assertListEqual([4, 5, 2, 2], obj2.get_bbox())

                self.assertEqual(2, len(item.annotations))

            subset_name = 'test'
            generated_subset = generated_subsets[subset_name]
            for id_ in generated_subset:
                parsed_subset = extractor.get_subset(subset_name)
                self.assertEqual(len(generated_subset), len(parsed_subset))

                item = find(parsed_subset, lambda x: x.id == id_)
                self.assertFalse(item is None)

                self.assertEqual(0, len(item.annotations))

    def test_can_load_voc_segm(self):
        with TestDir() as test_dir:
            generated_subsets = generate_dummy_voc(test_dir.path)

            extractor = VocSegmentationExtractor(test_dir.path)

            self.assertEqual(len(generated_subsets), len(extractor.subsets()))

            subset_name = 'train'
            generated_subset = generated_subsets[subset_name]
            for id_ in generated_subset:
                parsed_subset = extractor.get_subset(subset_name)
                self.assertEqual(len(generated_subset), len(parsed_subset))

                item = find(parsed_subset, lambda x: x.id == id_)
                self.assertFalse(item is None)

                cls_mask = find(item.annotations,
                    lambda x: x.type == AnnotationType.mask and \
                        x.attributes.get('class') == True)
                self.assertFalse(cls_mask is None)
                self.assertFalse(cls_mask.image is None)

                inst_mask = find(item.annotations,
                    lambda x: x.type == AnnotationType.mask and \
                        x.attributes.get('instances') == True)
                self.assertFalse(inst_mask is None)
                self.assertFalse(inst_mask.image is None)

                self.assertEqual(2, len(item.annotations))

            subset_name = 'test'
            generated_subset = generated_subsets[subset_name]
            for id_ in generated_subset:
                parsed_subset = extractor.get_subset(subset_name)
                self.assertEqual(len(generated_subset), len(parsed_subset))

                item = find(parsed_subset, lambda x: x.id == id_)
                self.assertFalse(item is None)

                self.assertEqual(0, len(item.annotations))

    def test_can_load_voc_layout(self):
        with TestDir() as test_dir:
            generated_subsets = generate_dummy_voc(test_dir.path)

            extractor = VocLayoutExtractor(test_dir.path)

            self.assertEqual(len(generated_subsets), len(extractor.subsets()))

            subset_name = 'train'
            generated_subset = generated_subsets[subset_name]
            for id_ in generated_subset:
                parsed_subset = extractor.get_subset(subset_name)
                self.assertEqual(len(generated_subset), len(parsed_subset))

                item = find(parsed_subset, lambda x: x.id == id_)
                self.assertFalse(item is None)

                obj2 = find(item.annotations,
                    lambda x: x.type == AnnotationType.bbox and \
                        get_label(extractor, x.label) == VOC.VocLabel.person.name)
                self.assertFalse(obj2 is None)
                self.assertListEqual([4, 5, 2, 2], obj2.get_bbox())

                obj2head = find(item.annotations,
                    lambda x: x.type == AnnotationType.bbox and \
                        get_label(extractor, x.label) == VOC.VocBodyPart(1).name)
                self.assertTrue(obj2.id == obj2head.group)
                self.assertListEqual([5, 6, 2, 2], obj2head.get_bbox())

                self.assertEqual(2, len(item.annotations))

            subset_name = 'test'
            generated_subset = generated_subsets[subset_name]
            for id_ in generated_subset:
                parsed_subset = extractor.get_subset(subset_name)
                self.assertEqual(len(generated_subset), len(parsed_subset))

                item = find(parsed_subset, lambda x: x.id == id_)
                self.assertFalse(item is None)

                self.assertEqual(0, len(item.annotations))

    def test_can_load_voc_action(self):
        with TestDir() as test_dir:
            generated_subsets = generate_dummy_voc(test_dir.path)

            extractor = VocActionExtractor(test_dir.path)

            self.assertEqual(len(generated_subsets), len(extractor.subsets()))

            subset_name = 'train'
            generated_subset = generated_subsets[subset_name]
            for id_ in generated_subset:
                parsed_subset = extractor.get_subset(subset_name)
                self.assertEqual(len(generated_subset), len(parsed_subset))

                item = find(parsed_subset, lambda x: x.id == id_)
                self.assertFalse(item is None)

                obj2 = find(item.annotations,
                    lambda x: x.type == AnnotationType.bbox and \
                        get_label(extractor, x.label) == VOC.VocLabel.person.name)
                self.assertFalse(obj2 is None)
                self.assertListEqual([4, 5, 2, 2], obj2.get_bbox())

                for action in VOC.VocAction:
                    attr = obj2.attributes[action.name]
                    self.assertEqual(attr, action.value % 2)

            subset_name = 'test'
            generated_subset = generated_subsets[subset_name]
            for id_ in generated_subset:
                parsed_subset = extractor.get_subset(subset_name)
                self.assertEqual(len(generated_subset), len(parsed_subset))

                item = find(parsed_subset, lambda x: x.id == id_)
                self.assertFalse(item is None)

                self.assertEqual(0, len(item.annotations))

class VocConverterTest(TestCase):
    def _test_can_save_voc(self, src_extractor, converter, test_dir,
            target_extractor=None):
        converter(src_extractor, test_dir)

        result_extractor = VocImporter()(test_dir).make_dataset()
        if target_extractor is None:
            target_extractor = src_extractor

        if AnnotationType.label in target_extractor.categories():
            self.assertEqual(
                target_extractor.categories()[AnnotationType.label].items,
                result_extractor.categories()[AnnotationType.label].items)
        if AnnotationType.mask in target_extractor.categories():
            self.assertEqual(
                target_extractor.categories()[AnnotationType.mask].colormap,
                result_extractor.categories()[AnnotationType.mask].colormap)

        self.assertEqual(len(target_extractor), len(result_extractor))
        for item_a, item_b in zip(target_extractor, result_extractor):
            self.assertEqual(item_a.id, item_b.id)
            self.assertEqual(len(item_a.annotations), len(item_b.annotations))
            for ann_a, ann_b in zip(item_a.annotations, item_b.annotations):
                self.assertEqual(ann_a.type, ann_b.type)

    def _test_can_save_voc_dummy(self, extractor_type, converter, test_dir):
        dummy_dir = osp.join(test_dir, 'dummy')
        generate_dummy_voc(dummy_dir)
        gen_extractor = extractor_type(dummy_dir)

        self._test_can_save_voc(gen_extractor, converter,
            osp.join(test_dir, 'converted'))

    def test_can_save_voc_cls(self):
        with TestDir() as test_dir:
            self._test_can_save_voc_dummy(
                VocClassificationExtractor, VocClassificationConverter(label_map='voc'),
                test_dir.path)

    def test_can_save_voc_det(self):
        with TestDir() as test_dir:
            self._test_can_save_voc_dummy(
                VocDetectionExtractor, VocDetectionConverter(label_map='voc'),
                test_dir.path)

    def test_can_save_voc_segm(self):
        with TestDir() as test_dir:
            self._test_can_save_voc_dummy(
                VocSegmentationExtractor, VocSegmentationConverter(label_map='voc'),
                test_dir.path)

    def test_can_save_voc_layout(self):
        with TestDir() as test_dir:
            self._test_can_save_voc_dummy(
                VocLayoutExtractor, VocLayoutConverter(label_map='voc'),
                test_dir.path)

    def test_can_save_voc_action(self):
        with TestDir() as test_dir:
            self._test_can_save_voc_dummy(
                VocActionExtractor, VocActionConverter(label_map='voc'),
                test_dir.path)

    def test_can_save_dataset_with_no_subsets(self):
        class TestExtractor(Extractor):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, annotations=[
                        BboxObject(2, 3, 4, 5, label=2, id=1),
                        BboxObject(2, 3, 4, 5, label=3, id=2),
                    ]),

                    DatasetItem(id=2, annotations=[
                        BboxObject(5, 4, 6, 5, label=3, id=1),
                    ]),
                ])

            def categories(self):
                return VOC.make_voc_categories()

        with TestDir() as test_dir:
            self._test_can_save_voc(TestExtractor(), VocConverter(label_map='voc'),
                test_dir.path)

    def test_dataset_with_voc_labelmap(self):
        class SrcExtractor(Extractor):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                        BboxObject(2, 3, 4, 5, label=0, id=1),
                        BboxObject(1, 2, 3, 4, label=1, id=2),
                    ])

            def categories(self):
                label_cat = LabelCategories()
                label_cat.add(VOC.VocLabel(1).name)
                label_cat.add('non_voc_label')
                return {
                    AnnotationType.label: label_cat,
                }

        class DstExtractor(Extractor):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                        BboxObject(2, 3, 4, 5, label=0, id=1),
                    ])

            def categories(self):
                return VOC.make_voc_categories()

        with TestDir() as test_dir:
            self._test_can_save_voc(
                SrcExtractor(), VocConverter(label_map='voc'),
                test_dir.path, target_extractor=DstExtractor())

    def test_dataset_with_guessed_labelmap(self):
        class SrcExtractor(Extractor):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                        BboxObject(2, 3, 4, 5, label=0, id=1),
                        BboxObject(1, 2, 3, 4, label=1, id=2),
                    ])

            def categories(self):
                label_cat = LabelCategories()
                label_cat.add(VOC.VocLabel(1).name)
                label_cat.add('non_voc_label')
                return {
                    AnnotationType.label: label_cat,
                }

        class DstExtractor(Extractor):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                        BboxObject(2, 3, 4, 5, label=0, id=1),
                        BboxObject(1, 2, 3, 4,
                            label=self.categories()[AnnotationType.label] \
                                .find('non_voc_label')[0], id=2),
                    ])

            def categories(self):
                label_map = VOC.make_voc_label_map()
                label_map['non_voc_label'] = [None, [], []]
                for label_desc in label_map.values():
                    label_desc[0] = None # rebuild colormap
                return VOC.make_voc_categories(label_map)

        with TestDir() as test_dir:
            self._test_can_save_voc(
                SrcExtractor(), VocConverter(label_map='guess'),
                test_dir.path, target_extractor=DstExtractor())

    def test_dataset_with_fixed_labelmap(self):
        class SrcExtractor(Extractor):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                        BboxObject(2, 3, 4, 5, label=0, id=1),
                        BboxObject(1, 2, 3, 4, label=1, id=2, group=2,
                            attributes={'act1': True}),
                        BboxObject(2, 3, 4, 5, label=2, id=3, group=2),
                        BboxObject(2, 3, 4, 6, label=3, id=4, group=2),
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

        class DstExtractor(Extractor):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                        BboxObject(1, 2, 3, 4, label=0, id=2, group=2,
                            attributes={'act1': True, 'act2': False}),
                        BboxObject(2, 3, 4, 5, label=1, id=3, group=2),
                        BboxObject(2, 3, 4, 6, label=2, id=4, group=2),
                    ])

            def categories(self):
                return VOC.make_voc_categories(label_map)

        with TestDir() as test_dir:
            self._test_can_save_voc(
                SrcExtractor(), VocConverter(label_map=label_map),
                test_dir.path, target_extractor=DstExtractor())

class VocImporterTest(TestCase):
    def test_can_import(self):
        with TestDir() as test_dir:
            dummy_dir = osp.join(test_dir.path, 'dummy')
            subsets = generate_dummy_voc(dummy_dir)

            dataset = Project.import_from(dummy_dir, 'voc').make_dataset()

            self.assertEqual(len(VOC.VocTask), len(dataset.sources))
            self.assertEqual(set(subsets), set(dataset.subsets()))
            self.assertEqual(
                sum([len(s) for _, s in subsets.items()]),
                len(dataset))

class VocFormatTest(TestCase):
    def test_can_write_and_parse_labelmap(self):
        src_label_map = VOC.make_voc_label_map()
        src_label_map['qq'] = [None, ['part1', 'part2'], ['act1', 'act2']]

        with TestDir() as test_dir:
            file_path = osp.join(test_dir.path, 'test.txt')

            VOC.write_label_map(file_path, src_label_map)
            dst_label_map = VOC.parse_label_map(file_path)

            self.assertEqual(src_label_map, dst_label_map)