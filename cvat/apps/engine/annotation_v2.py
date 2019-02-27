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

    @classmethod
    def values(cls):
        return [item.value for item in cls]

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
    slogger.job[pk].info("Enter put_job_data API: jid = {}".format(pk))

    db_job = models.Job.objects.select_related('segment__task') \
        .select_for_update().get(id=pk)

    annotation = JobAnnotation(db_job)
    annotation.delete()
    annotation.create(data)

    slogger.job[pk].info("Leave put_job_data API: jid = {}".format(pk))

@silk_profile(name="UPDATE job data")
@transaction.atomic
def patch_job_data(pk, data, action):
    pass

@silk_profile(name="DELETE job data")
@transaction.atomic
def delete_job_data(pk):
    db_job = models.Job.objects.select_for_update().get(id=pk)

    annotation = JobAnnotation(db_job)
    annotation.delete()

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

class Shape:
    def __init__(self, points, frame, occluded, z_order, client_id=None, attributes=None):
        self.points = points
        self.frame = frame
        self.occluded = occluded
        self.z_order = z_order
        self.client_id=client_id
        self.attributes = attributes if attributes else []

    def add_attribute(self, attr):
        self.attributes.append(attr)

class LabeledShape(Shape):
    def __init__(self, label, points, frame, group_id, occluded, z_order,
        client_id=None, attributes=None):
        super().__init__(points, frame, occluded, z_order, client_id, attributes)
        self.label = label
        self.group = group_id

    def add_attribute(self, attr):
        self.attributes.append(attr)

class TrackedShape(Shape):
    def __init__(self, points, frame, occluded, z_order, outside, attributes=None):
        super().__init__(points, frame, occluded, z_order, None, attributes)
        self.outside = outside

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

