# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import copy
from enum import Enum
from django.utils import timezone
from collections import OrderedDict
import numpy as np
from scipy.optimize import linear_sum_assignment
from collections import OrderedDict
from distutils.util import strtobool
from xml.sax.saxutils import XMLGenerator
from abc import ABCMeta, abstractmethod
from PIL import Image

import django_rq
from django.conf import settings
from django.db import transaction

from cvat.apps.profiler import silk_profile
from cvat.apps.engine.plugins import plugin_decorator
from . import models
from .task import get_image_meta_cache
from .log import slogger

class PatchAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

    def __str__(self):
        return self.value

@silk_profile(name="GET job data")
@transaction.atomic
def get_job_data(pk):
    db_job = models.Job.objects.select_for_update().get(id=pk)

    annotation = JobAnnotation(db_job)
    annotation.init_from_db()

    return annotation.to_client()

@silk_profile(name="POST job data")
@transaction.atomic
def put_job_data(pk, data):
    pass

@silk_profile(name="UPDATE job data")
@transaction.atomic
def patch_job_data(pk, data, action):
    pass

@silk_profile(name="DELETE job data")
@transaction.atomic
def delete_job_data(pk, data=None):
    pass

@silk_profile(name="GET task data")
@transaction.atomic
def get_task_data(pk):
    return {}

@silk_profile(name="POST task data")
@transaction.atomic
def put_task_data(pk, data):
    pass

@silk_profile(name="UPDATE task data")
@transaction.atomic
def patch_task_data(pk, data, action):
    pass

@silk_profile(name="DELETE task data")
@transaction.atomic
def delete_task_data(pk, data=None):
    pass



######

class Annotation:
    def __init__(self, start_frame, stop_frame):
        self.start_frame = start_frame
        self.stop_frame = stop_frame
        self.reset()

    def reset(self):
        self.tags = []
        self.shapes = []
        self.tracks = []

    def has_data(self):
        non_empty = False
        for attr in ['tags', 'shapes', 'tracks']:
            non_empty |= bool(getattr(self, attr))

        return non_empty

class Label:
    def __init__(self, db_label):
        self.id = db_label.id
        self.name = db_label.name

class Attribute:
    def __init__(self, db_attr, value):
        self.id = db_attr.id
        self.name = db_attr.name
        if db_attr.input_type == models.AttributeType.CHECKBOX:
            self.value = str(value).lower()
        else:
            self.value = str(value)

class LabeledShape:
    def __init__(self, label, points, frame, group_id, occluded, z_order,
        client_id=None, attributes=None):
        self.label = label
        self.group_id = group_id
        self.points = points
        self.frame = frame
        self.occluded = occluded
        self.z_order = z_order
        self.client_id= client_id
        self.attributes = attributes if attributes else []

    def add_attribute(self, attr):
        self.attributes.append(attr)

class LabeledTrack:
    def __init__(self, label, start_frame, stop_frame, group_id, shapes=None,
        client_id=None, attributes=None):
        self.label = label
        self.frame = start_frame
        self.stop_frame = stop_frame
        self.group_id = group_id
        self.shapes = shapes if shapes else []
        self.client_id = client_id
        self.attributes = attributes if attributes else []

    def add_shape(self, shape):
        self.shapes.append(shape)

    def add_attribute(self, attr):
        self.attributes.append(attr)


