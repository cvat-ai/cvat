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
    annotation = JobAnnotation(pk)
    annotation.init_from_db()

    return annotation.data

@silk_profile(name="POST job data")
@transaction.atomic
def put_job_data(pk, data):
    annotation = JobAnnotation(pk)
    annotation.delete()
    annotation.create(data)

    return annotation.data

@silk_profile(name="UPDATE job data")
@transaction.atomic
def patch_job_data(pk, data, action):
    annotation = JobAnnotation(pk)
    if action == PatchAction.CREATE:
        annotation.create(data)
    elif action == PatchAction.UPDATE:
        annotation.update(data)
    elif action == PatchAction.DELETE:
        annotation.delete(data)

    return annotation.data

@silk_profile(name="DELETE job data")
@transaction.atomic
def delete_job_data(pk):
    annotation = JobAnnotation(pk)
    annotation.delete()

@silk_profile(name="GET task data")
@transaction.atomic
def get_task_data(pk):
    annotation = TaskAnnotation(pk)
    annotation.init_from_db()

    return annotation.data

@silk_profile(name="POST task data")
@transaction.atomic
def put_task_data(pk, data):
    annotation = TaskAnnotation(pk)
    annotation.delete()
    annotation.create(data)

    return annotation.data

@silk_profile(name="UPDATE task data")
@transaction.atomic
def patch_task_data(pk, data, action):
    annotation = TaskAnnotation(pk)
    if action == PatchAction.CREATE:
        annotation.create(data)
    elif action == PatchAction.UPDATE:
        annotation.update(data)
    elif action == PatchAction.DELETE:
        annotation.delete(data)

    return annotation.data

@silk_profile(name="DELETE task data")
@transaction.atomic
def delete_task_data(pk):
    annotation = TaskAnnotation(pk)
    annotation.delete()

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
    def __init__(self, pk):
        self.db_job = models.Job.objects.select_related('segment__task') \
            .select_for_update().get(id=pk)

        db_segment = self.db_job.segment
        self.start_frame = db_segment.start_frame
        self.stop_frame = db_segment.stop_frame
        self.reset()

        # pylint: disable=bad-continuation
        self.logger = slogger.job[self.db_job.id]
        self.db_labels = {db_label.id:db_label
            for db_label in db_segment.task.label_set.all()}
        self.db_attributes = {db_attr.id:db_attr
            for db_attr in models.AttributeSpec.objects.filter(
                label__task__id=db_segment.task.id)}

    def reset(self):
        self.data = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": []
        }

    def _save_tracks_to_db(self, tracks):
        db_tracks = []
        db_track_attrvals = []
        db_shapes = []
        db_shape_attrvals = []

        for track in tracks:
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

    def _save_shapes_to_db(self, shapes):
        db_shapes = []
        db_attrvals = []

        for shape in shapes:
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

    def _save_tags_to_db(self, tags):
        db_tags = []
        db_attrvals = []

        for tag in tags:
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

    def _save_to_db(self, data):
        self.reset()
        self._save_tags_to_db(data["tags"])
        self._save_shapes_to_db(data["shapes"])
        self._save_tracks_to_db(data["tracks"])

        return self.data["tags"] or self.data["shapes"] or self.data["tracks"]

    def create(self, data):
        if self._save_to_db(data):
            db_task = self.db_job.segment.task
            db_task.updated_date = timezone.now()
            db_task.save()
            self.db_job.save()

    def update(self, data):
        self.delete(data)
        self.create(data)

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

    def init_from_db(self):
        db_tags = list(self.db_job.labeledimage_set
            .prefetch_related("label")
            .prefetch_related("labeledimageattributeval_set"))
        tags = serializers.LabeledImageSerializer(db_tags, many=True)
        self.data["tags"] = tags.data

        db_shapes = list(self.db_job.labeledshape_set
            .prefetch_related("label")
            .prefetch_related("labeledshapeattributeval_set"))
        shapes = serializers.LabeledShapeSerializer(db_shapes, many=True)
        self.data["shapes"] = shapes.data

        db_tracks = list(self.db_job.labeledtrack_set
            .select_related("label")
            .prefetch_related("labeledtrackattributeval_set")
            .prefetch_related("trackedshape_set__trackedshapeattributeval_set"))
        tracks = serializers.LabeledTrackSerializer(db_tracks, many=True)
        self.data["tracks"] = tracks.data


class TaskAnnotation:
    def __init__(self, pk):
        self.db_task = models.Task.objects.get(id=pk)
        self.db_jobs = models.Job.objects.select_related("segment").filter(segment__task_id=pk)

    def reset(self):
        self.data = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": []
        }

    def _patch_data(self, data, action):
        splitted_data = {}
        for db_job in self.db_jobs:
            jid = db_job.id
            start = db_job.segment.start_frame
            stop = db_job.segment.stop_frame
            is_frame_inside = lambda x: (start <= int(x['frame']) <= stop)
            splitted_data[jid] = {
                "tags":   list(filter(is_frame_inside, data['tags'])),
                "shapes": list(filter(is_frame_inside, data['shapes'])),
                "tracks": list(filter(lambda y: len(list(filter(is_frame_inside, y['shapes']))), data['tracks']))
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

        self.init_from_db()

    def create(self, data):
        self._patch_data(data, PatchAction.CREATE)

    def update(self, data):
        self._patch_data(data, PatchAction.UPDATE)

    def delete(self, data=None):
        if data:
            self._patch_data(data, PatchAction.DELETE)
        else:
            for db_job in self.db_jobs:
                delete_job_data(db_job.id)

    def init_from_db(self):
        self.reset()

        for db_job in self.db_jobs:
            annotation = JobAnnotation(db_job)
            annotation.init_from_db()
            self._merge_tags(annotation.data["tags"], db_segment.start_frame,
                self.db_task.overlap)
            self._merge_shapes(annotation.data["shapes"], db_segment.start_frame,
                self.db_task.overlap)
            self._merge_tracks(annotation.data["tracks"], db_segment.start_frame,
                self.db_task.overlap)
    
    def _merge_tags(tags, start_frame, overlap):
        # FIXME: implement merge algorithm here
        self.data["tags"].extend(tags)

    def _merge_shapes(shapes, start_frame, overlap):
        # FIXME: implement merge algorithm here
        self.data["shapes"].extend(shapes)

    def _merge_tracks(tracks, start_frame, overlap):
        # FIXME: implement merge algorithm here
        self.data["tracks"].extend(tracks)