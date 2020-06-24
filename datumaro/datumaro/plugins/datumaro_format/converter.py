
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

# pylint: disable=no-self-use

import json
import numpy as np
import os
import os.path as osp

from datumaro.components.converter import Converter
from datumaro.components.extractor import (
    DEFAULT_SUBSET_NAME, Annotation, _Shape,
    Label, Mask, RleMask, Points, Polygon, PolyLine, Bbox, Caption,
    LabelCategories, MaskCategories, PointsCategories
)
from datumaro.util import cast
from datumaro.util.image import save_image
import pycocotools.mask as mask_utils
from datumaro.components.cli_plugin import CliPlugin

from .format import DatumaroPath


class _SubsetWriter:
    def __init__(self, name, context):
        self._name = name
        self._context = context

        self._data = {
            'info': {},
            'categories': {},
            'items': [],
        }

    @property
    def categories(self):
        return self._data['categories']

    @property
    def items(self):
        return self._data['items']

    def write_item(self, item):
        annotations = []
        item_desc = {
            'id': item.id,
            'annotations': annotations,
        }
        if item.attributes:
            item_desc['attr'] = item.attributes
        if item.path:
            item_desc['path'] = item.path
        if item.has_image:
            path = item.image.path
            if self._context._save_images:
                path = self._context._save_image(item)

            item_desc['image'] = {
                'size': item.image.size,
                'path': path,
            }
        self.items.append(item_desc)

        for ann in item.annotations:
            if isinstance(ann, Label):
                converted_ann = self._convert_label_object(ann)
            elif isinstance(ann, Mask):
                converted_ann = self._convert_mask_object(ann)
            elif isinstance(ann, Points):
                converted_ann = self._convert_points_object(ann)
            elif isinstance(ann, PolyLine):
                converted_ann = self._convert_polyline_object(ann)
            elif isinstance(ann, Polygon):
                converted_ann = self._convert_polygon_object(ann)
            elif isinstance(ann, Bbox):
                converted_ann = self._convert_bbox_object(ann)
            elif isinstance(ann, Caption):
                converted_ann = self._convert_caption_object(ann)
            else:
                raise NotImplementedError()
            annotations.append(converted_ann)

    def write_categories(self, categories):
        for ann_type, desc in categories.items():
            if isinstance(desc, LabelCategories):
                converted_desc = self._convert_label_categories(desc)
            elif isinstance(desc, MaskCategories):
                converted_desc = self._convert_mask_categories(desc)
            elif isinstance(desc, PointsCategories):
                converted_desc = self._convert_points_categories(desc)
            else:
                raise NotImplementedError()
            self.categories[ann_type.name] = converted_desc

    def write(self, save_dir):
        with open(osp.join(save_dir, '%s.json' % (self._name)), 'w') as f:
            json.dump(self._data, f)

    def _convert_annotation(self, obj):
        assert isinstance(obj, Annotation)

        ann_json = {
            'id': cast(obj.id, int),
            'type': cast(obj.type.name, str),
            'attributes': obj.attributes,
            'group': cast(obj.group, int, 0),
        }
        return ann_json

    def _convert_label_object(self, obj):
        converted = self._convert_annotation(obj)

        converted.update({
            'label_id': cast(obj.label, int),
        })
        return converted

    def _convert_mask_object(self, obj):
        converted = self._convert_annotation(obj)

        if isinstance(obj, RleMask):
            rle = obj.rle
        else:
            rle = mask_utils.encode(
                np.require(obj.image, dtype=np.uint8, requirements='F'))

        converted.update({
            'label_id': cast(obj.label, int),
            'rle': {
                # serialize as compressed COCO mask
                'counts': rle['counts'].decode('ascii'),
                'size': list(int(c) for c in rle['size']),
            },
            'z_order': obj.z_order,
        })
        return converted

    def _convert_shape_object(self, obj):
        assert isinstance(obj, _Shape)
        converted = self._convert_annotation(obj)

        converted.update({
            'label_id': cast(obj.label, int),
            'points': [float(p) for p in obj.points],
            'z_order': obj.z_order,
        })
        return converted

    def _convert_polyline_object(self, obj):
        return self._convert_shape_object(obj)

    def _convert_polygon_object(self, obj):
        return self._convert_shape_object(obj)

    def _convert_bbox_object(self, obj):
        converted = self._convert_shape_object(obj)
        converted.pop('points', None)
        converted['bbox'] = [float(p) for p in obj.get_bbox()]
        return converted

    def _convert_points_object(self, obj):
        converted = self._convert_shape_object(obj)

        converted.update({
            'visibility': [int(v.value) for v in obj.visibility],
        })
        return converted

    def _convert_caption_object(self, obj):
        converted = self._convert_annotation(obj)

        converted.update({
            'caption': cast(obj.caption, str),
        })
        return converted

    def _convert_label_categories(self, obj):
        converted = {
            'labels': [],
        }
        for label in obj.items:
            converted['labels'].append({
                'name': cast(label.name, str),
                'parent': cast(label.parent, str),
            })
        return converted

    def _convert_mask_categories(self, obj):
        converted = {
            'colormap': [],
        }
        for label_id, color in obj.colormap.items():
            converted['colormap'].append({
                'label_id': int(label_id),
                'r': int(color[0]),
                'g': int(color[1]),
                'b': int(color[2]),
            })
        return converted

    def _convert_points_categories(self, obj):
        converted = {
            'items': [],
        }
        for label_id, item in obj.items.items():
            converted['items'].append({
                'label_id': int(label_id),
                'labels': [cast(label, str) for label in item.labels],
                'joints': [list(map(int, j)) for j in item.joints],
            })
        return converted

