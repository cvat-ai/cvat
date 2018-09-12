
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import copy
from django.utils import timezone
from collections import OrderedDict
import numpy as np
from scipy.optimize import linear_sum_assignment
from collections import OrderedDict
from distutils.util import strtobool
from xml.dom import minidom
from xml.sax.saxutils import XMLGenerator
from abc import ABCMeta, abstractmethod
from PIL import Image

import django_rq
from django.conf import settings
from django.db import transaction

from . import models
from .task import get_frame_path, get_image_meta_cache
from .logging import task_logger, job_logger

############################# Low Level server API

FORMAT_XML = 1
FORMAT_JSON = 2

def dump(tid, data_format, scheme, host):
    """
    Dump annotation for the task in specified data format.
    """
    queue = django_rq.get_queue('default')
    queue.enqueue_call(func=_dump, args=(tid, data_format, scheme, host),
        job_id="annotation.dump/{}".format(tid))

def check(tid):
    """
    Check that potentialy long operation 'dump' is completed.
    Return the status as json/dictionary object.
    """
    queue = django_rq.get_queue('default')
    job = queue.fetch_job("annotation.dump/{}".format(tid))
    if job is None:
        response = {"state": "unknown"}
    elif job.is_failed:
        # FIXME: here we have potential race. In general job.exc_info is
        # initialized inside handler but the method can be called before
        # that. By a reason exc_info isn't initialized by RQ python.
        response = {
            "state": "error",
            "stderr": job.exc_info}
    elif job.is_finished:
        response = {"state": "created"}
    else:
        response = {"state": "started"}

    return response

@transaction.atomic
def get(jid):
    """
    Get annotations for the job.
    """
    db_job = models.Job.objects.select_for_update().get(id=jid)
    annotation = _AnnotationForJob(db_job)
    annotation.init_from_db()

    return annotation.to_client()

@transaction.atomic
def save_job(jid, data):
    """
    Save new annotations for the job.
    """
    db_job = models.Job.objects.select_for_update().get(id=jid)
    annotation = _AnnotationForJob(db_job)
    annotation.init_from_client(data)
    annotation.save_to_db()
    db_job.segment.task.updated_date = timezone.now()
    db_job.segment.task.save()

# pylint: disable=unused-argument
def save_task(tid, data):
    """
    Save new annotations for the task.
    """
    db_task = models.Task.objects.get(id=tid)
    db_segments = list(db_task.segment_set.prefetch_related('job_set').all())

    splitted_data = {}

    for segment in db_segments:
        jid = segment.job_set.first().id
        start = segment.start_frame
        stop = segment.stop_frame
        splitted_data[jid] = {
            "boxes": list(filter(lambda x: start <= int(x['frame']) <= stop, data['boxes'])),
            "polygons": list(filter(lambda x: start <= int(x['frame']) <= stop, data['polygons'])),
            "polylines": list(filter(lambda x: start <= int(x['frame']) <= stop, data['polylines'])),
            "points": list(filter(lambda x: start <= int(x['frame']) <= stop, data['points'])),
            "box_paths": list(filter(lambda x: len(list(filter(lambda y: (start <= int(y['frame']) <= stop) and (not y['outside']), x['shapes']))), data['box_paths'])),
            "polygon_paths": list(filter(lambda x: len(list(filter(lambda y: (start <= int(y['frame']) <= stop) and (not y['outside']), x['shapes']))), data['polygon_paths'])),
            "polyline_paths": list(filter(lambda x: len(list(filter(lambda y: (start <= int(y['frame']) <= stop) and (not y['outside']), x['shapes']))), data['polyline_paths'])),
            "points_paths": list(filter(lambda x: len(list(filter(lambda y: (start <= int(y['frame']) <= stop) and (not y['outside']), x['shapes']))), data['points_paths'])),
        }

    for jid, _data in splitted_data.items():
        save_job(jid, _data)

# pylint: disable=unused-argument
def rq_handler(job, exc_type, exc_value, traceback):
    tid = job.id.split('/')[1]
    task_logger[tid].error("dump annotation error was occured", exc_info=True)

##################################################

class _Label:
    def __init__(self, db_label):
        self.id = db_label.id
        self.name = db_label.name

class _Attribute:
    def __init__(self, db_attr, value):
        self.id = db_attr.id
        self.name = db_attr.get_name()
        if db_attr.get_type() == 'checkbox':
            self.value = str(value).lower()
        else:
            self.value = str(value)

class _BoundingBox:
    def __init__(self, x0, y0, x1, y1, frame, occluded, z_order, attributes=None):
        self.xtl = x0
        self.ytl = y0
        self.xbr = x1
        self.ybr = y1
        self.occluded = occluded
        self.z_order = z_order
        self.frame = frame
        self.attributes = attributes if attributes else []

    def merge(self, box):
        # The occluded property and attributes cannot be merged. Let's keep
        # original attributes and occluded property of the self object.
        assert self.frame == box.frame
        self.xtl = (self.xtl + box.xtl) / 2
        self.ytl = (self.ytl + box.ytl) / 2
        self.xbr = (self.xbr + box.xbr) / 2
        self.ybr = (self.ybr + box.ybr) / 2

    def add_attribute(self, attr):
        self.attributes.append(attr)

class _LabeledBox(_BoundingBox):
    def __init__(self, label, x0, y0, x1, y1, frame, group_id, occluded, z_order, attributes=None):
        super().__init__(x0, y0, x1, y1, frame, occluded, z_order, attributes)
        self.label = label
        self.group_id = group_id

class _TrackedBox(_BoundingBox):
    def __init__(self, x0, y0, x1, y1, frame, occluded, z_order, outside, attributes=None):
        super().__init__(x0, y0, x1, y1, frame, occluded, z_order, attributes)
        self.outside = outside

class _InterpolatedBox(_TrackedBox):
    def __init__(self, x0, y0, x1, y1, frame, occluded, z_order, outside, keyframe, attributes=None):
        super().__init__(x0, y0, x1, y1, frame, occluded, z_order, outside, attributes)
        self.keyframe = keyframe

class _PolyShape:
    def __init__(self, points, frame, occluded, z_order, attributes=None):
        self.points = points
        self.occluded = occluded
        self.z_order = z_order
        self.frame = frame
        self.attributes = attributes if attributes else []

    def add_attribute(self, attr):
        self.attributes.append(attr)

class _LabeledPolyShape(_PolyShape):
    def __init__(self, label, points, frame, group_id, occluded, z_order, attributes=None):
        super().__init__(points, frame, occluded, z_order, attributes)
        self.label = label
        self.group_id = group_id

class _TrackedPolyShape(_PolyShape):
    def __init__(self, points, frame, occluded, z_order, outside, attributes=None):
        super().__init__(points, frame, occluded, z_order, attributes)
        self.outside = outside

class _InterpolatedPolyShape(_TrackedPolyShape):
    def __init__(self, points, frame, occluded, z_order, outside, keyframe, attributes=None):
        super().__init__(points, frame, occluded, z_order, outside, attributes)
        self.keyframe = keyframe

class _BoxPath:
    def __init__(self, label, start_frame, stop_frame, group_id, boxes=None, attributes=None):
        self.label = label
        self.frame = start_frame
        self.group_id = group_id
        self.stop_frame = stop_frame
        self.boxes = boxes if boxes else []
        self.attributes = attributes if attributes else []
        self._interpolated_boxes = []
        assert not self.boxes or self.boxes[-1].frame <= self.stop_frame

    def add_box(self, box):
        self.boxes.append(box)

    def get_interpolated_boxes(self):
        if not self._interpolated_boxes:
            self._init_interpolated_boxes()

        return self._interpolated_boxes

    def _init_interpolated_boxes(self):
        assert self.boxes[-1].frame <= self.stop_frame

        boxes = []
        stop_box = copy.copy(self.boxes[-1])
        stop_box.frame = self.stop_frame + 1
        attributes = {}
        for box0, box1 in zip(self.boxes, self.boxes[1:] + [stop_box]):
            assert box0.frame < box1.frame

            distance = float(box1.frame - box0.frame)
            delta_xtl = (box1.xtl - box0.xtl) / distance
            delta_ytl = (box1.ytl - box0.ytl) / distance
            delta_xbr = (box1.xbr - box0.xbr) / distance
            delta_ybr = (box1.ybr - box0.ybr) / distance

            # New box doesn't have all attributes (only first one does).
            # Thus it is necessary to propagate them.
            for attr in box0.attributes:
                attributes[attr.id] = attr

            for frame in range(box0.frame, box1.frame):
                off = frame - box0.frame
                xtl = box0.xtl + delta_xtl * off
                ytl = box0.ytl + delta_ytl * off
                xbr = box0.xbr + delta_xbr * off
                ybr = box0.ybr + delta_ybr * off

                box = _InterpolatedBox(xtl, ytl, xbr, ybr, frame, box0.occluded, box0.z_order,
                    box0.outside, box0.frame == frame, list(attributes.values()))
                boxes.append(box)

                if box0.outside:
                    break

        self._interpolated_boxes = boxes

    def merge(self, path):
        assert self.label.id == path.label.id
        boxes = {box.frame:box for box in self.boxes}
        for box in path.boxes:
            if box.frame in boxes:
                boxes[box.frame].merge(box)
            else:
                boxes[box.frame] = box

        self.frame = min(self.frame, path.frame)
        self.stop_frame = max(self.stop_frame, path.stop_frame)
        self.boxes = list(sorted(boxes.values(), key=lambda box: box.frame))
        self._interpolated_boxes = []

    def add_attribute(self, attr):
        self.attributes.append(attr)