def bulk_create(db_model, objects, flt_param = {}):
    if objects:
        if flt_param:
            if 'postgresql' in settings.DATABASES["default"]["ENGINE"]:
                return db_model.objects.bulk_create(objects)
            else:
                ids = list(db_model.objects.filter(**flt_param).values_list('id', flat=True))
                db_model.objects.bulk_create(objects)

                return list(db_model.objects.exclude(id__in=ids).filter(**flt_param))
        else:
            return db_model.objects.bulk_create(objects)


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

    def force_set_client_id(self, data):
        max_id = self.db_job.max_shape_id
        for annotation in data["shapes"] + data["tracks"]:
            if "id" in annotation:
                max_id = max(max_id, annotation['id'])

        max_id += 1
        for annotation in data["shapes"] + data["tracks"]:
            if "id" not in annotation or annotation["id"] == -1:
                annotation["id"] = max_id
                max_id += 1


    def _save_tracks_to_db(self):
        db_tracks = []
        db_track_attrvals = []
        db_shapes = []
        db_shape_attrvals = []

        for track in self.tracks:
            db_track = models.TrackedShape()
            db_track.job = self.db_job
            db_track.label = self.db_labels[track.label.id]
            db_track.frame = track.frame
            db_track.group_id = track.group
            db_track.client_id = track.client

            for attr in track.attributes:
                db_attrspec = self.db_attributes[attr.id]
                db_attrval = models.LabeledTrackAttributeVal()
                db_attrval.track_id = len(db_tracks)
                db_attrval.spec = db_attrspec
                db_attrval.value = attr.value
                db_track_attrvals.append(db_attrval)

            for shape in track.shapes:
                db_shape = models.TrackedShape()
                db_shape.track_id = len(db_tracks)
                db_shape.points = shape.points
                db_shape.frame = shape.frame
                db_shape.occluded = shape.occluded
                db_shape.z_order = shape.z_order
                db_shape.outside = shape.outside

                for attr in shape.attributes:
                    db_attrspec = self.db_attributes[attr.id]
                    db_attrval = models.TrackedShapeAttributeVal()
                    db_attrval.id = len(db_shapes)
                    db_attrval.shape_id = len(db_shapes)
                    db_attrval.spec = db_attrspec
                    db_attrval.value = attr.value
                    db_shape_attrvals.append(db_attrval)

                db_shapes.append(db_shape)
            db_tracks.append(db_track)

        db_tracks = bulk_create(models.LabeledTrack, db_tracks,
            {"job_id": self.db_job.id})

        for db_attrval in db_track_attrvals:
            db_attrval.track_id = db_tracks[db_attrval.track_id].id
        bulk_create(models.LabeledTrackAttributeVal, db_track_attrvals)

        for db_shape in db_shapes:
            db_shape.track_id = db_tracks[db_shape.track_id].id

        db_shapes = bulk_create(models.TrackedShape, db_shapes,
            {"track__job_id": self.db_job.id})

        for db_attrval in db_shape_attrvals:
            db_attrval.shape_id = db_shapes[db_attrval.shape_id].id

        bulk_create(models.TrackedShapeAttributeVal, db_shape_attrvals)

    def _save_shapes_to_db(self):
        db_shapes = []
        db_attrvals = []

        for shape in self.shapes:
            db_shape = models.LabeledShape()
            db_shape.job = self.db_job
            db_shape.label = self.db_labels[shape.label.id]
            db_shape.group_id = shape.group
            db_shape.client_id = shape.client
            db_shape.points = shape.points
            db_shape.frame = shape.frame
            db_shape.occluded = shape.occluded
            db_shape.z_order = shape.z_order

            for attr in shape.attributes:
                db_attrval = models.LabeledShapeAttributeVal()
                db_attrval.shape_id = len(db_shapes)
                db_attrval.spec = self.db_attributes[attr.id]
                db_attrval.value = attr.value
                db_attrvals.append(db_attrval)

            db_shapes.append(db_shape)

        db_shapes = bulk_create(models.LabeledShape, db_shapes,
            {"job_id": self.db_job.id})

        for db_attrval in db_attrvals:
            db_attrval.shape_id = db_shapes[db_attrval.polygon_id].id

        bulk_create(models.LabeledShapeAttributeVal, db_attrvals)


    def init_from_client(self, data):
        # All fields inside data should be converted to correct type explicitly.
        # We cannot trust that client will send 23 as integer. Here we also
        # accept "23".
        db_task = self.db_job.segment.task
        image_meta = get_image_meta_cache(db_task)
        image_meta = image_meta["original_size"]
        self.reset()

        for shape in data["shapes"]:
            label = Label(self.db_labels[int(shape['label'])])

            frame_idx = int(shape['frame']) if db_task.mode == 'annotation' else 0
            #FIXME: points = self._clamp_poly(shape['points'], image_meta[frame_idx])
            points = shape["points"]
            labeled_shape = LabeledShape(
                label=label,
                points=points,
                frame=int(shape['frame']),
                group_id=int(shape['group']),
                occluded=shape['occluded'],
                z_order=int(shape['z_order']),
                client_id=int(shape['id']),
            )

            for attr in shape['attributes']:
                spec = self.db_attributes[int(attr['id'])]
                attr = Attribute(spec, str(attr['value']))
                labeled_shape.add_attribute(attr)

            self.shapes.append(labeled_shape)


        for track in data["tracks"]:
            label = Label(self.db_labels[int(track['label'])])
            shapes = []
            frame = -1

            for shape in track['shapes']:
                if int(shape['frame']) <= self.stop_frame and int(shape['frame']) >= self.start_frame:
                    frame_idx = int(shape['frame']) if db_task.mode == 'annotation' else 0
                    #FIXME: points = self._clamp_poly(shape['points'], image_meta[frame_idx])
                    points = shape["points"]
                    tracked_shape = TrackedShape(
                        points=points,
                        frame=int(shape['frame']),
                        occluded=strtobool(str(shape['occluded'])),
                        z_order=int(shape['z_order']),
                        outside=strtobool(str(shape['outside'])),
                    )
                    assert tracked_shape.frame > frame
                    frame = tracked_shape.frame

                    for attr in shape['attributes']:
                        spec = self.db_attributes[int(attr['id'])]
                        assert spec.mutable
                        attr = Attribute(spec, str(attr['value']))
                        tracked_shape.add_attribute(attr)

                    shapes.append(tracked_shape)
                else:
                    self.logger.error("init_from_client: ignore frame #%d " +
                        "because it out of segment range [%d-%d]", int(poly_shape['frame']), self.start_frame, self.stop_frame)

            attributes = []
            for attr in track['attributes']:
                spec = self.db_attributes[int(attr['id'])]
                assert not spec.mutable
                attr = Attribute(spec, str(attr['value']))
                attributes.append(attr)

            labeled_track = LabeledTrack(
                label=label,
                start_frame=min(list(map(lambda shape: shape.frame, shapes))),
                stop_frame=self.stop_frame + 1,
                group_id=int(track['group']),
                shapes=shapes,
                client_id=int(track["id"]),
                attributes=attributes,
            )

            self.tracks.append(labeled_track)

        return self.has_data()


    def save_to_db(self, data):
        has_data = self.init_from_client(data)

        if has_data:
            self._save_shapes_to_db()
            self._save_tracks_to_db()

        return has_data

    def create(self, data):
        self.force_set_client_id(data)
        #FIXME: client_ids = self.validate_data_from_client(data)

        if self.save_to_db(data):
            self.db_job.segment.task.updated_date = timezone.now()
            self.db_job.segment.task.save()

        #FIXME: self.db_job.max_shape_id = max(self.db_job.max_shape_id, max(client_ids))
        self.db_job.save()


    def delete(self):
        self.db_job.annotation_set.all().delete()

    def init_from_db(self):
        self.reset()
        db_annotations = list(self.db_job.annotation_set
            .select_subclasses(models.LabeledShape)
            .prefetch_related("label"))
        for db_annotation in db_annotations:
            db_shape = db_annotation.shape
            label = Label(db_shape.label)
            shape = LabeledShape(
                label=label,
                points=db_shape.points,
                frame=db_shape.frame,
                group_id=db_shape.group_id,
                occluded=db_shape.occluded,
                z_order=db_shape.z_order,
                client_id=db_shape.client_id,
            )

            self.shapes.append(shape)

        db_annotations = list(self.db_job.annotation_set
            .select_subclasses(models.LabeledTrack)
            .select_related("label")
            .prefetch_related("labeledtrackattributeval_set")
            .prefetch_related("trackedshape_set")
            .prefetch_related("trackedshape_set__trackedshapeattributeval_set"))
        for db_annotation in db_annotations:
            db_track = db_annotation.track
            label = Label(db_track.label)
            track = LabeledTrack(
                label=label,
                start_frame=db_track.frame,
                stop_frame= self.stop_frame,
                group_id=db_track.group_id,
                client_id=db_track.client_id)

            for db_attr in db_track.labeledtrackattributeval_set.all():
                spec = self.db_attributes[db_attr.spec_id]
                attr = Attribute(spec, db_attr.value)
                track.add_attribute(attr)

            frame = -1
            for db_shape in db_track.trackedshape_set.all():
                shape = TrackedShape(
                    points=db_shape.points,
                    frame=db_shape.frame,
                    occluded=db_shape.occluded,
                    z_order=db_shape.z_order,
                    outside=db_shape.outside)
                assert shape.frame > frame
                frame = shape.frame

                for db_attr in db_shape.trackedshapeattributeval_set.all():
                    spec = self.db_attributes[db_attr.spec_id]
                    attr = Attribute(spec, db_attr.value)
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
                    }), track.shapes)),
            })

        return data

