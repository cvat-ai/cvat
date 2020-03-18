
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
from datumaro.util.image import Image


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
                    item = datumaro.DatasetItem(id=item_id, image=path)
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

    def _is_image(self, path):
        for ext in self._SUPPORTED_FORMATS:
            if osp.isfile(path) and path.endswith(ext):
                return True
        return False


class CvatAnnotationsExtractor(datumaro.Extractor):
    def __init__(self, url, cvat_annotations):
        self._categories = self._load_categories(cvat_annotations)

        dm_annotations = []

        for cvat_frame_anno in cvat_annotations.group_by_frame():
            dm_anno = self._read_cvat_anno(cvat_frame_anno, cvat_annotations)
            dm_image = Image(path=cvat_frame_anno.name, size=(
                cvat_frame_anno.height, cvat_frame_anno.width)
            )
            dm_item = datumaro.DatasetItem(id=cvat_frame_anno.frame,
                annotations=dm_anno, image=dm_image)
            dm_annotations.append((dm_item.id, dm_item))

        dm_annotations = sorted(dm_annotations, key=lambda e: int(e[0]))
        self._items = OrderedDict(dm_annotations)

    def __iter__(self):
        for item in self._items.values():
            yield item

    def __len__(self):
        return len(self._items)

    # pylint: disable=no-self-use
    def subsets(self):
        return []
    # pylint: enable=no-self-use

    def categories(self):
        return self._categories

    @staticmethod
    def _load_categories(cvat_anno):
        categories = {}

        label_categories = datumaro.LabelCategories(
            attributes=['occluded', 'z_order'])

        for _, label in cvat_anno.meta['task']['labels']:
            label_categories.add(label['name'])
            for _, attr in label['attributes']:
                label_categories.attributes.add(attr['name'])

        categories[datumaro.AnnotationType.label] = label_categories

        return categories

    def _read_cvat_anno(self, cvat_frame_anno, cvat_task_anno):
        item_anno = []

        categories = self.categories()
        label_cat = categories[datumaro.AnnotationType.label]
        map_label = lambda name: label_cat.find(name)[0]
        label_attrs = {
            label['name']: label['attributes']
            for _, label in cvat_task_anno.meta['task']['labels']
        }

        def convert_attrs(label, cvat_attrs):
            cvat_attrs = {a.name: a.value for a in cvat_attrs}
            dm_attr = dict()
            for _, a_desc in label_attrs[label]:
                a_name = a_desc['name']
                a_value = cvat_attrs.get(a_name, a_desc['default_value'])
                try:
                    if a_desc['input_type'] == AttributeType.NUMBER:
                        a_value = float(a_value)
                    elif a_desc['input_type'] == AttributeType.CHECKBOX:
                        a_value = (a_value.lower() == 'true')
                    dm_attr[a_name] = a_value
                except Exception as e:
                    raise Exception(
                        "Failed to convert attribute '%s'='%s': %s" %
                        (a_name, a_value, e))
            return dm_attr

        for tag_obj in cvat_frame_anno.tags:
            anno_group = tag_obj.group
            anno_label = map_label(tag_obj.label)
            anno_attr = convert_attrs(tag_obj.label, tag_obj.attributes)

            anno = datumaro.Label(label=anno_label,
                attributes=anno_attr, group=anno_group)
            item_anno.append(anno)

        for shape_obj in cvat_frame_anno.labeled_shapes:
            anno_group = shape_obj.group
            anno_label = map_label(shape_obj.label)
            anno_attr = convert_attrs(shape_obj.label, shape_obj.attributes)
            anno_attr['occluded'] = shape_obj.occluded
            anno_attr['z_order'] = shape_obj.z_order

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
                raise Exception("Unknown shape type '%s'" % shape_obj.type)

            item_anno.append(anno)

        return item_anno


class CvatTaskExtractor(CvatAnnotationsExtractor):
    def __init__(self, url, db_task, user):
        cvat_annotations = TaskAnnotation(db_task.id, user)
        with transaction.atomic():
            cvat_annotations.init_from_db()
        cvat_annotations = Annotation(cvat_annotations.ir_data, db_task)
        super().__init__(url, cvat_annotations)


def match_frame(item, cvat_task_anno):
    is_video = cvat_task_anno.meta['task']['mode'] == 'interpolation'

    frame_number = None
    if frame_number is None:
        try:
            frame_number = cvat_task_anno.match_frame(item.id)
        except Exception:
            pass
    if frame_number is None and item.has_image:
        try:
            frame_number = cvat_task_anno.match_frame(item.image.filename)
        except Exception:
            pass
    if frame_number is None:
        try:
            frame_number = int(item.id)
        except Exception:
            pass
    if frame_number is None and is_video and item.id.startswith('frame_'):
        frame_number = int(item.id[len('frame_'):])
    if not frame_number in cvat_task_anno.frame_info:
        raise Exception("Could not match item id: '%s' with any task frame" %
            item.id)
    return frame_number

def import_dm_annotations(dm_dataset, cvat_task_anno):
    shapes = {
        datumaro.AnnotationType.bbox: ShapeType.RECTANGLE,
        datumaro.AnnotationType.polygon: ShapeType.POLYGON,
        datumaro.AnnotationType.polyline: ShapeType.POLYLINE,
        datumaro.AnnotationType.points: ShapeType.POINTS,
    }

    label_cat = dm_dataset.categories()[datumaro.AnnotationType.label]

    for item in dm_dataset:
        frame_number = match_frame(item, cvat_task_anno)

        # do not store one-item groups
        group_map = { 0: 0 }
        group_size = { 0: 0 }
        for ann in item.annotations:
            if ann.type in shapes:
                group = group_map.get(ann.group)
                if group is None:
                    group = len(group_map)
                    group_map[ann.group] = group
                    group_size[ann.group] = 1
                else:
                    group_size[ann.group] += 1
        group_map = {g: s for g, s in group_size.items()
            if 1 < s and group_map[g]}
        group_map = {g: i for i, g in enumerate([0] + sorted(group_map))}

        for ann in item.annotations:
            if ann.type in shapes:
                cvat_task_anno.add_shape(cvat_task_anno.LabeledShape(
                    type=shapes[ann.type],
                    frame=frame_number,
                    label=label_cat.items[ann.label].name,
                    points=ann.points,
                    occluded=ann.attributes.get('occluded') == True,
                    group=group_map.get(ann.group, 0),
                    attributes=[cvat_task_anno.Attribute(name=n, value=str(v))
                        for n, v in ann.attributes.items()],
                ))
            elif ann.type == datumaro.AnnotationType.label:
                cvat_task_anno.add_tag(cvat_task_anno.Tag(
                    frame=frame_number,
                    label=label_cat.items[ann.label].name,
                    group=group_map.get(ann.group, 0),
                    attributes=[cvat_task_anno.Attribute(name=n, value=str(v))
                        for n, v in ann.attributes.items()],
                ))