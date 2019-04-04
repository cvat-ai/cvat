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
@plugin_decorator
@transaction.atomic
def patch_job_data(pk, data, action):
    slogger.job[pk].info("Enter patch_job_data API: jid = {}, action = {}"
        .format(pk, action))

    db_job = models.Job.objects.select_related('segment__task') \
        .select_for_update().get(id=pk)

    annotation = JobAnnotation(db_job)
    if action == PatchAction.CREATE:
        annotation.create(data)
    elif action == PatchAction.UPDATE:
        annotation.delete(data)
        annotation.create(data)
    elif action == PatchAction.DELETE:
        annotation.delete(data)

    slogger.job[pk].info("Leave patch_job_data API: jid = {}, action = {}"
        .format(pk, action))
    return annotation.data

@silk_profile(name="DELETE job data")
@transaction.atomic
def delete_job_data(pk):
    db_job = models.Job.objects.select_for_update().get(id=pk)

    annotation = JobAnnotation(db_job)
    annotation.delete()

@silk_profile(name="GET task data")
@transaction.atomic
def get_task_data(pk):
    return []

@silk_profile(name="POST task data")
@transaction.atomic
def put_task_data(pk, data):
    delete_task_data(pk)
    return patch_task_data(pk, data, PatchAction.CREATE)

@silk_profile(name="UPDATE task data")
@transaction.atomic
def patch_task_data(pk, data, action):
    slogger.task[pk].info("Enter patch_task_data API: tid = {}".format(pk))
    db_task = models.Task.objects.get(id=pk)
    db_segments = db_task.segment_set.prefetch_related('job_set').all()

    splitted_data = {}
    for segment in db_segments:
        jid = segment.job_set.first().id
        start = segment.start_frame
        stop = segment.stop_frame
        is_shape_inside = lambda y: (start <= int(y['frame']) <= stop) and (not y['outside'])
        splitted_data[jid] = {
            "tags":   list(filter(lambda x: start <= int(x['frame']) <= stop, data['tags'])),
            "shapes": list(filter(lambda x: start <= int(x['frame']) <= stop, data['shapes'])),
            "tracks": list(filter(lambda x: len(list(filter(is_shape_inside, x['shapes']))), data['tracks']))
        }

    for jid, job_data in splitted_data.items():
        # if an item inside _data isn't empty need to call save_job
        is_non_empty = False
        for objects in job_data.values():
            if objects:
                is_non_empty = True
                break

        if is_non_empty:
            patch_job_data(jid, job_data, action)

    response = get_task_data(pk)
    slogger.task[pk].info("Leave save_task API: tid = {}".format(pk))

    return response