class _PolyPath:
    def __init__(self, label, start_frame, stop_frame, group_id, shapes=None, attributes=None):
        self.label = label
        self.frame = start_frame
        self.group_id = group_id
        self.stop_frame = stop_frame
        self.shapes = shapes if shapes else []
        self.attributes = attributes if attributes else []
        self._interpolated_shapes = []   # ???

    def add_shape(self, shape):
        self.shapes.append(shape)

    def get_interpolated_shapes(self):
        if not self._interpolated_shapes:
            self._init_interpolated_shapes()

        return self._interpolated_shapes

    def _init_interpolated_shapes(self):
        assert self.shapes[-1].frame <= self.stop_frame
        self._interpolated_shapes = []
        shapes = {shape.frame: shape for shape in self.shapes}
        outside = False
        attributes = {}
        for frame in range(self.frame, self.stop_frame + 1):
            if frame in shapes:
                for attr in shapes[frame].attributes:
                    attributes[attr.id] = attr
                shape = _InterpolatedPolyShape(shapes[frame].points, frame,
                    shapes[frame].occluded, shapes[frame].z_order, shapes[frame].outside, True, list(attributes.values()))
                outside = shape.outside
                self._interpolated_shapes.append(shape)
            elif not outside:
                shape = _InterpolatedPolyShape(self._interpolated_shapes[-1].points, frame, False,
                    0, True, True, list(attributes.values()))
                outside = shape.outside
                self._interpolated_shapes.append(shape)

    def merge(self, path):
        pass

    def add_attribute(self, attr):
        self.attributes.append(attr)

class _Annotation:
    def __init__(self, start_frame, stop_frame):
        self.start_frame = start_frame
        self.stop_frame = stop_frame
        self.reset()

    def reset(self):
        self.boxes = []
        self.box_paths = []
        self.polygons = []
        self.polygon_paths = []
        self.polylines = []
        self.polyline_paths = []
        self.points = []
        self.points_paths = []

    # Functions below used by dump functionality
    def to_boxes(self):
        boxes = []
        for path in self.box_paths:
            for box in path.get_interpolated_boxes():
                if not box.outside:
                    box = _LabeledBox(path.label, box.xtl, box.ytl, box.xbr, box.ybr,
                        box.frame, path.group_id, box.occluded, box.z_order, box.attributes + path.attributes)
                    boxes.append(box)

        return self.boxes + boxes

    def _to_poly_shapes(self, iter_attr_name):
        shapes = []
        for path in getattr(self, iter_attr_name):
            for shape in path.get_interpolated_shapes():
                if not shape.outside:
                    shape = _LabeledPolyShape(path.label, shape.points, shape.frame, path.group_id,
                        shape.occluded, shape.z_order, shape.attributes + path.attributes)
                    shapes.append(shape)
        return shapes

    def to_polygons(self):
        return self._to_poly_shapes('polygon_paths') + self.polygons

    def to_polylines(self):
        return self._to_poly_shapes('polyline_paths') + self.polylines

    def to_points(self):
        return self._to_poly_shapes('points_paths') + self.points

    def to_box_paths(self):
        paths = []
        for box in self.boxes:
            box0 = _InterpolatedBox(box.xtl, box.ytl, box.xbr, box.ybr, box.frame,
                box.occluded, box.z_order, False, True)
            box1 = copy.copy(box0)
            box1.outside = True
            box1.frame += 1
            path = _BoxPath(box.label, box.frame, box.frame + 1, box.group_id, [box0, box1], box.attributes)
            paths.append(path)

        return self.box_paths + paths


    def _to_poly_paths(self, iter_attr_name):
        paths = []
        for shape in getattr(self, iter_attr_name):
            shape0 = _InterpolatedPolyShape(shape.points, shape.frame, shape.occluded, shape.z_order, False, True)
            shape1 = copy.copy(shape0)
            shape1.outside = True
            shape1.frame += 1
            path = _PolyPath(shape.label, shape.frame, shape.frame + 1, shape.group_id, [shape0, shape1], shape.attributes)
            paths.append(path)

        return paths

    def to_polygon_paths(self):
        return self._to_poly_paths('polygons') + self.polygon_paths

    def to_polyline_paths(self):
        return self._to_poly_paths('polylines') + self.polyline_paths

    def to_points_paths(self):
        return self._to_poly_paths('points') + self.points_paths


