# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "PASCAL VOC",
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
    from glob import glob
    import os
    import os.path as osp
    import shutil
    from pyunpack import Archive
    from tempfile import TemporaryDirectory
    from datumaro.plugins.voc_format.importer import VocImporter
    from cvat.apps.dataset_manager.bindings import import_dm_annotations

    archive_file = file_object if isinstance(file_object, str) else getattr(file_object, "name")
    with TemporaryDirectory() as tmp_dir:
        Archive(archive_file).extractall(tmp_dir)

        # put label map from the task if not present
        labelmap_file = osp.join(tmp_dir, 'labelmap.txt')
        if not osp.isfile(labelmap_file):
            labels = (label['name'] + ':::'
                for _, label in annotations.meta['task']['labels'])
            with open(labelmap_file, 'w') as f:
                f.write('\n'.join(labels))

        # support flat archive layout
        anno_dir = osp.join(tmp_dir, 'Annotations')
        if not osp.isdir(anno_dir):
            anno_files = glob(osp.join(tmp_dir, '**', '*.xml'), recursive=True)
            subsets_dir = osp.join(tmp_dir, 'ImageSets', 'Main')
            os.makedirs(subsets_dir, exist_ok=True)
            with open(osp.join(subsets_dir, 'train.txt'), 'w') as subset_file:
                for f in anno_files:
                    subset_file.write(osp.splitext(osp.basename(f))[0] + '\n')

            os.makedirs(anno_dir, exist_ok=True)
            for f in anno_files:
                shutil.move(f, anno_dir)

        dm_project = VocImporter()(tmp_dir)
        dm_dataset = dm_project.make_dataset()
        import_dm_annotations(dm_dataset, annotations)

def dump(file_object, annotations):
    from cvat.apps.dataset_manager.bindings import CvatAnnotationsExtractor
    from cvat.apps.dataset_manager.util import make_zip_archive
    from datumaro.components.project import Environment, Dataset
    from tempfile import TemporaryDirectory

    env = Environment()
    id_from_image = env.transforms.get('id_from_image_name')

    extractor = CvatAnnotationsExtractor('', annotations)
    extractor = extractor.transform(id_from_image)
    extractor = Dataset.from_extractors(extractor) # apply lazy transforms
    converter = env.make_converter('voc', label_map='source')
    with TemporaryDirectory() as temp_dir:
        converter(extractor, save_dir=temp_dir)
        make_zip_archive(temp_dir, file_object)