@silk_profile(name="DELETE task data")
@transaction.atomic
def delete_task_data(pk):
    slogger.task[pk].info("Enter delete_task_data API: tid = {}".format(pk))
    db_jobs = models.Job.objects.filter(segment__task_id=pk)

    for db_job in db_jobs:
        delete_job_data(db_job.id)

    slogger.task[pk].info("Leave delete_task_data API: tid = {}".format(pk))


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
        db_tracks = []
        db_track_attrvals = []
        db_shapes = []
        db_shape_attrvals = []

        for track in self.data["tracks"]:
            attributes = track.pop("attributes", [])
            shapes = track.pop("shapes")
            db_track = models.LabeledTrack(job=self.db_job, **track)
            if db_track.label_id not in self.db_labels:
                raise AttributeError("label_id `{}` is invalid".format(db_track.label_id))

            for attr in attributes:
                db_attrval = models.LabeledTrackAttributeVal(**attr)
                if db_attrval.spec_id not in self.db_attributes:
                    raise AttributeError("spec_id `{}` is invalid".format(db_attrval.spec_id))
                db_attrval.track_id = len(db_tracks)
                db_track_attrvals.append(db_attrval)

            for shape in shapes:
                attributes = shape.pop("attributes", [])

                db_shape = models.TrackedShape(**shape)
                db_shape.track_id = len(db_tracks)

                for attr in attributes:
                    db_attrval = models.TrackedShapeAttributeVal(**attr)
                    if db_attrval.spec_id not in self.db_attributes:
                        raise AttributeError("spec_id `{}` is invalid".format(db_attrval.spec_id))
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

        tracks = serializers.LabeledTrackSerializer(db_tracks, many=True)
        self.data["tracks"] = tracks.data

    def _save_shapes_to_db(self):
        db_shapes = []
        db_attrvals = []

        for shape in self.data["shapes"]:
            attributes = shape.pop("attributes", [])
            db_shape = models.LabeledShape(job=self.db_job, **shape)
            if db_shape.label_id not in self.db_labels:
                raise AttributeError("label_id `{}` is invalid".format(db_shape.label_id))

            for attr in attributes:
                db_attrval = models.LabeledShapeAttributeVal(**attr)
                if db_attrval.spec_id not in self.db_attributes:
                    raise AttributeError("spec_id `{}` is invalid".format(db_attrval.spec_id))
                db_attrval.shape_id = len(db_shapes)
                db_attrvals.append(db_attrval)

            db_shapes.append(db_shape)

        db_shapes = bulk_create(models.LabeledShape, db_shapes,
            {"job_id": self.db_job.id})

        for db_attrval in db_attrvals:
            db_attrval.shape_id = db_shapes[db_attrval.shape_id].id

        bulk_create(models.LabeledShapeAttributeVal, db_attrvals)

        shapes = serializers.LabeledShapeSerializer(db_shapes, many=True)
        self.data["shapes"] = shapes.data

    def _save_tags_to_db(self):
        db_tags = []
        db_attrvals = []

        for tag in self.data["tags"]:
            attributes = tag.pop("attributes", [])
            db_tag = models.LabeledImage(job=self.db_job, **tag)
            if db_tag.label_id not in self.db_labels:
                raise AttributeError("label_id `{}` is invalid".format(db_tag.label_id))

            for attr in attributes:
                db_attrval = models.LabeledImageAttributeVal(**attr)
                if db_attrval.spec_id not in self.db_attributes:
                    raise AttributeError("spec_id `{}` is invalid".format(db_attrval.spec_id))
                db_attrval.tag_id = len(db_tags)
                db_attrvals.append(db_attrval)

            db_tags.append(db_tag)

        db_tags = bulk_create(models.LabeledImage, db_tags,
            {"job_id": self.db_job.id})

        for db_attrval in db_attrvals:
            db_attrval.tag_id = db_tags[db_attrval.tag_id].id

        bulk_create(models.LabeledImageAttributeVal, db_attrvals)

        tags = serializers.LabeledImageSerializer(db_tags, many=True)
        self.data["tags"] = tags.data


    def save_to_db(self, data):
        self.data = data
        self._save_tags_to_db()
        self._save_shapes_to_db()
        self._save_tracks_to_db()

        return self.has_data()

    def create(self, data):
        if self.save_to_db(data):
            db_task = self.db_job.segment.task
            db_task.updated_date = timezone.now()
            db_task.save()
            self.db_job.save()

    def delete(self, data=None):
        if data is None:
            self.db_job.labeledimage_set.all().delete()
            self.db_job.labeledshape_set.all().delete()
            self.db_job.labeledtrack_set.all().delete()
        else:
            labeledimage_ids = [image["id"] for image in data["tags"]]
            labeledshape_ids = [shape["id"] for shape in data["shapes"]]
            labeledtrack_ids = [track["id"] for track in data["tracks"]]
            labeledimage_set = self.db_job.labeledimage_set
            labeledimage_set = labeledimage_set.filter(pk__in=labeledimage_ids)
            labeledshape_set = self.db_job.labeledshape_set
            labeledshape_set = labeledshape_set.filter(pk__in=labeledshape_ids)
            labeledtrack_set = self.db_job.labeledtrack_set
            labeledtrack_set = labeledtrack_set.filter(pk__in=labeledtrack_ids)

            # It is not important for us that data had some "invalid" objects
            # which were skipped (not acutally deleted). The main idea is to
            # say that all requested objects are absent in DB after the method.
            self.data = data

            labeledimage_set.delete()
            labeledshape_set.delete()
            labeledtrack_set.delete()

    def init_from_queries(self, labeledimage_set, labeledshape_set,
        labeledtrack_set):
        db_tags = list(labeledimage_set
            .prefetch_related("label")
            .prefetch_related("labeledimageattributeval_set"))
        tags = serializers.LabeledImageSerializer(db_tags, many=True)
        self.data["tags"] = tags.data

        db_shapes = list(labeledshape_set
            .prefetch_related("label")
            .prefetch_related("labeledshapeattributeval_set"))
        shapes = serializers.LabeledShapeSerializer(db_shapes, many=True)
        self.data["shapes"] = shapes.data

        db_tracks = list(labeledtrack_set
            .select_related("label")
            .prefetch_related("labeledtrackattributeval_set")
            .prefetch_related("trackedshape_set__trackedshapeattributeval_set"))
        tracks = serializers.LabeledTrackSerializer(db_tracks, many=True)
        self.data["tracks"] = tracks.data


    def init_from_db(self):
        self.init_from_queries(
            self.db_job.labeledimage_set,
            self.db_job.labeledshape_set,
            self.db_job.labeledtrack_set)