class _AnnotationForJob(_Annotation):
    def __init__(self, db_job):
        db_segment = db_job.segment
        super().__init__(db_segment.start_frame, db_segment.stop_frame)

        # pylint: disable=bad-continuation
        self.db_job = db_job
        self.logger = job_logger[db_job.id]
        self.db_labels = {db_label.id:db_label
            for db_label in db_job.segment.task.label_set.all()}
        self.db_attributes = {db_attr.id:db_attr
            for db_attr in models.AttributeSpec.objects.filter(
                label__task__id=db_job.segment.task.id)}

    def _merge_table_rows(self, rows, keys_for_merge, field_id):
        """dot.notation access to dictionary attributes"""
        class dotdict(OrderedDict):
            __getattr__ = OrderedDict.get
            __setattr__ = OrderedDict.__setitem__
            __delattr__ = OrderedDict.__delitem__
            __eq__ = lambda self, other: self.id == other.id
            __hash__ = lambda self: self.id

        # It is necessary to keep a stable order of original rows
        # (e.g. for tracked boxes). Otherwise prev_box.frame can be bigger
        # than next_box.frame.
        merged_rows = OrderedDict()

        # Group all rows by field_id. In grouped rows replace fields in
        # accordance with keys_for_merge structure.
        for row in rows:
            row_id = row[field_id]
            if not row_id in merged_rows:
                merged_rows[row_id] = dotdict(row)
                for key in keys_for_merge:
                    merged_rows[row_id][key] = []

            for key in keys_for_merge:
                item = dotdict({v.split('__', 1)[-1]:row[v] for v in keys_for_merge[key]})
                if item.id:
                    merged_rows[row_id][key].append(item)

        # Remove redundant keys from final objects
        redundant_keys = [item for values in keys_for_merge.values() for item in values]
        for i in merged_rows:
            for j in redundant_keys:
                del merged_rows[i][j]

        return list(merged_rows.values())

    def _clamp_box(self, xtl, ytl, xbr, ybr, im_size):
        xtl = max(min(xtl, im_size['width']), 0)
        ytl = max(min(ytl, im_size['height']), 0)
        xbr = max(min(xbr, im_size['width']), 0)
        ybr = max(min(ybr, im_size['height']), 0)
        return xtl, ytl, xbr, ybr

    def _clamp_poly(self, points, im_size):
        verified = []
        points = points.split(' ')
        for p in points:
            p = p.split(',')
            verified.append('{},{}'.format(
                max(min(float(p[0]), im_size['width']), 0),
                max(min(float(p[1]), im_size['height']), 0)
            ))
        return ' '.join(verified)

    def init_from_db(self):
        def get_values(shape_type):
            if shape_type == 'polygons':
                return [
                    ('id', 'frame', 'points', 'label_id', 'group_id', 'occluded', 'z_order',
                    'labeledpolygonattributeval__value', 'labeledpolygonattributeval__spec_id',
                    'labeledpolygonattributeval__id'), {
                        'attributes': [
                            'labeledpolygonattributeval__value',
                            'labeledpolygonattributeval__spec_id',
                            'labeledpolygonattributeval__id'
                        ]
                    }, 'labeledpolygonattributeval_set'
                ]
            elif shape_type == 'polylines':
                return [
                    ('id', 'frame', 'points', 'label_id', 'group_id', 'occluded', 'z_order',
                    'labeledpolylineattributeval__value', 'labeledpolylineattributeval__spec_id',
                    'labeledpolylineattributeval__id'), {
                        'attributes': [
                            'labeledpolylineattributeval__value',
                            'labeledpolylineattributeval__spec_id',
                            'labeledpolylineattributeval__id'
                        ]
                    }, 'labeledpolylineattributeval_set'
                ]
            elif shape_type == 'boxes':
                return [
                    ('id', 'frame', 'xtl', 'ytl', 'xbr', 'ybr', 'label_id', 'group_id', 'occluded', 'z_order',
                    'labeledboxattributeval__value', 'labeledboxattributeval__spec_id',
                    'labeledboxattributeval__id'), {
                        'attributes': [
                            'labeledboxattributeval__value',
                            'labeledboxattributeval__spec_id',
                            'labeledboxattributeval__id'
                        ]
                    }, 'labeledboxattributeval_set'
                ]
            elif shape_type == 'points':
                return [
                    ('id', 'frame', 'points', 'label_id', 'group_id', 'occluded', 'z_order',
                    'labeledpointsattributeval__value', 'labeledpointsattributeval__spec_id',
                    'labeledpointsattributeval__id'), {
                        'attributes': [
                            'labeledpointsattributeval__value',
                            'labeledpointsattributeval__spec_id',
                            'labeledpointsattributeval__id'
                        ]
                    }, 'labeledpointsattributeval_set'
                ]

        self.reset()
        for shape_type in ['boxes', 'points', 'polygons', 'polylines']:
            (values, merge_keys, prefetch) = get_values(shape_type)
            db_shapes = list(self._get_shape_set(shape_type).prefetch_related(prefetch).
                values(*values).order_by('frame'))
            db_shapes = self._merge_table_rows(db_shapes, merge_keys, 'id')
            for db_shape in db_shapes:
                label = _Label(self.db_labels[db_shape.label_id])
                if shape_type == 'boxes':
                    shape = _LabeledBox(label, db_shape.xtl, db_shape.ytl, db_shape.xbr, db_shape.ybr,
                        db_shape.frame, db_shape.group_id, db_shape.occluded, db_shape.z_order)
                else:
                    shape = _LabeledPolyShape(label, db_shape.points, db_shape.frame,
                        db_shape.group_id, db_shape.occluded, db_shape.z_order)
                for db_attr in db_shape.attributes:
                    if db_attr.id != None:
                        spec = self.db_attributes[db_attr.spec_id]
                        attr = _Attribute(spec, db_attr.value)
                        shape.add_attribute(attr)
                getattr(self, shape_type).append(shape)



        db_paths = self.db_job.objectpath_set
        for shape in ['trackedpoints_set', 'trackedbox_set', 'trackedpolyline_set', 'trackedpolygon_set']:
            db_paths.prefetch_related(shape)
        for shape_attr in ['trackedpoints_set__trackedpointsattributeval_set', 'trackedbox_set__trackedboxattributeval_set',
            'trackedpolygon_set__trackedpolygonattributeval_set', 'trackedpolyline_set__trackedpolylineattributeval_set']:
            db_paths.prefetch_related(shape_attr)
        db_paths.prefetch_related('objectpathattributeval_set')
        db_paths = list (db_paths.values('id', 'frame', 'group_id', 'shapes', 'objectpathattributeval__spec_id',
            'objectpathattributeval__id', 'objectpathattributeval__value',
            'trackedbox', 'trackedpolygon', 'trackedpolyline', 'trackedpoints',
            'trackedbox__id', 'label_id', 'trackedbox__xtl', 'trackedbox__ytl',
            'trackedbox__xbr', 'trackedbox__ybr', 'trackedbox__frame', 'trackedbox__occluded',
            'trackedbox__z_order','trackedbox__outside', 'trackedbox__trackedboxattributeval__spec_id',
            'trackedbox__trackedboxattributeval__value', 'trackedbox__trackedboxattributeval__id',
            'trackedpolygon__id' ,'trackedpolygon__points', 'trackedpolygon__frame', 'trackedpolygon__occluded',
            'trackedpolygon__z_order', 'trackedpolygon__outside', 'trackedpolygon__trackedpolygonattributeval__spec_id',
            'trackedpolygon__trackedpolygonattributeval__value', 'trackedpolygon__trackedpolygonattributeval__id',
            'trackedpolyline__id', 'trackedpolyline__points', 'trackedpolyline__frame', 'trackedpolyline__occluded',
            'trackedpolyline__z_order', 'trackedpolyline__outside', 'trackedpolyline__trackedpolylineattributeval__spec_id',
            'trackedpolyline__trackedpolylineattributeval__value', 'trackedpolyline__trackedpolylineattributeval__id',
            'trackedpoints__id', 'trackedpoints__points', 'trackedpoints__frame', 'trackedpoints__occluded',
            'trackedpoints__z_order', 'trackedpoints__outside', 'trackedpoints__trackedpointsattributeval__spec_id',
            'trackedpoints__trackedpointsattributeval__value', 'trackedpoints__trackedpointsattributeval__id')
            .order_by('id', 'trackedbox__frame', 'trackedpolygon__frame', 'trackedpolyline__frame', 'trackedpoints__frame'))

        db_box_paths = list(filter(lambda path: path['shapes'] == 'boxes', db_paths ))
        db_polygon_paths = list(filter(lambda path: path['shapes'] == 'polygons', db_paths ))
        db_polyline_paths = list(filter(lambda path: path['shapes'] == 'polylines', db_paths ))
        db_points_paths = list(filter(lambda path: path['shapes'] == 'points', db_paths ))

        object_path_attr_merge_key = [
            'objectpathattributeval__value',
            'objectpathattributeval__spec_id',
            'objectpathattributeval__id'
        ]

        db_box_paths = self._merge_table_rows(db_box_paths, {
            'attributes': object_path_attr_merge_key,
            'shapes': [
                'trackedbox__id', 'trackedbox__xtl', 'trackedbox__ytl',
                'trackedbox__xbr', 'trackedbox__ybr', 'trackedbox__frame',
                'trackedbox__occluded', 'trackedbox__z_order', 'trackedbox__outside',
                'trackedbox__trackedboxattributeval__value',
                'trackedbox__trackedboxattributeval__spec_id',
                'trackedbox__trackedboxattributeval__id'
            ],
        }, 'id')

        db_polygon_paths = self._merge_table_rows(db_polygon_paths, {
            'attributes': object_path_attr_merge_key,
            'shapes': [
                'trackedpolygon__id', 'trackedpolygon__points', 'trackedpolygon__frame',
                'trackedpolygon__occluded', 'trackedpolygon__z_order', 'trackedpolygon__outside',
                'trackedpolygon__trackedpolygonattributeval__value',
                'trackedpolygon__trackedpolygonattributeval__spec_id',
                'trackedpolygon__trackedpolygonattributeval__id'
            ]
        }, 'id')

        db_polyline_paths = self._merge_table_rows(db_polyline_paths, {
            'attributes': object_path_attr_merge_key,
            'shapes': [
                'trackedpolyline__id', 'trackedpolyline__points', 'trackedpolyline__frame',
                'trackedpolyline__occluded', 'trackedpolyline__z_order', 'trackedpolyline__outside',
                'trackedpolyline__trackedpolylineattributeval__value',
                'trackedpolyline__trackedpolylineattributeval__spec_id',
                'trackedpolyline__trackedpolylineattributeval__id'
            ],
        }, 'id')

        db_points_paths = self._merge_table_rows(db_points_paths, {
            'attributes': object_path_attr_merge_key,
            'shapes': [
                'trackedpoints__id', 'trackedpoints__points', 'trackedpoints__frame',
                'trackedpoints__occluded', 'trackedpoints__z_order', 'trackedpoints__outside',
                'trackedpoints__trackedpointsattributeval__value',
                'trackedpoints__trackedpointsattributeval__spec_id',
                'trackedpoints__trackedpointsattributeval__id'
            ]
        }, 'id')

        for db_box_path in db_box_paths:
            db_box_path.attributes = list(set(db_box_path.attributes))
            db_box_path.shapes = self._merge_table_rows(db_box_path.shapes, {
                'attributes': [
                    'trackedboxattributeval__value',
                    'trackedboxattributeval__spec_id',
                    'trackedboxattributeval__id'
                ]
            }, 'id')

        for db_polygon_path in db_polygon_paths:
            db_polygon_path.attributes = list(set(db_polygon_path.attributes))
            db_polygon_path.shapes = self._merge_table_rows(db_polygon_path.shapes, {
                'attributes': [
                    'trackedpolygonattributeval__value',
                    'trackedpolygonattributeval__spec_id',
                    'trackedpolygonattributeval__id'
                ]
            }, 'id')

        for db_polyline_path in db_polyline_paths:
            db_polyline_path.attributes = list(set(db_polyline_path.attributes))
            db_polyline_path.shapes = self._merge_table_rows(db_polyline_path.shapes, {
                'attributes': [
                    'trackedpolylineattributeval__value',
                    'trackedpolylineattributeval__spec_id',
                    'trackedpolylineattributeval__id'
                ]
            }, 'id')

        for db_points_path in db_points_paths:
            db_points_path.attributes = list(set(db_points_path.attributes))
            db_points_path.shapes = self._merge_table_rows(db_points_path.shapes, {
                'attributes': [
                    'trackedpointsattributeval__value',
                    'trackedpointsattributeval__spec_id',
                    'trackedpointsattributeval__id'
                ]
            }, 'id')

        for db_path in db_box_paths:
            for db_shape in db_path.shapes:
                db_shape.attributes = list(set(db_shape.attributes))
            label = _Label(self.db_labels[db_path.label_id])
            path = _BoxPath(label, db_path.frame, self.stop_frame, db_path.group_id)
            for db_attr in db_path.attributes:
                spec = self.db_attributes[db_attr.spec_id]
                attr = _Attribute(spec, db_attr.value)
                path.add_attribute(attr)

            frame = -1
            for db_shape in db_path.shapes:
                box = _TrackedBox(db_shape.xtl, db_shape.ytl, db_shape.xbr, db_shape.ybr,
                    db_shape.frame, db_shape.occluded, db_shape.z_order, db_shape.outside)
                assert box.frame > frame
                frame = box.frame

                for db_attr in db_shape.attributes:
                    spec = self.db_attributes[db_attr.spec_id]
                    attr = _Attribute(spec, db_attr.value)
                    box.add_attribute(attr)
                path.add_box(box)

            self.box_paths.append(path)

        for idx, paths_type in enumerate(['polygon_paths', 'polyline_paths', 'points_paths']):
            source = [db_polygon_paths, db_polyline_paths, db_points_paths][idx]

            for db_path in source:
                for db_shape in db_path.shapes:
                    db_shape.attributes = list(set(db_shape.attributes))
                label = _Label(self.db_labels[db_path.label_id])
                path = _PolyPath(label, db_path.frame, self.stop_frame, db_path.group_id)
                for db_attr in db_path.attributes:
                    spec = self.db_attributes[db_attr.spec_id]
                    attr = _Attribute(spec, db_attr.value)
                    path.add_attribute(attr)

                frame = -1
                for db_shape in db_path.shapes:
                    shape = _TrackedPolyShape(db_shape.points, db_shape.frame, db_shape.occluded, db_shape.z_order, db_shape.outside)
                    assert shape.frame > frame
                    frame = shape.frame

                    for db_attr in db_shape.attributes:
                        spec = self.db_attributes[db_attr.spec_id]
                        attr = _Attribute(spec, db_attr.value)
                        shape.add_attribute(attr)
                    path.add_shape(shape)

                getattr(self, paths_type).append(path)


    def init_from_client(self, data):
        # All fields inside data should be converted to correct type explicitly.
        # We cannot trust that client will send 23 as integer. Here we also
        # accept "23".
        db_task = self.db_job.segment.task
        image_meta = get_image_meta_cache(db_task)
        self.reset()

        for box in data['boxes']:
            label = _Label(self.db_labels[int(box['label_id'])])

            frame_idx = int(box['frame']) if db_task.mode == 'annotation' else 0
            xtl, ytl, xbr, ybr = self._clamp_box(float(box['xtl']), float(box['ytl']),
                float(box['xbr']), float(box['ybr']),
                image_meta['original_size'][frame_idx])
            labeled_box = _LabeledBox(label, xtl, ytl, xbr, ybr, int(box['frame']),
                int(box['group_id']), strtobool(str(box['occluded'])), int(box['z_order']))

            for attr in box['attributes']:
                spec = self.db_attributes[int(attr['id'])]
                attr = _Attribute(spec, str(attr['value']))
                labeled_box.add_attribute(attr)

            self.boxes.append(labeled_box)

        for poly_shape_type in ['points', 'polygons', 'polylines']:
            for poly_shape in data[poly_shape_type]:
                label = _Label(self.db_labels[int(poly_shape['label_id'])])

                frame_idx = int(poly_shape['frame']) if db_task.mode == 'annotation' else 0
                points = self._clamp_poly(poly_shape['points'], image_meta['original_size'][frame_idx])
                labeled_poly_shape = _LabeledPolyShape(label, points, int(poly_shape['frame']),
                    int(poly_shape['group_id']), poly_shape['occluded'], int(poly_shape['z_order']))

                for attr in poly_shape['attributes']:
                    spec = self.db_attributes[int(attr['id'])]
                    attr = _Attribute(spec, str(attr['value']))
                    labeled_poly_shape.add_attribute(attr)

                getattr(self, poly_shape_type).append(labeled_poly_shape)

        for path in data['box_paths']:
            label = _Label(self.db_labels[int(path['label_id'])])
            boxes = []
            frame = -1

            has_boxes_on_prev_segm = False
            last_box_on_prev_segm = None
            has_box_on_start_frame = False
            for box in path['shapes']:
                if int(box['frame']) < self.start_frame:
                    has_boxes_on_prev_segm = True
                    if last_box_on_prev_segm is None or int(last_box_on_prev_segm["frame"]) < int(box["frame"]):
                        last_box_on_prev_segm = box
                elif int(box['frame']) == self.start_frame:
                    has_box_on_start_frame = True
                    break
            if has_boxes_on_prev_segm and not has_box_on_start_frame:
                last_box_on_prev_segm["frame"] = self.start_frame

            for box in path['shapes']:
                if int(box['frame']) <= self.stop_frame and int(box['frame']) >= self.start_frame:
                    frame_idx = int(box['frame']) if db_task.mode == 'annotation' else 0
                    xtl, ytl, xbr, ybr = self._clamp_box(float(box['xtl']), float(box['ytl']),
                        float(box['xbr']), float(box['ybr']), image_meta['original_size'][frame_idx])
                    tracked_box = _TrackedBox(xtl, ytl, xbr, ybr, int(box['frame']), strtobool(str(box['occluded'])),
                        int(box['z_order']), strtobool(str(box['outside'])))
                    assert tracked_box.frame > frame
                    frame = tracked_box.frame

                    for attr in box['attributes']:
                        spec = self.db_attributes[int(attr['id'])]
                        assert spec.is_mutable()
                        attr = _Attribute(spec, str(attr['value']))
                        tracked_box.add_attribute(attr)

                    boxes.append(tracked_box)
                else:
                    self.logger.error("init_from_client: ignore frame #%d " +
                        "because it out of segment range [%d-%d]", int(box['frame']), self.start_frame, self.stop_frame)

            attributes = []
            for attr in path['attributes']:
                spec = self.db_attributes[int(attr['id'])]
                assert not spec.is_mutable()
                attr = _Attribute(spec, str(attr['value']))
                attributes.append(attr)

            assert frame <= self.stop_frame
            box_path = _BoxPath(label, min(list(map(lambda box: box.frame, boxes))), self.stop_frame,
                int(path['group_id']), boxes, attributes)
            self.box_paths.append(box_path)

        for poly_path_type in ['points_paths', 'polygon_paths', 'polyline_paths']:
            for path in data[poly_path_type]:
                label = _Label(self.db_labels[int(path['label_id'])])
                poly_shapes = []
                frame = -1

                has_shapes_on_prev_segm = False
                last_shape_on_prev_segm = None
                has_shape_on_start_frame = False
                for poly_shape in path['shapes']:
                    if int(poly_shape['frame']) < self.start_frame:
                        has_shapes_on_prev_segm = True
                        if last_shape_on_prev_segm is None or int(last_shape_on_prev_segm["frame"]) < (poly_shape["frame"]):
                            last_shape_on_prev_segm = box
                    elif int(poly_shape['frame']) == self.start_frame:
                        has_shape_on_start_frame = True
                        break
                if has_shapes_on_prev_segm and not has_shape_on_start_frame:
                    last_shape_on_prev_segm["frame"] = self.start_frame

                for poly_shape in path['shapes']:
                    if int(poly_shape['frame']) <= self.stop_frame and int(poly_shape['frame']) >= self.start_frame:
                        frame_idx = int(poly_shape['frame']) if db_task.mode == 'annotation' else 0
                        points = self._clamp_poly(poly_shape['points'], image_meta['original_size'][frame_idx])
                        tracked_poly_shape = _TrackedPolyShape(points, int(poly_shape['frame']), strtobool(str(poly_shape['occluded'])),
                            int(poly_shape['z_order']), strtobool(str(poly_shape['outside'])))
                        assert tracked_poly_shape.frame >  frame
                        frame = tracked_poly_shape.frame

                        for attr in poly_shape['attributes']:
                            spec = self.db_attributes[int(attr['id'])]
                            assert spec.is_mutable()
                            attr = _Attribute(spec, str(attr['value']))
                            tracked_poly_shape.add_attribute(attr)

                        poly_shapes.append(tracked_poly_shape)
                    else:
                        self.logger.error("init_from_client: ignore frame #%d " +
                            "because it out of segment range [%d-%d]", int(poly_shape['frame']), self.start_frame, self.stop_frame)

                attributes = []
                for attr in path['attributes']:
                    spec = self.db_attributes[int(attr['id'])]
                    assert not spec.is_mutable()
                    attr = _Attribute(spec, str(attr['value']))
                    attributes.append(attr)

                poly_path = _PolyPath(label, min(list(map(lambda shape: shape.frame, poly_shapes))), self.stop_frame + 1,
                    int(path['group_id']), poly_shapes, attributes)

                getattr(self, poly_path_type).append(poly_path)

    def _get_shape_class(self, shape_type):
        if shape_type == 'polygons':
            return models.LabeledPolygon
        elif shape_type == 'polylines':
            return models.LabeledPolyline
        elif shape_type == 'boxes':
            return models.LabeledBox
        elif shape_type == 'points':
            return models.LabeledPoints
        elif shape_type == 'polygon_paths':
            return models.TrackedPolygon
        elif shape_type == 'polyline_paths':
            return models.TrackedPolyline
        elif shape_type == 'box_paths':
            return models.TrackedBox
        elif shape_type == 'points_paths':
            return models.TrackedPoints

    def _get_shape_attr_class(self, shape_type):
        if shape_type == 'polygons':
            return models.LabeledPolygonAttributeVal
        elif shape_type == 'polylines':
            return models.LabeledPolylineAttributeVal
        elif shape_type == 'boxes':
            return models.LabeledBoxAttributeVal
        elif shape_type == 'points':
            return models.LabeledPointsAttributeVal
        elif shape_type == 'polygon_paths':
            return models.TrackedPolygonAttributeVal
        elif shape_type == 'polyline_paths':
            return models.TrackedPolylineAttributeVal
        elif shape_type == 'box_paths':
            return models.TrackedBoxAttributeVal
        elif shape_type == 'points_paths':
            return models.TrackedPointsAttributeVal

    def _save_paths_to_db(self):
        self.db_job.objectpath_set.all().delete()

        for shape_type in ['polygon_paths', 'polyline_paths', 'points_paths', 'box_paths']:
            db_paths = []
            db_path_attrvals = []
            db_shapes = []
            db_shape_attrvals = []

            for path in getattr(self, shape_type):
                db_path = models.ObjectPath()
                db_path.job = self.db_job
                db_path.label = self.db_labels[path.label.id]
                db_path.frame = path.frame
                db_path.group_id = path.group_id
                if shape_type == 'polygon_paths':
                    db_path.shapes = 'polygons'
                elif shape_type == 'polyline_paths':
                    db_path.shapes = 'polylines'
                elif shape_type == 'box_paths':
                    db_path.shapes = 'boxes'
                elif shape_type == 'points_paths':
                    db_path.shapes = 'points'

                for attr in path.attributes:
                    db_attrspec = self.db_attributes[attr.id]
                    db_attrval = models.ObjectPathAttributeVal()
                    db_attrval.track_id = len(db_paths)
                    db_attrval.spec = db_attrspec
                    db_attrval.value = attr.value
                    db_path_attrvals.append(db_attrval)

                shapes = path.boxes if hasattr(path, 'boxes') else path.shapes
                for shape in shapes:
                    db_shape = self._get_shape_class(shape_type)()
                    db_shape.track_id = len(db_paths)
                    if shape_type == 'box_paths':
                        db_shape.xtl = shape.xtl
                        db_shape.ytl = shape.ytl
                        db_shape.xbr = shape.xbr
                        db_shape.ybr = shape.ybr
                    else:
                        db_shape.points = shape.points
                    db_shape.frame = shape.frame
                    db_shape.occluded = shape.occluded
                    db_shape.z_order = shape.z_order
                    db_shape.outside = shape.outside

                    for attr in shape.attributes:
                        db_attrspec = self.db_attributes[attr.id]
                        db_attrval = self._get_shape_attr_class(shape_type)()
                        if shape_type == 'polygon_paths':
                            db_attrval.polygon_id = len(db_shapes)
                        elif shape_type == 'polyline_paths':
                            db_attrval.polyline_id = len(db_shapes)
                        elif shape_type == 'box_paths':
                            db_attrval.box_id = len(db_shapes)
                        elif shape_type == 'points_paths':
                            db_attrval.points_id = len(db_shapes)
                        db_attrval.spec = db_attrspec
                        db_attrval.value = attr.value
                        db_shape_attrvals.append(db_attrval)

                    db_shapes.append(db_shape)
                db_paths.append(db_path)
            db_paths = models.ObjectPath.objects.bulk_create(db_paths)

            if db_paths and db_paths[0].id == None:
                # Try to get primary keys. Probably the code will work for sqlite
                # but it definetely doesn't work for Postgres. Need to say that
                # for Postgres bulk_create will return objects with ids even ids
                # are auto incremented. Thus we will not be inside the 'if'.
                if shape_type == 'polygon_paths':
                    db_paths = list(self.db_job.objectpath_set.filter(shapes="polygons"))
                elif shape_type == 'polyline_paths':
                    db_paths = list(self.db_job.objectpath_set.filter(shapes="polylines"))
                elif shape_type == 'box_paths':
                    db_paths = list(self.db_job.objectpath_set.filter(shapes="boxes"))
                elif shape_type == 'points_paths':
                    db_paths = list(self.db_job.objectpath_set.filter(shapes="points"))

            for db_attrval in db_path_attrvals:
                db_attrval.track_id = db_paths[db_attrval.track_id].id
            models.ObjectPathAttributeVal.objects.bulk_create(db_path_attrvals)

            for db_shape in db_shapes:
                db_shape.track_id = db_paths[db_shape.track_id].id

            db_shapes = self._get_shape_class(shape_type).objects.bulk_create(db_shapes)

            if db_shapes and db_shapes[0].id == None:
                # Try to get primary keys. Probably the code will work for sqlite
                # but it definetely doesn't work for Postgres. Need to say that
                # for Postgres bulk_create will return objects with ids even ids
                # are auto incremented. Thus we will not be inside the 'if'.
                db_shapes = list(self._get_shape_class(shape_type).objects.filter(track__job_id=self.db_job.id))

            for db_attrval in db_shape_attrvals:
                if shape_type == 'polygon_paths':
                    db_attrval.polygon_id = db_shapes[db_attrval.polygon_id].id
                elif shape_type == 'polyline_paths':
                    db_attrval.polyline_id = db_shapes[db_attrval.polyline_id].id
                elif shape_type == 'box_paths':
                    db_attrval.box_id = db_shapes[db_attrval.box_id].id
                elif shape_type == 'points_paths':
                    db_attrval.points_id = db_shapes[db_attrval.points_id].id

            self._get_shape_attr_class(shape_type).objects.bulk_create(db_shape_attrvals)

    def _get_shape_set(self, shape_type):
        if shape_type == 'polygons':
            return self.db_job.labeledpolygon_set
        elif shape_type == 'polylines':
            return self.db_job.labeledpolyline_set
        elif shape_type == 'boxes':
            return self.db_job.labeledbox_set
        elif shape_type == 'points':
            return self.db_job.labeledpoints_set

    def _save_shapes_to_db(self):
        db_shapes = []
        db_attrvals = []

        for shape_type in ['polygons', 'polylines', 'points', 'boxes']:
            self._get_shape_set(shape_type).all().delete()
            db_shapes = []
            db_attrvals = []

            for shape in getattr(self, shape_type):
                db_shape = self._get_shape_class(shape_type)()
                db_shape.job = self.db_job
                db_shape.label = self.db_labels[shape.label.id]
                db_shape.group_id = shape.group_id
                if shape_type == 'boxes':
                    db_shape.xtl = shape.xtl
                    db_shape.ytl = shape.ytl
                    db_shape.xbr = shape.xbr
                    db_shape.ybr = shape.ybr
                else:
                    db_shape.points = shape.points
                db_shape.frame = shape.frame
                db_shape.occluded = shape.occluded
                db_shape.z_order = shape.z_order

                for attr in shape.attributes:
                    db_attrval = self._get_shape_attr_class(shape_type)()
                    if shape_type == 'polygons':
                        db_attrval.polygon_id = len(db_shapes)
                    elif shape_type == 'polylines':
                        db_attrval.polyline_id = len(db_shapes)
                    elif shape_type == 'boxes':
                        db_attrval.box_id = len(db_shapes)
                    else:
                        db_attrval.points_id = len(db_shapes)

                    db_attrval.spec = self.db_attributes[attr.id]
                    db_attrval.value = attr.value
                    db_attrvals.append(db_attrval)

                db_shapes.append(db_shape)

            db_shapes = self._get_shape_class(shape_type).objects.bulk_create(db_shapes)

            if db_shapes and db_shapes[0].id == None:
                # Try to get primary keys. Probably the code will work for sqlite
                # but it definetely doesn't work for Postgres. Need to say that
                # for Postgres bulk_create will return objects with ids even ids
                # are auto incremented. Thus we will not be inside the 'if'.
                db_shapes = list(self._get_shape_set(shape_type).all())

            for db_attrval in db_attrvals:
                if shape_type == 'polygons':
                    db_attrval.polygon_id = db_shapes[db_attrval.polygon_id].id
                elif shape_type == 'polylines':
                    db_attrval.polyline_id = db_shapes[db_attrval.polyline_id].id
                elif shape_type == 'boxes':
                    db_attrval.box_id = db_shapes[db_attrval.box_id].id
                else:
                    db_attrval.points_id = db_shapes[db_attrval.points_id].id

            self._get_shape_attr_class(shape_type).objects.bulk_create(db_attrvals)

    def save_to_db(self):
        self._save_shapes_to_db()
        self._save_paths_to_db()

    def to_client(self):
        data = {
            "boxes": [],
            "box_paths": [],
            "polygons": [],
            "polygon_paths": [],
            "polylines": [],
            "polyline_paths": [],
            "points": [],
            "points_paths": []
        }

        for box in self.boxes:
            data["boxes"].append({
                "label_id": box.label.id,
                "group_id": box.group_id,
                "xtl": box.xtl,
                "ytl": box.ytl,
                "xbr": box.xbr,
                "ybr": box.ybr,
                "occluded": box.occluded,
                "z_order": box.z_order,
                "frame": box.frame,
                "attributes": [{'id': attr.id, 'value':attr.value} for attr in box.attributes],
            })

        for poly_type in ['polygons', 'polylines', 'points']:
            for poly in getattr(self, poly_type):
                data[poly_type].append({
                    "label_id": poly.label.id,
                    "group_id": poly.group_id,
                    "points": poly.points,
                    "occluded": poly.occluded,
                    "z_order": poly.z_order,
                    "frame": poly.frame,
                    "attributes": [{'id': attr.id, 'value':attr.value} for attr in poly.attributes],
                })

        for box_path in self.box_paths:
            data["box_paths"].append({
                "label_id": box_path.label.id,
                "group_id": box_path.group_id,
                "frame": box_path.frame,
                "attributes": [{'id': attr.id, 'value':attr.value} for attr in box_path.attributes],
                "shapes": [box for box in map(lambda box:
                    ({
                        "frame": box.frame,
                        "xtl": box.xtl,
                        "ytl": box.ytl,
                        "xbr": box.xbr,
                        "ybr": box.ybr,
                        "occluded": box.occluded,
                        "z_order": box.z_order,
                        "outside": box.outside,
                        "attributes": [{'id': attr.id, 'value':attr.value} for attr in box.attributes],
                    }), box_path.boxes)
                ],
            })

        for poly_path_type in ['polygon_paths', 'polyline_paths', 'points_paths']:
            for poly_path in getattr(self, poly_path_type):
                data[poly_path_type].append({
                    "label_id": poly_path.label.id,
                    "group_id": poly_path.group_id,
                    "frame": poly_path.frame,
                    "attributes": [{'id': attr.id, 'value':attr.value} for attr in poly_path.attributes],
                    "shapes": [shape for shape in map(lambda shape:
                        ({
                            "frame": shape.frame,
                            "points": shape.points,
                            "occluded": shape.occluded,
                            "z_order": shape.z_order,
                            "outside": shape.outside,
                            "attributes": [{'id': attr.id, 'value':attr.value} for attr in shape.attributes],
                        }), poly_path.shapes)
                    ],
                })

        return data


