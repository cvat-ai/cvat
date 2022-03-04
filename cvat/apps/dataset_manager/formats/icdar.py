# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import zipfile
from tempfile import TemporaryDirectory

from datumaro.components.annotation import (AnnotationType, Caption, Label,
    LabelCategories)
from datumaro.components.dataset import Dataset
from datumaro.components.extractor import ItemTransform

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .transformations import RotatedBoxesToPolygons
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
def _export_recognition(dst_file, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data, include_images=save_images), env=dm_env)
    dataset.transform(LabelToCaption)
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'icdar_word_recognition', save_images=save_images)
        make_zip_archive(temp_dir, dst_file)

@importer(name='ICDAR Recognition', ext='ZIP', version='1.0')
def _import(src_file, instance_data, load_data_callback=None):
    with TemporaryDirectory() as tmp_dir:
        zipfile.ZipFile(src_file).extractall(tmp_dir)
        dataset = Dataset.import_from(tmp_dir, 'icdar_word_recognition', env=dm_env)
        dataset.transform(CaptionToLabel, 'icdar')
        if load_data_callback is not None:
            load_data_callback(dataset, instance_data)
        import_dm_annotations(dataset, instance_data)


@exporter(name='ICDAR Localization', ext='ZIP', version='1.0')
def _export_localization(dst_file, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'icdar_text_localization', save_images=save_images)
        make_zip_archive(temp_dir, dst_file)

@importer(name='ICDAR Localization', ext='ZIP', version='1.0')
def _import(src_file, instance_data, load_data_callback=None):
    with TemporaryDirectory() as tmp_dir:
        zipfile.ZipFile(src_file).extractall(tmp_dir)

        dataset = Dataset.import_from(tmp_dir, 'icdar_text_localization', env=dm_env)
        dataset.transform(AddLabelToAnns, 'icdar')
        if load_data_callback is not None:
            load_data_callback(dataset, instance_data)
        import_dm_annotations(dataset, instance_data)


@exporter(name='ICDAR Segmentation', ext='ZIP', version='1.0')
def _export_segmentation(dst_file, instance_data, save_images=False):
    dataset = Dataset.from_extractors(GetCVATDataExtractor(
        instance_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.transform(RotatedBoxesToPolygons)
        dataset.transform('polygons_to_masks')
        dataset.transform('boxes_to_masks')
        dataset.transform('merge_instance_segments')
        dataset.export(temp_dir, 'icdar_text_segmentation', save_images=save_images)
        make_zip_archive(temp_dir, dst_file)

@importer(name='ICDAR Segmentation', ext='ZIP', version='1.0')
def _import(src_file, instance_data, load_data_callback=None):
    with TemporaryDirectory() as tmp_dir:
        zipfile.ZipFile(src_file).extractall(tmp_dir)
        dataset = Dataset.import_from(tmp_dir, 'icdar_text_segmentation', env=dm_env)
        dataset.transform(AddLabelToAnns, 'icdar')
        dataset.transform('masks_to_polygons')
        if load_data_callback is not None:
            load_data_callback(dataset, instance_data)
        import_dm_annotations(dataset, instance_data)
