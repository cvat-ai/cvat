# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "COCO",
    "dumpers": [
        {
            "display_name": "{name} {format} {version}",
            "format": "JSON",
            "version": "1.0",
            "handler": "dump"
        },
    ],
    "loaders": [
        {
            "display_name": "{name} {format} {version}",
            "format": "JSON",
            "version": "1.0",
            "handler": "load"
        },
    ],
}

def load(file_object, annotations):
    from datumaro.plugins.coco_format.extractor import CocoInstancesExtractor
    from cvat.apps.dataset_manager.bindings import import_dm_annotations

    dm_dataset = CocoInstancesExtractor(file_object.name)
    import_dm_annotations(dm_dataset, annotations)

def dump(file_object, annotations):
    import os.path as osp
    import shutil
    from cvat.apps.dataset_manager.bindings import CvatAnnotationsExtractor
    from datumaro.components.project import Environment
    from tempfile import TemporaryDirectory
    extractor = CvatAnnotationsExtractor('', annotations)
    converter = Environment().make_converter('coco_instances',
        crop_covered=True)
    with TemporaryDirectory() as temp_dir:
        converter(extractor, save_dir=temp_dir)

        # HACK: file_object should not be used this way, however,
        # it is the most efficient way. The correct approach would be to copy
        # file contents.
        file_object.close()
        shutil.move(osp.join(temp_dir, 'annotations', 'instances_default.json'),
            file_object.name)