class _AnnotationForSegment(_Annotation):
    def __init__(self, db_segment):
        super().__init__(db_segment.start_frame, db_segment.stop_frame)
        self.db_segment = db_segment

    def init_from_db(self):
        # FIXME: at the moment a segment has only one job always. Thus
        # the implementation makes sense. Need to implement a good one
        # in the future.
        self.reset()

        db_job0 = list(self.db_segment.job_set.all())[0]
        annotation = _AnnotationForJob(db_job0)
        annotation.init_from_db()
        self.boxes = annotation.boxes
        self.box_paths = annotation.box_paths
        self.polygons = annotation.polygons
        self.polygon_paths = annotation.polygon_paths
        self.polylines = annotation.polylines
        self.polyline_paths = annotation.polyline_paths
        self.points = annotation.points
        self.points_paths = annotation.points_paths

@transaction.atomic
def _dump(tid, data_format, scheme, host):
    db_task = models.Task.objects.select_for_update().get(id=tid)
    annotation = _AnnotationForTask(db_task)
    annotation.init_from_db()
    annotation.dump(data_format, db_task, scheme, host)

def _calc_box_area(box):
    return (box.xbr - box.xtl) * (box.ybr - box.ytl)

def _calc_overlap_box_area(box0, box1):
    dx = min(box0.xbr, box1.xbr) - max(box0.xtl, box1.xtl)
    dy = min(box0.ybr, box1.ybr) - max(box0.ytl, box1.ytl)
    if dx > 0 and dy > 0:
        return dx * dy
    else:
        return 0

