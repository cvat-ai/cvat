# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import zipfile

from datumaro.components.annotation import (AnnotationType, Label,
    LabelCategories)
from datumaro.components.dataset import Dataset
from datumaro.components.extractor import ItemTransform

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor, detect_dataset,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer

class AttrToLabelAttr(ItemTransform):
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
        annotations = list(item.annotations)
        attributes = item.attributes
        if item.attributes:
            annotations.append(Label(self._label, attributes=item.attributes))
            attributes = {}
        return item.wrap(annotations=annotations, attributes=attributes)

class LabelAttrToAttr(ItemTransform):
    def __init__(self, extractor, label):
        super().__init__(extractor)

        assert isinstance(label, str)
        label_cat = self._extractor.categories().get(AnnotationType.label)
        self._label = label_cat.find(label)[0]

    def transform_item(self, item):
        annotations = list(item.annotations)
        attributes = dict(item.attributes)
        if self._label is not None:
            labels = [ann for ann in annotations
                if ann.type == AnnotationType.label \
                    and ann.label == self._label]
            if len(labels) == 1:
                attributes.update(labels[0].attributes)
                annotations.remove(labels[0])
        return item.wrap(annotations=annotations, attributes=attributes)


@exporter(name='Market-1501', ext='ZIP', version='1.0')
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)

        dataset.transform(LabelAttrToAttr, label='market-1501')
        dataset.export(temp_dir, 'market1501', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)

@importer(name='Market-1501', ext='ZIP', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    zipfile.ZipFile(src_file).extractall(temp_dir)

    detect_dataset(temp_dir, format_name='market1501', importer=dm_env.importers.get('market1501'))
    dataset = Dataset.import_from(temp_dir, 'market1501', env=dm_env)
    dataset.transform(AttrToLabelAttr, label='market-1501')
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)
