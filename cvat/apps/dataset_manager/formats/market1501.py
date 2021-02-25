# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import zipfile
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset
from datumaro.components.extractor import AnnotationType, Label, LabelCategories

from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor, \
    import_dm_annotations
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name='Market-1501', ext='ZIP', version='1.0')
def _export(dst_file, task_data, save_images=False):
    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        for item in dataset._data._source:
            anns = [p for p in item.annotations
                if p.type == AnnotationType.label]
            if len(anns) == 1:
                item.attributes = anns[0].attributes
        dataset.export(temp_dir, 'market1501', save_images=save_images)
        make_zip_archive(temp_dir, dst_file)

@importer(name='Market-1501', ext='ZIP', version='1.0')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        zipfile.ZipFile(src_file).extractall(tmp_dir)

        dataset = Dataset.import_from(tmp_dir, 'market1501', env=dm_env)
        for item in dataset._data._source:
            if item.attributes:
                item.annotations.append(Label(label=0,
                    attributes=item.attributes))
                item.attributes = {}
        label_cat = LabelCategories()
        label_cat.add('market-1501')
        dataset._data._source._categories[AnnotationType.label] = label_cat
        import_dm_annotations(dataset, task_data)