class _Converter:
    def __init__(self, extractor, save_dir, save_images=False):
        self._extractor = extractor
        self._save_dir = save_dir
        self._save_images = save_images

    def convert(self):
        os.makedirs(self._save_dir, exist_ok=True)

        images_dir = osp.join(self._save_dir, DatumaroPath.IMAGES_DIR)
        os.makedirs(images_dir, exist_ok=True)
        self._images_dir = images_dir

        annotations_dir = osp.join(self._save_dir, DatumaroPath.ANNOTATIONS_DIR)
        os.makedirs(annotations_dir, exist_ok=True)
        self._annotations_dir = annotations_dir

        subsets = self._extractor.subsets()
        if len(subsets) == 0:
            subsets = [ None ]
        subsets = [n or DEFAULT_SUBSET_NAME for n in subsets]
        subsets = { name: _SubsetWriter(name, self) for name in subsets }

        for subset, writer in subsets.items():
            writer.write_categories(self._extractor.categories())

        for item in self._extractor:
            subset = item.subset or DEFAULT_SUBSET_NAME
            writer = subsets[subset]

            writer.write_item(item)

        for subset, writer in subsets.items():
            writer.write(annotations_dir)

    def _save_image(self, item):
        image = item.image.data
        if image is None:
            return ''

        filename = item.id + DatumaroPath.IMAGE_EXT
        image_path = osp.join(self._images_dir, filename)
        save_image(image_path, image, create_dir=True)
        return filename

class DatumaroConverter(Converter, CliPlugin):
    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('--save-images', action='store_true',
            help="Save images (default: %(default)s)")
        return parser

    def __init__(self, save_images=False):
        super().__init__()

        self._options = {
            'save_images': save_images,
        }

    def __call__(self, extractor, save_dir):
        converter = _Converter(extractor, save_dir, **self._options)
        converter.convert()


class DatumaroProjectConverter(Converter):
    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('--save-images', action='store_true',
            help="Save images (default: %(default)s)")
        return parser

    def __init__(self, config=None, save_images=False):
        self._config = config
        self._save_images = save_images

    def __call__(self, extractor, save_dir):
        os.makedirs(save_dir, exist_ok=True)

        from datumaro.components.project import Project
        project = Project.generate(save_dir, config=self._config)

        converter = project.env.make_converter('datumaro',
            save_images=self._save_images)
        converter(extractor, save_dir=osp.join(
            project.config.project_dir, project.config.dataset_dir))