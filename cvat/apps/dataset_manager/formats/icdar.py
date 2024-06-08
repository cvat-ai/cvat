# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import zipfile

from datumaro.components.annotation import (AnnotationType, Caption, Label,
    LabelCategories)
from datumaro.components.dataset import Dataset
from datumaro.components.extractor import ItemTransform

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .transformations import MaskToPolygonTransformation, RotatedBoxesToPolygons
from .registry import dm_env, exporter, importer


class AddLabelToAnns(ItemTransform):
    def __init__(self, extractor, label):
        super().__init__(extractor)

        assert isinstance(label, str)
        self._categories = {}
        label_cat = self._extractor.categories().get(AnnotationType.label)
        if not label_cat:
            label_cat = LabelCategories()
        self._label = label_cat.add(label)
        self._categories[AnnotationType.label] = label_cat

    def categories(self):
        return self._categories

    def transform_item(self, item):
        annotations = item.annotations
        for ann in annotations:
            if ann.type in [AnnotationType.polygon,
                    AnnotationType.bbox, AnnotationType.mask]:
                ann.label = self._label
        return item.wrap(annotations=annotations)

class CaptionToLabel(ItemTransform):
    def __init__(self, extractor, label):
        super().__init__(extractor)

        assert isinstance(label, str)
        self._categories = {}
        label_cat = self._extractor.categories().get(AnnotationType.label)
        if not label_cat:
            label_cat = LabelCategories()
        self._label = label_cat.add(label)
        self._categories[AnnotationType.label] = label_cat

    def categories(self):
        return self._categories

    def transform_item(self, item):
        annotations = item.annotations
        captions = [ann for ann in annotations
            if ann.type == AnnotationType.caption]
        for ann in captions:
            annotations.append(Label(self._label,
                attributes={'text': ann.caption}))
            annotations.remove(ann)
        return item.wrap(annotations=annotations)

class LabelToCaption(ItemTransform):
    def transform_item(self, item):
        annotations = item.annotations
        anns = [p for p in annotations
            if 'text' in p.attributes]
        for ann in anns:
            annotations.append(Caption(ann.attributes['text']))
            annotations.remove(ann)
        return item.wrap(annotations=annotations)

@exporter(name='ICDAR Recognition', ext='ZIP', version='1.0')
def _export_recognition(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.transform(LabelToCaption)
        dataset.export(temp_dir, 'icdar_word_recognition', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)

@importer(name='ICDAR Recognition', ext='ZIP', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    zipfile.ZipFile(src_file).extractall(temp_dir)

    # We do not run detect_dataset before import because the ICDAR format
    # has problem with the dataset detection in case of empty annotation file(s)
    # Details in: https://github.com/cvat-ai/datumaro/issues/43
    dataset = Dataset.import_from(temp_dir, 'icdar_word_recognition', env=dm_env)
    dataset.transform(CaptionToLabel, label='icdar')
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)


@exporter(name='ICDAR Localization', ext='ZIP', version='1.0')
def _export_localization(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, 'icdar_text_localization', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)

@importer(name='ICDAR Localization', ext='ZIP', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    zipfile.ZipFile(src_file).extractall(temp_dir)

    # We do not run detect_dataset before import because the ICDAR format
    # has problem with the dataset detection in case of empty annotation file(s)
    # Details in: https://github.com/cvat-ai/datumaro/issues/43
    dataset = Dataset.import_from(temp_dir, 'icdar_text_localization', env=dm_env)
    dataset.transform(AddLabelToAnns, label='icdar')
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)


@exporter(name='ICDAR Segmentation', ext='ZIP', version='1.0')
def _export_segmentation(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.transform(RotatedBoxesToPolygons)
        dataset.transform('polygons_to_masks')
        dataset.transform('boxes_to_masks')
        dataset.transform('merge_instance_segments')
        dataset.export(temp_dir, 'icdar_text_segmentation', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)

@importer(name='ICDAR Segmentation', ext='ZIP', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    zipfile.ZipFile(src_file).extractall(temp_dir)

    # We do not run detect_dataset before import because the ICDAR format
    # has problem with the dataset detection in case of empty annotation file(s)
    # Details in: https://github.com/cvat-ai/datumaro/issues/43
    dataset = Dataset.import_from(temp_dir, 'icdar_text_segmentation', env=dm_env)
    dataset.transform(AddLabelToAnns, label='icdar')
    dataset = MaskToPolygonTransformation.convert_dataset(dataset, **kwargs)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