class JobAnnotation(Annotation):
    def __init__(self, db_job):
        db_segment = db_job.segment
        super().__init__(db_segment.start_frame, db_segment.stop_frame)

        # pylint: disable=bad-continuation
        self.db_job = db_job
        self.logger = slogger.job[db_job.id]
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

    @staticmethod
    def _clamp(value, min_value, max_value):
        return max(min(value, max_value), min_value)

    def _clamp_points(self, points, im_size):
        raise NotImplementedError("need to implement the method for the common case")

    def init_from_db(self):
        self.reset()
        (values, merge_keys, prefetch) = [
            ('id', 'frame', 'points', 'label_id', 'group_id', 'occluded', 'z_order', 'client_id',
            'labeledshapeattributeval__value', 'labeledshapeattributeval__spec_id',
            'labeledshapeattributeval__id'), {
                'attributes': [
                    'labeledshapeattributeval__value',
                    'labeledshapeattributeval__spec_id',
                    'labeledshapeattributeval__id'
                ]
            }, 'labeledshapeattributeval_set'
        ]

        labeled_shapes = list(self.db_job.labeledshape_set.prefetch_related(prefetch).
            values(*values).order_by('frame'))
        labeled_shapes = self._merge_table_rows(labeled_shapes, merge_keys, 'id')
        for _shape in labeled_shapes:
            label = Label(self.db_labels[_shape.label_id])
            shape = LabeledShape(
                label=label,
                points=_shape.points,
                frame=_shape.frame,
                group_id=_shape.group_id,
                occluded=_shape.occluded,
                z_order=_shape.z_order,
                client_id=_shape.client_id,
            )

            self.shapes.append(shape)

        db_tracks = self.db_job.labeledtrack_set.
            prefetch_related("labeledtrackattributeval_set").
            prefetch_related("trackedshape_set").
            prefetch_related("trackedshape_set__trackedshapeattributeval_set")

        labeled_tracks = list(db_tracks.values(
            'id', 'frame', 'group_id', 'shapes', 'client_id',
            'labeledtrackattributeval__spec_id',
            'labeledtrackattributeval__id',
            'labeledtrackattributeval__value',
            'trackedshape__id',
            'trackedshape__points',
            'trackedshape__frame',
            'trackedshape__occluded',
            'trackedshape__z_order',
            'trackedshape__outside',
            'trackedshape__trackedshapeattributeval__spec_id',
            'trackedshape__trackedshapeattributeval__value',
            'trackedshape__trackedshapeattributeval__id')
            .order_by('id', 'trackedshape__frame'))

        labeled_tracks = self._merge_table_rows(labeled_tracks, {
            'attributes': [
                'labeledtrackattributeval__value',
                'labeledtracktributeval__spec_id',
                'labeledtracktributeval__id'
            ],
            'shapes': [
                'trackedshape__id',
                'trackedshape__points',
                'trackedshape__frame',
                'trackedshape__occluded',
                'trackedshape__z_order',
                'trackedshape__outside',
                'trackedshape__trackedpolygonattributeval__value',
                'trackedshape__trackedpolygonattributeval__spec_id',
                'trackedshape__trackedpolygonattributeval__id'
            ]
        }, 'id')

        for track in labeled_tracks:
            track.attributes = list(set(track.attributes))
            track.shapes = self._merge_table_rows(track.shapes, {
                'attributes': [
                    'trackedshapeattributeval__value',
                    'trackedshapeattributeval__spec_id',
                    'trackedshapeattributeval__id'
                ]
            }, 'id')


        for _track in labeled_tracks:
            for shape in _track.shapes:
                shape.attributes = list(set(shape.attributes))

            label = Label(self.db_labels[track.label_id])
            track = LabeledTrack(
                label=label,
                start_frame=_track.frame,
                stop_frame= self.stop_frame,
                group_id=_track.group_id,
                client_id=_track.client_id,
            )
            for attr in _track.attributes:
                spec = self.db_attributes[attr.spec_id]
                attr = Attribute(spec, attr.value)
                track.add_attribute(attr)

            frame = -1
            for tracked_shape in _track.shapes:
                shape = TrackedShape(
                    points=tracked_shape.points,
                    frame=tracked_shape.frame,
                    occluded=tracked_shape.occluded,
                    z_order=tracked_shape.z_order,
                    outside=tracked_shape.outside,
                )
                assert shape.frame > frame
                frame = shape.frame

                for attr in tracked_shape.attributes:
                    spec = self.db_attributes[attr.spec_id]
                    attr = Attribute(spec, attr.value)
                    shape.add_attribute(attr)
                track.add_shape(shape)

            self.tracks.append(track)

    def to_client(self):
        data = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": []
        }

        for shape in self.shapes:
            data["shapes"].append({
                "id": shape.client_id,
                "label": shape.label.id,
                "group": shape.group_id,
                "points": shape.points,
                "occluded": shape.occluded,
                "z_order": shape.z_order,
                "frame": shape.frame,
                "attributes": [{
                    "id": attr.id, "value": attr.value} for attr in shape.attributes
                ],
            })

        for track in self.tracks:
            data["tracks"].append({
                "id": track.client_id,
                "label": track.label.id,
                "group": track.group_id,
                "frame": track.frame,
                "attributes": [{
                    "id": attr.id, "value": attr.value} for attr in track.attributes
                ],
                "shapes": list(map(lambda shape:
                    ({
                        "frame": shape.frame,
                        "points": shape.points,
                        "occluded": shape.occluded,
                        "z_order": shape.z_order,
                        "outside": shape.outside,
                        "attributes": [{
                            "id": attr.id, "value":attr.value} for attr in shape.attributes
                        ],
                    }), track.shapes))
                ],
            })

        return data