def _calc_box_IoU(box0, box1):
    overlap_area = _calc_overlap_box_area(box0, box1)
    return overlap_area / (_calc_box_area(box0) + _calc_box_area(box1) - overlap_area)

class _AnnotationWriter:
    __metaclass__ = ABCMeta

    def __init__(self, file, version):
        self.version = version
        self.file = file

    @abstractmethod
    def open_root(self):
        raise NotImplementedError

    @abstractmethod
    def add_meta(self, meta):
        raise NotImplementedError

    @abstractmethod
    def open_track(self, track):
        raise NotImplementedError

    @abstractmethod
    def open_image(self, image):
        raise NotImplementedError

    @abstractmethod
    def open_box(self, box):
        raise NotImplementedError

    @abstractmethod
    def open_polygon(self, polygon):
        raise NotImplementedError

    @abstractmethod
    def open_polyline(self, polyline):
        raise NotImplementedError

    @abstractmethod
    def open_points(self, points):
        raise NotImplementedError

    @abstractmethod
    def add_attribute(self, attribute):
        raise NotImplementedError

    @abstractmethod
    def close_box(self):
        raise NotImplementedError

    @abstractmethod
    def close_polygon(self):
        raise NotImplementedError

    @abstractmethod
    def close_polyline(self):
        raise NotImplementedError

    @abstractmethod
    def close_points(self):
        raise NotImplementedError

    @abstractmethod
    def close_image(self):
        raise NotImplementedError

    @abstractmethod
    def close_track(self):
        raise NotImplementedError

    @abstractmethod
    def close_root(self):
        raise NotImplementedError

