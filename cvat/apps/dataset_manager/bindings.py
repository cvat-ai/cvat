
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import os
import os.path as osp

from django.db import transaction

from cvat.apps.annotation.annotation import Annotation
from cvat.apps.engine.annotation import TaskAnnotation
from cvat.apps.engine.models import Task, ShapeType, AttributeType

import datumaro.components.extractor as datumaro
from datumaro.util.image import lazy_image


class CvatImagesDirExtractor(datumaro.Extractor):
    _SUPPORTED_FORMATS = ['.png', '.jpg']

    def __init__(self, url):
        super().__init__()

        items = []
        for (dirpath, _, filenames) in os.walk(url):
            for name in filenames:
                path = osp.join(dirpath, name)
                if self._is_image(path):
                    item_id = Task.get_image_frame(path)
                    item = datumaro.DatasetItem(
                        id=item_id, image=lazy_image(path))
                    items.append((item.id, item))

        items = sorted(items, key=lambda e: int(e[0]))
        items = OrderedDict(items)
        self._items = items

        self._subsets = None

    def __iter__(self):
        for item in self._items.values():
            yield item

    def __len__(self):
        return len(self._items)

    def subsets(self):
        return self._subsets

    def get(self, item_id, subset=None, path=None):
        if path or subset:
            raise KeyError()
        return self._items[item_id]

    def _is_image(self, path):
        for ext in self._SUPPORTED_FORMATS:
            if osp.isfile(path) and path.endswith(ext):
                return True
        return False


class CvatTaskExtractor(datumaro.Extractor):
    def __init__(self, url, db_task, user):
        self._db_task = db_task
        self._categories = self._load_categories()

        cvat_annotations = TaskAnnotation(db_task.id, user)
        with transaction.atomic():
            cvat_annotations.init_from_db()
        cvat_annotations = Annotation(cvat_annotations.ir_data, db_task)

        dm_annotations = []

        for cvat_anno in cvat_annotations.group_by_frame():
            dm_anno = self._read_cvat_anno(cvat_anno)
            dm_item = datumaro.DatasetItem(
                id=cvat_anno.frame, annotations=dm_anno)
            dm_annotations.append((dm_item.id, dm_item))

        dm_annotations = sorted(dm_annotations, key=lambda e: int(e[0]))
        self._items = OrderedDict(dm_annotations)

        self._subsets = None

    def __iter__(self):
        for item in self._items.values():
            yield item

    def __len__(self):
        return len(self._items)

    def subsets(self):
        return self._subsets

    def get(self, item_id, subset=None, path=None):
        if path or subset:
            raise KeyError()
        return self._items[item_id]

    def _load_categories(self):
        categories = {}
        label_categories = datumaro.LabelCategories()

        db_labels = self._db_task.label_set.all()
        for db_label in db_labels:
            db_attributes = db_label.attributespec_set.all()
            label_categories.add(db_label.name)

            for db_attr in db_attributes:
                label_categories.attributes.add(db_attr.name)

        categories[datumaro.AnnotationType.label] = label_categories

        return categories

    def categories(self):
        return self._categories

    def _read_cvat_anno(self, cvat_anno):
        item_anno = []

        categories = self.categories()
        label_cat = categories[datumaro.AnnotationType.label]

        label_map = {}
        label_attrs = {}
        db_labels = self._db_task.label_set.all()
        for db_label in db_labels:
            label_map[db_label.name] = label_cat.find(db_label.name)[0]

            attrs = {}
            db_attributes = db_label.attributespec_set.all()
            for db_attr in db_attributes:
                attrs[db_attr.name] = db_attr
            label_attrs[db_label.name] = attrs
        map_label = lambda label_db_name: label_map[label_db_name]

        def convert_attrs(label, cvat_attrs):
            cvat_attrs = {a.name: a.value for a in cvat_attrs}
            dm_attr = dict()
            for attr_name, attr_spec in label_attrs[label].items():
                attr_value = cvat_attrs.get(attr_name, attr_spec.default_value)
                try:
                    if attr_spec.input_type == AttributeType.NUMBER:
                        attr_value = float(attr_value)
                    elif attr_spec.input_type == AttributeType.CHECKBOX:
                        attr_value = attr_value.lower() == 'true'
                    dm_attr[attr_name] = attr_value
                except Exception as e:
                    slogger.task[self._db_task.id].error(
                        "Failed to convert attribute '%s'='%s': %s" % \
                            (attr_name, attr_value, e))
            return dm_attr

        for tag_obj in cvat_anno.tags:
            anno_group = tag_obj.group
            anno_label = map_label(tag_obj.label)
            anno_attr = convert_attrs(tag_obj.label, tag_obj.attributes)

            anno = datumaro.Label(label=anno_label,
                attributes=anno_attr, group=anno_group)
            item_anno.append(anno)

        for shape_obj in cvat_anno.labeled_shapes:
            anno_group = shape_obj.group
            anno_label = map_label(shape_obj.label)
            anno_attr = convert_attrs(shape_obj.label, shape_obj.attributes)

            anno_points = shape_obj.points
            if shape_obj.type == ShapeType.POINTS:
                anno = datumaro.Points(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            elif shape_obj.type == ShapeType.POLYLINE:
                anno = datumaro.PolyLine(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            elif shape_obj.type == ShapeType.POLYGON:
                anno = datumaro.Polygon(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            elif shape_obj.type == ShapeType.RECTANGLE:
                x0, y0, x1, y1 = anno_points
                anno = datumaro.Bbox(x0, y0, x1 - x0, y1 - y0,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            else:
                raise Exception("Unknown shape type '%s'" % (shape_obj.type))

            item_anno.append(anno)

        return item_anno