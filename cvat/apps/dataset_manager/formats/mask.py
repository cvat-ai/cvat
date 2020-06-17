# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from tempfile import TemporaryDirectory

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (CvatTaskDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive
from datumaro.cli.util import make_file_name
from datumaro.components.project import Dataset
from datumaro.util.mask_tools import generate_colormap

from .registry import dm_env, exporter, importer


@exporter(name='Segmentation mask', ext='ZIP', version='1.1')
def _export(dst_file, task_data, save_images=False):
    extractor = CvatTaskDataExtractor(task_data, include_images=save_images)
    envt = dm_env.transforms
    extractor = extractor.transform(envt.get('polygons_to_masks'))
    extractor = extractor.transform(envt.get('boxes_to_masks'))
    extractor = extractor.transform(envt.get('merge_instance_segments'))
    extractor = Dataset.from_extractors(extractor) # apply lazy transforms
    with TemporaryDirectory() as temp_dir:
        converter = dm_env.make_converter('voc_segmentation',
            apply_colormap=True, label_map=make_colormap(task_data),
            save_images=save_images)
        converter(extractor, save_dir=temp_dir)

        make_zip_archive(temp_dir, dst_file)

@importer(name='Segmentation mask', ext='ZIP', version='1.1')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        dataset = dm_env.make_importer('voc')(tmp_dir).make_dataset()
        masks_to_polygons = dm_env.transforms.get('masks_to_polygons')
        dataset = dataset.transform(masks_to_polygons)
        import_dm_annotations(dataset, task_data)


DEFAULT_COLORMAP_CAPACITY = 2000
DEFAULT_COLORMAP_PATH = osp.join(osp.dirname(__file__), 'predefined_colors.txt')
def parse_default_colors(file_path=None):
    if file_path is None:
        file_path = DEFAULT_COLORMAP_PATH

    colors = {}
    with open(file_path) as f:
        for line in f:
            line = line.strip()
            if not line or line[0] == '#':
                continue
            _, label, color = line.split(':')
            colors[label] = tuple(map(int, color.split(',')))
    return colors

def normalize_label(label):
    label = make_file_name(label) # basically, convert to ASCII lowercase
    label = label.replace('-', '_')
    return label

def make_colormap(task_data):
    labels = sorted([label['name']
        for _, label in task_data.meta['task']['labels']])
    if 'background' not in labels:
        labels.insert(0, 'background')

    predefined = parse_default_colors()

    # NOTE: using pop() to avoid collisions
    colormap = {k: predefined.pop(normalize_label(k), None) for k in labels}

    random_labels = [k for k in labels if not colormap[k]]
    if random_labels:
        colors = generate_colormap(DEFAULT_COLORMAP_CAPACITY + len(random_labels))
        for i, label in enumerate(random_labels):
            colormap[label] = colors[DEFAULT_COLORMAP_CAPACITY + i]
    return {l: [c, [], []] for l, c in colormap.items()}