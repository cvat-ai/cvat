# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "YOLO",
    "dumpers": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.1",
            "handler": "dump"
        },
    ],
    "loaders": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.1",
            "handler": "load"
        },
    ],
}

def load(file_object, annotations):
    from pyunpack import Archive
    import os.path as osp
    from tempfile import TemporaryDirectory
    from glob import glob
    from datumaro.components.extractor import DatasetItem
    from datumaro.plugins.yolo_format.importer import YoloImporter
    from cvat.apps.dataset_manager.bindings import import_dm_annotations, match_frame

    archive_file = file_object if isinstance(file_object, str) else getattr(file_object, "name")
    with TemporaryDirectory() as tmp_dir:
        Archive(archive_file).extractall(tmp_dir)

        image_info = {}
        anno_files = glob(osp.join(tmp_dir, '**', '*.txt'), recursive=True)
        for filename in anno_files:
            filename = osp.splitext(osp.basename(filename))[0]
            frame_info = None
            try:
                frame_id = match_frame(DatasetItem(id=filename), annotations)
                frame_info = annotations.frame_info[frame_id]
            except Exception:
                pass
            if frame_info is not None:
                image_info[filename] = (frame_info['height'], frame_info['width'])

        dm_project = YoloImporter()(tmp_dir, image_info=image_info)
        dm_dataset = dm_project.make_dataset()
        import_dm_annotations(dm_dataset, annotations)

from datumaro.plugins.yolo_format.converter import \
    YoloConverter as _YoloConverter
class CvatYoloConverter(_YoloConverter):
    NAME = 'cvat_yolo'

def dump(file_object, annotations):
    from cvat.apps.dataset_manager.bindings import CvatAnnotationsExtractor
    from cvat.apps.dataset_manager.util import make_zip_archive
    from tempfile import TemporaryDirectory
    extractor = CvatAnnotationsExtractor('', annotations)
    converter = CvatYoloConverter()
    with TemporaryDirectory() as temp_dir:
        converter(extractor, save_dir=temp_dir)
        make_zip_archive(temp_dir, file_object)