class _XmlAnnotationWriter(_AnnotationWriter):
    def __init__(self, file):
        super().__init__(file, "1.0")
        self.xmlgen = XMLGenerator(self.file, 'utf-8')
        self._level = 0

    def _indent(self, newline = True):
        if newline:
            self.xmlgen.ignorableWhitespace("\n")
        self.xmlgen.ignorableWhitespace("  " * self._level)

    def _add_version(self):
        self._indent()
        self.xmlgen.startElement("version", {})
        self.xmlgen.characters(self.version)
        self.xmlgen.endElement("version")

    def open_root(self):
        self.xmlgen.startDocument()
        self.xmlgen.startElement("annotations", {})
        self._level += 1
        self._add_version()

    def _add_meta(self, meta):
        self._level += 1
        for k, v in meta.items():
            if isinstance(v, OrderedDict):
                self._indent()
                self.xmlgen.startElement(k, {})
                self._add_meta(v)
                self._indent()
                self.xmlgen.endElement(k)
            elif type(v) == list:
                self._indent()
                self.xmlgen.startElement(k, {})
                for tup in v:
                    self._add_meta(OrderedDict([tup]))
                self._indent()
                self.xmlgen.endElement(k)
            else:
                self._indent()
                self.xmlgen.startElement(k, {})
                self.xmlgen.characters(v)
                self.xmlgen.endElement(k)
        self._level -= 1

    def add_meta(self, meta):
        self._indent()
        self.xmlgen.startElement("meta", {})
        self._add_meta(meta)
        self._indent()
        self.xmlgen.endElement("meta")

    def open_track(self, track):
        self._indent()
        self.xmlgen.startElement("track", track)
        self._level += 1

    def open_image(self, image):
        self._indent()
        self.xmlgen.startElement("image", image)
        self._level += 1

    def open_box(self, box):
        self._indent()
        self.xmlgen.startElement("box", box)
        self._level += 1

    def open_polygon(self, polygon):
        self._indent()
        self.xmlgen.startElement("polygon", polygon)
        self._level += 1

    def open_polyline(self, polyline):
        self._indent()
        self.xmlgen.startElement("polyline", polyline)
        self._level += 1

    def open_points(self, points):
        self._indent()
        self.xmlgen.startElement("points", points)
        self._level += 1

    def add_attribute(self, attribute):
        self._indent()
        self.xmlgen.startElement("attribute", {"name": attribute["name"]})
        self.xmlgen.characters(attribute["value"])
        self.xmlgen.endElement("attribute")

    def close_box(self):
        self._level -= 1
        self._indent()
        self.xmlgen.endElement("box")

    def close_polygon(self):
        self._level -= 1
        self._indent()
        self.xmlgen.endElement("polygon")

    def close_polyline(self):
        self._level -= 1
        self._indent()
        self.xmlgen.endElement("polyline")

    def close_points(self):
        self._level -= 1
        self._indent()
        self.xmlgen.endElement("points")

    def close_image(self):
        self._level -= 1
        self._indent()
        self.xmlgen.endElement("image")

    def close_track(self):
        self._level -= 1
        self._indent()
        self.xmlgen.endElement("track")

    def close_root(self):
        self._level -= 1
        self._indent()
        self.xmlgen.endElement("annotations")
        self.xmlgen.endDocument()

