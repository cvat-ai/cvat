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
from . import serializers

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

    return annotation.data

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
    return annotation.data

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


class JobAnnotation:
    def __init__(self, db_job):
        db_segment = db_job.segment
        self.start_frame = db_segment.start_frame
        self.stop_frame = db_segment.stop_frame
        self.reset()

        # pylint: disable=bad-continuation
        self.db_job = db_job
        self.logger = slogger.job[db_job.id]
        self.db_labels = {db_label.id:db_label
            for db_label in db_job.segment.task.label_set.all()}
        self.db_attributes = {db_attr.id:db_attr
            for db_attr in models.AttributeSpec.objects.filter(
                label__task__id=db_job.segment.task.id)}

    def has_data(self):
        return self.data and (self.data["tags"] or self.data["shapes"] or
            self.data["tracks"])

    def reset(self):
        self.data = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": []
        }

    def _save_tracks_to_db(self):
        # FIXME: need to have all values inside data and add 'id's
        db_tracks = []
        db_track_attrvals = []
        db_shapes = []
        db_shape_attrvals = []

        for track in self.data["tracks"]:
            attributes = track.pop("attributes")
            shapes = track.pop("shapes")
            db_track = models.LabeledTrack(job=self.db_job, **track)

            for attr in attributes:
                db_attrval = models.LabeledTrackAttributeVal(**attr)
                db_attrval.track_id = len(db_tracks)
                db_track_attrvals.append(db_attrval)

            for shape in shapes:
                attributes = shape.pop("attributes")
                points = shape.pop("points")

                db_shape = models.TrackedShape(**shape)
                db_shape.points = ",".join(map(str, points))
                db_shape.track_id = len(db_tracks)

                for attr in attributes:
                    db_attrval = models.TrackedShapeAttributeVal(**attr)
                    db_attrval.shape_id = len(db_shapes)
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

        for shape in self.data["shapes"]:
            attributes = shape.pop("attributes")
            points = shape.pop("points")
            db_shape = models.LabeledShape(job=self.db_job, **shape)
            db_shape.points = ",".join(map(str, points))

            for attr in attributes:
                db_attrval = models.LabeledShapeAttributeVal(**attr)
                db_attrval.shape_id = len(db_shapes)
                db_attrvals.append(db_attrval)

            db_shapes.append(db_shape)

        db_shapes = bulk_create(models.LabeledShape, db_shapes,
            {"job_id": self.db_job.id})

        for db_attrval in db_attrvals:
            db_attrval.shape_id = db_shapes[db_attrval.shape_id].id

        bulk_create(models.LabeledShapeAttributeVal, db_attrvals)


    def save_to_db(self, data):
        self.data = data
        self._save_shapes_to_db()
        self._save_tracks_to_db()

        return self.has_data()

    def create(self, data):
        if self.save_to_db(data):
            db_task = self.db_job.segment.task
            db_task.updated_date = timezone.now()
            db_task.save()
            self.db_job.save()

    def delete(self):
        self.db_job.labeledimage_set.all().delete()
        self.db_job.labeledshape_set.all().delete()
        self.db_job.labeledtrack_set.all().delete()

    def init_from_db(self):
        db_shapes = list(self.db_job.labeledshape_set
            .prefetch_related("label")
            .prefetch_related("labeledshapeattributeval_set"))
        for db_shape in db_shapes:
            shape = serializers.LabeledShapeSerializer(db_shape)
            self.data["shapes"].append(shape.data)

        db_tracks = list(self.db_job.labeledtrack_set
            .select_related("label")
            .prefetch_related("labeledtrackattributeval_set")
            .prefetch_related("trackedshape_set__trackedshapeattributeval_set"))
        for db_track in db_tracks:
            track = serializers.LabeledTrackSerializer(db_track)
            self.data["tracks"].append(track.data)

