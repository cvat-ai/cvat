from collections import OrderedDict
import numpy as np
import os.path as osp

from unittest import TestCase

from datumaro.components.extractor import (Extractor, DatasetItem,
    AnnotationType, Label, Bbox, Mask, LabelCategories,
)
import datumaro.plugins.voc_format.format as VOC
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
from datumaro.util.image import Image
from datumaro.util.test_utils import TestDir, compare_datasets


class VocFormatTest(TestCase):
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

    def test_can_write_and_parse_labelmap(self):
        src_label_map = VOC.make_voc_label_map()
        src_label_map['qq'] = [None, ['part1', 'part2'], ['act1', 'act2']]
        src_label_map['ww'] = [(10, 20, 30), [], ['act3']]

        with TestDir() as test_dir:
            file_path = osp.join(test_dir, 'test.txt')

            VOC.write_label_map(file_path, src_label_map)
            dst_label_map = VOC.parse_label_map(file_path)

            self.assertEqual(src_label_map, dst_label_map)

class TestExtractorBase(Extractor):
    def _label(self, voc_label):
        return self.categories()[AnnotationType.label].find(voc_label)[0]

    def categories(self):
        return VOC.make_voc_categories()


DUMMY_DATASET_DIR = osp.join(osp.dirname(__file__), 'assets', 'voc_dataset')

class VocImportTest(TestCase):
    def test_can_import(self):
        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id='2007_000001', subset='train',
                        image=Image(path='2007_000001.jpg', size=(20, 10)),
                        annotations=[
                            Label(self._label(l.name))
                            for l in VOC.VocLabel if l.value % 2 == 1
                        ] + [
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
                            ),
                            Bbox(5.5, 6, 2, 2, label=self._label(
                                    VOC.VocBodyPart(1).name),
                                group=2
                            ),
                            Mask(image=np.ones([5, 10]),
                                label=self._label(VOC.VocLabel(2).name),
                                group=1,
                            ),
                        ]
                    ),
                    DatasetItem(id='2007_000002', subset='test',
                        image=np.zeros((20, 10, 3))),
                ])

        dataset = Project.import_from(DUMMY_DATASET_DIR, 'voc').make_dataset()

        compare_datasets(self, DstExtractor(), dataset)

    def test_can_detect_voc(self):
        self.assertTrue(VocImporter.detect(DUMMY_DATASET_DIR))

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
                    DatasetItem(id='a/0', subset='a', annotations=[
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
                    DatasetItem(id='a/1', subset='a', annotations=[
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
                    DatasetItem(id='a/1', subset='a', annotations=[
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
                    DatasetItem(id='a/b/1', subset='a', annotations=[
                        # overlapping masks, the first should be truncated
                        # the second and third are different instances
                        Mask(image=np.array([[0, 0, 0, 1, 0]]), label=3,
                            z_order=3),
                        Mask(image=np.array([[0, 1, 1, 1, 0]]), label=4,
                            z_order=1),
                        Mask(image=np.array([[1, 1, 0, 0, 0]]), label=3,
                            z_order=2),
                    ]),
                ])

        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id='a/b/1', subset='a', annotations=[
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

    def test_can_save_voc_segm_unpainted(self):
        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', annotations=[
                        # overlapping masks, the first should be truncated
                        # the second and third are different instances
                        Mask(image=np.array([[0, 0, 0, 1, 0]]), label=3,
                            z_order=3),
                        Mask(image=np.array([[0, 1, 1, 1, 0]]), label=4,
                            z_order=1),
                        Mask(image=np.array([[1, 1, 0, 0, 0]]), label=3,
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
                VocSegmentationConverter(label_map='voc', apply_colormap=False),
                test_dir, target_dataset=DstExtractor())

    def test_can_save_voc_segm_with_many_instances(self):
        def bit(x, y, shape):
            mask = np.zeros(shape)
            mask[y, x] = 1
            return mask

        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', annotations=[
                        Mask(image=bit(x, y, shape=[10, 10]),
                            label=self._label(VOC.VocLabel(3).name),
                            z_order=10 * y + x + 1
                        )
                        for y in range(10) for x in range(10)
                    ]),
                ])

        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id=1, subset='a', annotations=[
                        Mask(image=bit(x, y, shape=[10, 10]),
                            label=self._label(VOC.VocLabel(3).name),
                            group=10 * y + x + 1
                        )
                        for y in range(10) for x in range(10)
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
                    DatasetItem(id='a/b/1', subset='a', annotations=[
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
                    DatasetItem(id='a/b/1', subset='a', annotations=[
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
                    DatasetItem(id='a/b/1', subset='a', annotations=[
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

    def test_dataset_with_source_labelmap_undefined(self):
        class SrcExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    Bbox(2, 3, 4, 5, label=0, id=1),
                    Bbox(1, 2, 3, 4, label=1, id=2),
                ])

            def categories(self):
                label_cat = LabelCategories()
                label_cat.add('Label_1')
                label_cat.add('label_2')
                return {
                    AnnotationType.label: label_cat,
                }

        class DstExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    Bbox(2, 3, 4, 5, label=self._label('Label_1'),
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
                label_map['Label_1'] = [None, [], []]
                label_map['label_2'] = [None, [], []]
                return VOC.make_voc_categories(label_map)

        with TestDir() as test_dir:
            self._test_save_and_load(
                SrcExtractor(), VocConverter(label_map='source'),
                test_dir, target_dataset=DstExtractor())

    def test_dataset_with_source_labelmap_defined(self):
        class SrcExtractor(TestExtractorBase):
            def __iter__(self):
                yield DatasetItem(id=1, annotations=[
                    Bbox(2, 3, 4, 5, label=0, id=1),
                    Bbox(1, 2, 3, 4, label=2, id=2),
                ])

            def categories(self):
                label_map = OrderedDict()
                label_map['label_1'] = [(1, 2, 3), [], []]
                label_map['background'] = [(0, 0, 0), [], []] # can be not 0
                label_map['label_2'] = [(3, 2, 1), [], []]
                return VOC.make_voc_categories(label_map)

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
                label_map['label_1'] = [(1, 2, 3), [], []]
                label_map['background'] = [(0, 0, 0), [], []]
                label_map['label_2'] = [(3, 2, 1), [], []]
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

    def test_relative_paths(self):
        class TestExtractor(TestExtractorBase):
            def __iter__(self):
                return iter([
                    DatasetItem(id='1', image=np.ones((4, 2, 3))),
                    DatasetItem(id='subdir1/1', image=np.ones((2, 6, 3))),
                    DatasetItem(id='subdir2/1', image=np.ones((5, 4, 3))),
                ])

        with TestDir() as test_dir:
            self._test_save_and_load(TestExtractor(),
                VocConverter(label_map='voc', save_images=True), test_dir)