class _AnnotationForTask(_Annotation):
    def __init__(self, db_task):
        super().__init__(0, db_task.size)
        self.db_task = db_task

    def init_from_db(self):
        self.reset()

        for db_segment in self.db_task.segment_set.all():
            annotation = _AnnotationForSegment(db_segment)
            annotation.init_from_db()
            self._merge_boxes(annotation.boxes, db_segment.start_frame,
                self.db_task.overlap)
            self._merge_paths(annotation.box_paths, db_segment.start_frame,
                self.db_task.overlap)
            self.polygons.extend(annotation.polygons)
            self.polylines.extend(annotation.polylines)
            self.points.extend(annotation.points)
            self.polygon_paths.extend(annotation.polygon_paths)
            self.polyline_paths.extend(annotation.polyline_paths)
            self.points_paths.extend(annotation.points_paths)
            # FIXME PolyShapes merge???

    def _merge_paths(self, paths, start_frame, overlap):
        # 1. Split paths on two parts: new and which can be intersected
        # with existing paths.
        new_paths = [path for path in paths
            if path.frame >= start_frame + overlap]
        int_paths = [path for path in paths
            if path.frame < start_frame + overlap]
        assert len(new_paths) + len(int_paths) == len(paths)

        # 4. Find old paths which are intersected with int_paths
        old_paths = []
        for path in self.box_paths:
            box = path.get_interpolated_boxes()[-1]
            if box.frame >= start_frame:
                old_paths.append(path)

        # 3. Add new paths as is. It should be done only after old_paths
        # variable is initialized.
        self.box_paths.extend(new_paths)

        # Nothing to merge. Just add all int_paths if any.
        if not old_paths or not int_paths:
            self.box_paths.extend(int_paths)
            return

        # 4. Build cost matrix for each path and find correspondence using
        # Hungarian algorithm.
        min_cost_thresh = 0.5
        cost_matrix = np.empty(shape=(len(int_paths), len(old_paths)),
            dtype=float)
        for i, int_path in enumerate(int_paths):
            for j, old_path in enumerate(old_paths):
                cost_matrix[i][j] = 1
                if int_path.label.id == old_path.label.id:
                    # Here start_frame is the start frame of next segment
                    # and stop_frame is the stop frame of current segment
                    stop_frame = start_frame + overlap - 1
                    int_boxes = int_path.get_interpolated_boxes()
                    old_boxes = old_path.get_interpolated_boxes()
                    int_boxes = {box.frame:box for box in int_boxes if box.frame <= stop_frame}
                    old_boxes = {box.frame:box for box in old_boxes if box.frame >= start_frame}
                    assert int_boxes and old_boxes

                    count, error = 0, 0
                    for frame in range(start_frame, stop_frame + 1):
                        box0, box1 = int_boxes.get(frame), old_boxes.get(frame)
                        if box0 and box1:
                            if box0.outside != box1.outside:
                                error += 1
                            else:
                                error += 1 - _calc_box_IoU(box0, box1)
                            count += 1
                        elif box0 or box1:
                            error += 1
                            count += 1

                    cost_matrix[i][j] = error / count

        # 6. Find optimal solution using Hungarian algorithm.
        row_ind, col_ind = linear_sum_assignment(cost_matrix)
        int_paths_indexes = list(range(0, len(int_paths)))
        for i, j in zip(row_ind, col_ind):
            # Reject the solution if the cost is too high. Remember
            # inside int_boxes_indexes boxes which were handled.
            if cost_matrix[i][j] <= min_cost_thresh:
                old_paths[j].merge(int_paths[i])
                int_paths_indexes[i] = -1

        # 7. Add all paths which were not processed.
        for i in int_paths_indexes:
            if i != -1:
                self.box_paths.append(int_paths[i])

    def _merge_boxes(self, boxes, start_frame, overlap):
        # 1. Split boxes on two parts: new and which can be intersected
        # with existing boxes.
        new_boxes = [box for box in boxes
            if box.frame >= start_frame + overlap]
        int_boxes = [box for box in boxes
            if box.frame < start_frame + overlap]
        assert len(new_boxes) + len(int_boxes) == len(boxes)

        # 2. Convert to more convenient data structure (boxes by frame)
        int_boxes_by_frame = {}
        for box in int_boxes:
            if box.frame in int_boxes_by_frame:
                int_boxes_by_frame[box.frame].append(box)
            else:
                int_boxes_by_frame[box.frame] = [box]

        old_boxes_by_frame = {}
        for box in self.boxes:
            if box.frame >= start_frame:
                if box.frame in old_boxes_by_frame:
                    old_boxes_by_frame[box.frame].append(box)
                else:
                    old_boxes_by_frame[box.frame] = [box]

        # 3. Add new boxes as is. It should be done only after old_boxes_by_frame
        # variable is initialized.
        self.boxes.extend(new_boxes)

        # Nothing to merge here. Just add all int_boxes if any.
        if not old_boxes_by_frame or not int_boxes_by_frame:
            self.boxes.extend(int_boxes)
            return

        # 4. Build cost matrix for each frame and find correspondence using
        # Hungarian algorithm. In this case min_cost_thresh is stronger
        # because we compare only on one frame.
        min_cost_thresh = 0.25
        for frame in int_boxes_by_frame:
            if frame in old_boxes_by_frame:
                int_boxes = int_boxes_by_frame[frame]
                old_boxes = old_boxes_by_frame[frame]
                cost_matrix = np.empty(shape=(len(int_boxes), len(old_boxes)),
                    dtype=float)
                # 5.1 Construct cost matrix for the frame.
                for i, box0 in enumerate(int_boxes):
                    for j, box1 in enumerate(old_boxes):
                        if box0.label.id == box1.label.id:
                            cost_matrix[i][j] = 1 - _calc_box_IoU(box0, box1)
                        else:
                            cost_matrix[i][j] = 1

                # 6. Find optimal solution using Hungarian algorithm.
                row_ind, col_ind = linear_sum_assignment(cost_matrix)
                int_boxes_indexes = list(range(0, len(int_boxes)))
                for i, j in zip(row_ind, col_ind):
                    # Reject the solution if the cost is too high. Remember
                    # inside int_boxes_indexes boxes which were handled.
                    if cost_matrix[i][j] <= min_cost_thresh:
                        old_boxes[j].merge(int_boxes[i])
                        int_boxes_indexes[i] = -1

                # 7. Add all boxes which were not processed.
                for i in int_boxes_indexes:
                    if i != -1:
                        self.boxes.append(int_boxes[i])
            else:
                # We don't have old boxes on the frame. Let's add all new ones.
                self.boxes.extend(int_boxes_by_frame[frame])

    def dump(self, data_format, db_task, scheme, host):
        def _flip_box(box, im_w, im_h):
            box.xbr, box.xtl = im_w - box.xtl, im_w - box.xbr
            box.ybr, box.ytl = im_h - box.ytl, im_h - box.ybr

        def _flip_shape(shape, im_w, im_h):
            points = []
            for p in shape.points.split(' '):
                p = p.split(',')
                points.append({
                    'x': p[0],
                    'y': p[1]
                })

            for p in points:
                p['x'] = im_w - (float(p['x']) + 1)
                p['y'] = im_h - (float(p['y']) + 1)

            shape.points = ' '.join(['{},{}'.format(point['x'], point['y']) for point in points])

        db_segments = db_task.segment_set.all().prefetch_related('job_set')
        db_labels = db_task.label_set.all().prefetch_related('attributespec_set')
        im_meta_data = get_image_meta_cache(db_task)

        meta = OrderedDict([
            ("task", OrderedDict([
                ("id", str(db_task.id)),
                ("name", db_task.name),
                ("size", str(db_task.size)),
                ("mode", db_task.mode),
                ("overlap", str(db_task.overlap)),
                ("bugtracker", db_task.bug_tracker),
                ("flipped", str(db_task.flipped)),
                ("created", str(timezone.localtime(db_task.created_date))),
                ("updated", str(timezone.localtime(db_task.updated_date))),

                ("labels", [
                    ("label", OrderedDict([
                        ("name", db_label.name),
                        ("attributes", [("attribute", db_attr.text)
                            for db_attr in db_label.attributespec_set.all()])
                    ])) for db_label in db_labels
                ]),

                ("segments", [
                    ("segment", OrderedDict([
                        ("id", str(db_segment.id)),
                        ("start", str(db_segment.start_frame)),
                        ("stop", str(db_segment.stop_frame)),
                        ("url", "{0}://{1}/?id={2}".format(
                            scheme, host, db_segment.job_set.all()[0].id))
                    ])) for db_segment in db_segments
                ]),

                ("owner", OrderedDict([
                    ("username", db_task.owner.username),
                    ("email", db_task.owner.email)
                ]) if db_task.owner else ""),
            ])),
            ("dumped", str(timezone.localtime(timezone.now())))
        ])

        if self.db_task.mode == "interpolation":
            meta["task"]["original_size"] = OrderedDict([
                ("width", str(im_meta_data["original_size"][0]["width"])),
                ("height", str(im_meta_data["original_size"][0]["height"]))
            ])

        dump_path = self.db_task.get_dump_path()
        with open(dump_path, "w") as dump_file:
            dumper = _XmlAnnotationWriter(dump_file)
            dumper.open_root()
            dumper.add_meta(meta)

            if self.db_task.mode == "annotation":
                shapes = {}
                shapes["boxes"] = {}
                shapes["polygons"] = {}
                shapes["polylines"] = {}
                shapes["points"] = {}

                for box in self.to_boxes():
                    if box.frame not in shapes["boxes"]:
                        shapes["boxes"][box.frame] = []
                    shapes["boxes"][box.frame].append(box)

                for polygon in self.to_polygons():
                    if polygon.frame not in shapes["polygons"]:
                        shapes["polygons"][polygon.frame] = []
                    shapes["polygons"][polygon.frame].append(polygon)

                for polyline in self.to_polylines():
                    if polyline.frame not in shapes["polylines"]:
                        shapes["polylines"][polyline.frame] = []
                    shapes["polylines"][polyline.frame].append(polyline)

                for points in self.to_points():
                    if points.frame not in shapes["points"]:
                        shapes["points"][points.frame] = []
                    shapes["points"][points.frame].append(points)

                for frame in sorted(set(list(shapes["boxes"].keys()) +
                    list(shapes["polygons"].keys()) +
                    list(shapes["polylines"].keys()) +
                    list(shapes["points"].keys()))):

                    link = get_frame_path(self.db_task.id, frame)
                    path = os.readlink(link)

                    rpath = path.split(os.path.sep)
                    rpath = os.path.sep.join(rpath[rpath.index(".upload")+1:])

                    im_w = im_meta_data['original_size'][frame]['width']
                    im_h = im_meta_data['original_size'][frame]['height']

                    dumper.open_image(OrderedDict([
                        ("id", str(frame)),
                        ("name", rpath),
                        ("width", str(im_meta_data['original_size'][frame]["width"])),
                        ("height", str(im_meta_data['original_size'][frame]["height"]))
                    ]))

                    for shape_type in ["boxes", "polygons", "polylines", "points"]:
                        shape_dict = shapes[shape_type]
                        if frame in shape_dict:
                            for shape in shape_dict[frame]:
                                if shape_type == "boxes":
                                    if db_task.flipped:
                                        _flip_box(shape, im_w, im_h)

                                    dump_dict = OrderedDict([
                                        ("label", shape.label.name),
                                        ("xtl", "{:.2f}".format(shape.xtl)),
                                        ("ytl", "{:.2f}".format(shape.ytl)),
                                        ("xbr", "{:.2f}".format(shape.xbr)),
                                        ("ybr", "{:.2f}".format(shape.ybr)),
                                        ("occluded", str(int(shape.occluded)))
                                    ])
                                    if db_task.z_order:
                                        dump_dict['z_order'] = str(shape.z_order)
                                    if shape.group_id:
                                        dump_dict['group_id'] = str(shape.group_id)
                                    dumper.open_box(dump_dict)
                                else:
                                    if db_task.flipped:
                                        _flip_shape(shape, im_w, im_h)

                                    dump_dict = OrderedDict([
                                        ("label", shape.label.name),
                                        ("points", ';'.join((
                                            ','.join((
                                                "{:.2f}".format(float(p.split(',')[0])),
                                                "{:.2f}".format(float(p.split(',')[1]))
                                            )) for p in shape.points.split(' '))
                                        )),
                                        ("occluded", str(int(shape.occluded)))
                                    ])

                                    if db_task.z_order:
                                        dump_dict['z_order'] = str(shape.z_order)
                                    if shape.group_id:
                                        dump_dict['group_id'] = str(shape.group_id)

                                    if shape_type == "polygons":
                                        dumper.open_polygon(dump_dict)
                                    elif shape_type == "polylines":
                                        dumper.open_polyline(dump_dict)
                                    else:
                                        dumper.open_points(dump_dict)

                                for attr in shape.attributes:
                                    dumper.add_attribute(OrderedDict([
                                        ("name", attr.name),
                                        ("value", attr.value)
                                    ]))

                                if shape_type == "boxes":
                                    dumper.close_box()
                                elif shape_type == "polygons":
                                    dumper.close_polygon()
                                elif shape_type == "polylines":
                                    dumper.close_polyline()
                                else:
                                    dumper.close_points()

                    dumper.close_image()
            else:
                paths = {}
                paths["boxes"] = self.to_box_paths()
                paths["polygons"] = self.to_polygon_paths()
                paths["polylines"] = self.to_polyline_paths()
                paths["points"] = self.to_points_paths()

                im_w = im_meta_data['original_size'][0]['width']
                im_h = im_meta_data['original_size'][0]['height']

                path_idx = 0
                for shape_type in ["boxes", "polygons", "polylines", "points"]:
                    path_list = paths[shape_type]
                    for path in path_list:
                        dump_dict = OrderedDict([
                            ("id", str(path_idx)),
                            ("label", path.label.name)
                        ])
                        if path.group_id:
                            dump_dict['group_id'] = str(path.group_id)
                        dumper.open_track(dump_dict)
                        if shape_type == "boxes":
                            for box in path.get_interpolated_boxes():
                                if db_task.flipped:
                                    _flip_box(box, im_w, im_h)
                                dump_dict = OrderedDict([
                                    ("frame", str(box.frame)),
                                    ("xtl", "{:.2f}".format(box.xtl)),
                                    ("ytl", "{:.2f}".format(box.ytl)),
                                    ("xbr", "{:.2f}".format(box.xbr)),
                                    ("ybr", "{:.2f}".format(box.ybr)),
                                    ("outside", str(int(box.outside))),
                                    ("occluded", str(int(box.occluded))),
                                    ("keyframe", str(int(box.keyframe)))
                                ])

                                if db_task.z_order:
                                    dump_dict["z_order"] = str(box.z_order)

                                dumper.open_box(dump_dict)
                                for attr in path.attributes + box.attributes:
                                    dumper.add_attribute(OrderedDict([
                                        ("name", attr.name),
                                        ("value", attr.value)
                                    ]))
                                dumper.close_box()
                        else:
                            for shape in path.get_interpolated_shapes():
                                if db_task.flipped:
                                    _flip_shape(shape, im_w, im_h)
                                dump_dict = OrderedDict([
                                    ("frame", str(shape.frame)),
                                    ("points", ';'.join((
                                        ','.join((
                                            "{:.2f}".format(float(p.split(',')[0])),
                                            "{:.2f}".format(float(p.split(',')[1]))
                                        )) for p in shape.points.split(' '))
                                    )),
                                    ("outside", str(int(shape.outside))),
                                    ("occluded", str(int(shape.occluded))),
                                    ("keyframe", str(int(shape.keyframe)))
                                ])

                                if db_task.z_order:
                                    dump_dict["z_order"] = str(shape.z_order)

                                if shape_type == "polygons":
                                    dumper.open_polygon(dump_dict)
                                elif shape_type == "polylines":
                                    dumper.open_polyline(dump_dict)
                                else:
                                    dumper.open_points(dump_dict)

                                for attr in path.attributes + shape.attributes:
                                    dumper.add_attribute(OrderedDict([
                                        ("name", attr.name),
                                        ("value", attr.value)
                                    ]))

                                if shape_type == "polygons":
                                    dumper.close_polygon()
                                elif shape_type == "polylines":
                                    dumper.close_polyline()
                                else:
                                    dumper.close_points()
                        path_idx += 1
                        dumper.close_track()
            dumper.close_root()
