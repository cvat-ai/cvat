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
from shapely import geometry

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
@plugin_decorator
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


def dump_task_data(pk, file_path, scheme, host, query_params):
    # For big tasks dump function may run for a long time and
    # we dont need to acquire lock after _AnnotationForTask instance
    # has been initialized from DB.
    # But there is the bug with corrupted dump file in case 2 or more dump request received at the same time.
    # https://github.com/opencv/cvat/issues/217
    with transaction.atomic():
        annotation = TaskAnnotation(pk)
        annotation.init_from_db()

    annotation.dump(file_path, scheme, host, query_params)

######

def bulk_create(db_model, objects, flt_param):
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

    return []

def _merge_table_rows(rows, keys_for_merge, field_id):
    """dot.notation access to dictionary attributes"""
    from collections import OrderedDict
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
            track_attributes = track.pop("attributes", [])
            shapes = track.pop("shapes")
            db_track = models.LabeledTrack(job=self.db_job, **track)
            if db_track.label_id not in self.db_labels:
                raise AttributeError("label_id `{}` is invalid".format(db_track.label_id))

            for attr in track_attributes:
                db_attrval = models.LabeledTrackAttributeVal(**attr)
                if db_attrval.spec_id not in self.db_attributes:
                    raise AttributeError("spec_id `{}` is invalid".format(db_attrval.spec_id))
                db_attrval.track_id = len(db_tracks)
                db_track_attrvals.append(db_attrval)

            for shape in shapes:
                shape_attributes = shape.pop("attributes", [])

                db_shape = models.TrackedShape(**shape)
                db_shape.track_id = len(db_tracks)

                for attr in shape_attributes:
                    db_attrval = models.TrackedShapeAttributeVal(**attr)
                    if db_attrval.spec_id not in self.db_attributes:
                        raise AttributeError("spec_id `{}` is invalid".format(db_attrval.spec_id))
                    db_attrval.shape_id = len(db_shapes)
                    db_shape_attrvals.append(db_attrval)

                db_shapes.append(db_shape)
                shape["attributes"] = shape_attributes

            db_tracks.append(db_track)
            track["attributes"] = track_attributes
            track["shapes"] = shapes

        db_tracks = bulk_create(
            db_model=models.LabeledTrack,
            objects=db_tracks,
            flt_param={"job_id": self.db_job.id}
        )

        for db_attrval in db_track_attrvals:
            db_attrval.track_id = db_tracks[db_attrval.track_id].id
        bulk_create(
            db_model=models.LabeledTrackAttributeVal,
            objects=db_track_attrvals,
            flt_param={}
        )

        for db_shape in db_shapes:
            db_shape.track_id = db_tracks[db_shape.track_id].id

        db_shapes = bulk_create(
            db_model=models.TrackedShape,
            objects=db_shapes,
            flt_param={"track__job_id": self.db_job.id}
        )

        for db_attrval in db_shape_attrvals:
            db_attrval.shape_id = db_shapes[db_attrval.shape_id].id

        bulk_create(
            db_model=models.TrackedShapeAttributeVal,
            objects=db_shape_attrvals,
            flt_param={}
        )

        shape_idx = 0
        for track, db_track in zip(tracks, db_tracks):
            track["id"] = db_track.id
            for shape in track["shapes"]:
                shape["id"] = db_shapes[shape_idx].id
                shape_idx += 1

        self.data["tracks"] = tracks

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
            shape["attributes"] = attributes

        db_shapes = bulk_create(
            db_model=models.LabeledShape,
            objects=db_shapes,
            flt_param={"job_id": self.db_job.id}
        )

        for db_attrval in db_attrvals:
            db_attrval.shape_id = db_shapes[db_attrval.shape_id].id

        bulk_create(
            db_model=models.LabeledShapeAttributeVal,
            objects=db_attrvals,
            flt_param={}
        )

        for shape, db_shape in zip(shapes, db_shapes):
            shape["id"] = db_shape.id

        self.data["shapes"] = shapes

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
            tag["attributes"] = attributes

        db_tags = bulk_create(
            db_model=models.LabeledImage,
            objects=db_tags,
            flt_param={"job_id": self.db_job.id}
        )

        for db_attrval in db_attrvals:
            db_attrval.tag_id = db_tags[db_attrval.tag_id].id

        bulk_create(
            db_model=models.LabeledImageAttributeVal,
            objects=db_attrvals,
            flt_param={}
        )

        for tag, db_tag in zip(tags, db_tags):
            tag["id"] = db_tag.id

        self.data["tags"] = tags

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

    def _init_tags_from_db(self):
        db_tags = self.db_job.labeledimage_set.prefetch_related(
            "label",
            "labeledimageattributeval_set"
        ).values(
            'id',
            'frame',
            'label_id',
            'group',
            'labeledimageattributeval__spec_id',
            'labeledimageattributeval__value',
            'labeledimageattributeval__id',
        )
        db_tags = _merge_table_rows(
            rows=db_tags,
            keys_for_merge={
                "labeledimageattributeval_set": [
                    'labeledimageattributeval__spec_id',
                    'labeledimageattributeval__value',
                    'labeledimageattributeval__id',
                ],
            },
            field_id='id',
        )
        serializer = serializers.LabeledImageSerializer(db_tags, many=True)
        self.data["tags"] = serializer.data

    def _init_shapes_from_db(self):
        db_shapes = self.db_job.labeledshape_set.prefetch_related(
            "label",
            "labeledshapeattributeval_set"
        ).values(
            'id',
            'label_id',
            'type',
            'frame',
            'group',
            'occluded',
            'z_order',
            'points',
            'labeledshapeattributeval__spec_id',
            'labeledshapeattributeval__value',
            'labeledshapeattributeval__id',
            )

        db_shapes = _merge_table_rows(
            rows=db_shapes,
            keys_for_merge={
                'labeledshapeattributeval_set': [
                    'labeledshapeattributeval__spec_id',
                    'labeledshapeattributeval__value',
                    'labeledshapeattributeval__id',
                ],
            },
            field_id='id',
        )

        serializer = serializers.LabeledShapeSerializer(db_shapes, many=True)
        self.data["shapes"] = serializer.data

    def _init_tracks_from_db(self):
        db_tracks = self.db_job.labeledtrack_set.prefetch_related(
            "label",
            "labeledtrackattributeval_set",
            "trackedshape_set__trackedshapeattributeval_set"
        ).values(
            "id",
            "frame",
            "label_id",
            "group",
            "labeledtrackattributeval__spec_id",
            "labeledtrackattributeval__value",
            "labeledtrackattributeval__id",
            "trackedshape__type",
            "trackedshape__occluded",
            "trackedshape__z_order",
            "trackedshape__points",
            "trackedshape__id",
            "trackedshape__frame",
            "trackedshape__outside",
            "trackedshape__trackedshapeattributeval__spec_id",
            "trackedshape__trackedshapeattributeval__value",
            "trackedshape__trackedshapeattributeval__id",
        )

        db_tracks = _merge_table_rows(
            rows=db_tracks,
            keys_for_merge={
                "labeledtrackattributeval_set": [
                    "labeledtrackattributeval__spec_id",
                    "labeledtrackattributeval__value",
                    "labeledtrackattributeval__id",
                ],
                "trackedshape_set":[
                    "trackedshape__type",
                    "trackedshape__occluded",
                    "trackedshape__z_order",
                    "trackedshape__points",
                    "trackedshape__id",
                    "trackedshape__frame",
                    "trackedshape__outside",
                    "trackedshape__trackedshapeattributeval__spec_id",
                    "trackedshape__trackedshapeattributeval__value",
                    "trackedshape__trackedshapeattributeval__id",
                ],
            },
            field_id="id",
        )

        for db_track in db_tracks:
            db_track["trackedshape_set"] = _merge_table_rows(db_track["trackedshape_set"], {
                'trackedshapeattributeval_set': [
                    'trackedshapeattributeval__value',
                    'trackedshapeattributeval__spec_id',
                    'trackedshapeattributeval__id',
                ]
            }, 'id')

        serializer = serializers.LabeledTrackSerializer(db_tracks, many=True)
        self.data["tracks"] = serializer.data

    def init_from_db(self):
        self._init_tags_from_db()
        self._init_shapes_from_db()
        self._init_tracks_from_db()

class AnnotationWriter:
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

class XmlAnnotationWriter(AnnotationWriter):
    def __init__(self, file):
        super().__init__(file, "1.1")
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
            elif isinstance(v, list):
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

def _calc_shape_area(shape):
    return shape.area

def _calc_overlap_shape_area(shape0, shape1):
    shape = shape0.intersection(shape1)
    return shape.area

def _calc_similarity(p0, p1):
    overlap_area = _calc_overlap_shape_area(p0, p1)
    shape0_area = _calc_shape_area(p0)
    shape1_area = _calc_shape_area(p1)

    return overlap_area / (shape0_area + shape1_area - overlap_area)

def _pairwise(iterable):
    a = iter(iterable)
    return zip(a, a)

def _calc_shapes_similarity(shape0, shape1):
    if shape0["type"] == shape1["type"]:
        if shape0["type"] == models.ShapeType.RECTANGLE:
            p0 = geometry.box(*shape0["points"])
            p1 = geometry.box(*shape1["points"])

            return _calc_similarity(p0, p1)
        elif shape0["type"] == models.ShapeType.POLYGON:
            p0 = geometry.Polygon(_pairwise(shape0["points"]))
            p1 = geometry.Polygon(_pairwise(shape0["points"]))

            return _calc_similarity(p0, p1)
        else:
            return 0 # FIXME: need some similarity for points and polylines
    return 0

def _calc_avg_shape(shape0, shape1):
    # FIXME: need to calculate an average shape here
    if shape0["type"] == shape1["type"]:
        if shape0["type"] == models.ShapeType.RECTANGLE:
            return shape0
        elif shape0["type"] == models.ShapeType.POLYGON:
            return shape0
        else:
            return shape0

class TaskAnnotation:
    def __init__(self, pk):
        self.db_task = models.Task.objects.get(id=pk)
        self.db_jobs = models.Job.objects.select_related("segment").filter(segment__task_id=pk)
        self.reset()

    def reset(self):
        self.data = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": []
        }

    def _patch_data(self, data, action):
        splitted_data = {}
        jobs = {}
        for db_job in self.db_jobs:
            jid = db_job.id
            start = db_job.segment.start_frame
            stop = db_job.segment.stop_frame
            jobs[jid] = { "start": start, "stop": stop }
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
                _data = patch_job_data(jid, job_data, action)
                self._merge_data(_data, jobs[jid]["start"], self.db_task.overlap)


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
            annotation = JobAnnotation(db_job.id)
            annotation.init_from_db()
            db_segment = db_job.segment
            self._merge_data(annotation.data, db_segment.start_frame,
                self.db_task.overlap)

    def _merge_data(self, data, start_frame, overlap):
        self._merge_tags(data["tags"], start_frame, overlap)
        self._merge_shapes(data["shapes"], start_frame, overlap)
        self._merge_tracks(data["tracks"], start_frame, overlap)


    def _merge_tags(self, tags, start_frame, overlap):
        # FIXME: implement merge algorithm here
        self.data["tags"].extend(tags)

    def _merge_shapes(self, shapes, start_frame, overlap):
        # 1. Split shapes on two parts: new and which can be intersected
        # with existing boxes.
        new_shapes = [shape for shape in shapes
            if shape["frame"] >= start_frame + overlap]
        int_shapes = [shape for shape in shapes
            if shape["frame"] < start_frame + overlap]
        assert len(new_shapes) + len(int_shapes) == len(shapes)

        # 2. Convert to more convenient data structure (shapes by frame)
        int_shapes_by_frame = {}
        for shape in int_shapes:
            if shape["frame"] in int_shapes_by_frame:
                int_shapes_by_frame[shape["frame"]].append(shape)
            else:
                int_shapes_by_frame[shape["frame"]] = [shape]

        old_shapes_by_frame = {}
        for shape in self.data["shapes"]:
            if shape["frame"] >= start_frame:
                if shape["frame"] in old_shapes_by_frame:
                    old_shapes_by_frame[shape["frame"]].append(shape)
                else:
                    old_shapes_by_frame[shape["frame"]] = [shape]

        # 3. Add new shapes as is. It should be done only after old_shapes_by_frame
        # variable is initialized.
        self.data["shapes"].extend(new_shapes)

        # Nothing to merge here. Just add all int_shapes if any.
        if not old_shapes_by_frame or not int_shapes_by_frame:
            self.data["shapes"].extend(int_shapes)
            return

        # 4. Build cost matrix for each frame and find correspondence using
        # Hungarian algorithm. In this case min_cost_thresh is stronger
        # because we compare only on one frame.
        min_cost_thresh = 0.25
        for frame in int_shapes_by_frame:
            if frame in old_shapes_by_frame:
                int_shapes = int_shapes_by_frame[frame]
                old_shapes = old_shapes_by_frame[frame]
                cost_matrix = np.empty(shape=(len(int_shapes), len(old_shapes)),
                    dtype=float)
                # 5.1 Construct cost matrix for the frame.
                for i, shape0 in enumerate(int_shapes):
                    for j, shape1 in enumerate(old_shapes):
                        if shape0["label_id"] == shape1["label_id"]:
                            cost_matrix[i][j] = 1 - _calc_shapes_similarity(shape0, shape1)
                        else:
                            cost_matrix[i][j] = 1

                # 6. Find optimal solution using Hungarian algorithm.
                row_ind, col_ind = linear_sum_assignment(cost_matrix)
                int_shapes_indexes = list(range(0, len(int_shapes)))
                for i, j in zip(row_ind, col_ind):
                    # Reject the solution if the cost is too high. Remember
                    # inside int_boxes_indexes boxes which were handled.
                    if cost_matrix[i][j] <= min_cost_thresh:
                        old_shapes[j] = _calc_avg_shape(old_shapes[j], int_shapes[i])
                        int_shapes_indexes[i] = -1

                # 7. Add all boxes which were not processed.
                for i in int_shapes_indexes:
                    if i != -1:
                        self.data["shapes"].append(int_shapes[i])
            else:
                # We don't have old boxes on the frame. Let's add all new ones.
                self.data["shapes"].extend(int_shapes_by_frame[frame])

    def _merge_tracks(self, tracks, start_frame, overlap):
        # FIXME: implement merge algorithm here
        self.data["tracks"].extend(tracks)

    def dump(self, file_path, scheme, host, query_params):
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

        db_task = self.db_task
        db_segments = db_task.segment_set.all().prefetch_related('job_set')
        db_labels = db_task.label_set.all().prefetch_related('attributespec_set')
        im_meta_data = get_image_meta_cache(db_task)['original_size']

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
                        ("attributes", [
                            ("attribute", OrderedDict([
                                ("name", db_attr.name),
                                ("mutable", str(db_attr.mutable)),
                                ("input_type", db_attr.input_type),
                                ("default_value", db_attr.default_value),
                                ("values", db_attr.values)]))
                            for db_attr in db_label.attributespec_set.all()])
                    ])) for db_label in db_labels
                ]),

                ("segments", [
                    ("segment", OrderedDict([
                        ("id", str(db_segment.id)),
                        ("start", str(db_segment.start_frame)),
                        ("stop", str(db_segment.stop_frame)),
                        ("url", "{0}://{1}/?id={2}".format(
                            scheme, host, db_segment.job_set.all()[0].id))]
                    )) for db_segment in db_segments
                ]),

                ("owner", OrderedDict([
                    ("username", db_task.owner.username),
                    ("email", db_task.owner.email)
                ]) if db_task.owner else ""),
            ])),
            ("dumped", str(timezone.localtime(timezone.now())))
        ])

        if db_task.mode == "interpolation":
            meta["task"]["original_size"] = OrderedDict([
                ("width", str(im_meta_data[0]["width"])),
                ("height", str(im_meta_data[0]["height"]))
            ])

        with open(file_path, "w") as dump_file:
            dumper = XmlAnnotationWriter(dump_file)
            dumper.open_root()
            dumper.add_meta(meta)

            # if db_task.mode == "annotation":
            #     shapes = {}
            #     shapes["boxes"] = {}
            #     shapes["polygons"] = {}
            #     shapes["polylines"] = {}
            #     shapes["points"] = {}
            #     for shape in self.to_shapes["shapes"]:
            #         if shape.type == models.ShapeType.RECTANGLE:
            #             if shape.frame not in shapes["boxes"]:
            #                 shapes["boxes"][shape.frame] = []
            #             shapes["boxes"][shape.frame].append(Rectangle(shape))
            #         elif shape.type == models.ShapeType.POLYGON:
            #             if shape.frame not in shapes["polygons"]:
            #                 shapes["polygons"][shape.frame] = []
            #             shapes["polygons"][shape.frame].append(Polygon(shape))
            #         elif shape.type == models.ShapeType.POLYLINE:
            #             if shape.frame not in shapes["polylines"]:
            #                 shapes["polylines"][shape.frame] = []
            #             shapes["polylines"][shape.frame].append(Polyline(shape))
            #         elif shape.type == models.ShapeType.POINTS:
            #             if shape.frame not in shapes["points"]:
            #                 shapes["points"][shape.frame] = []
            #             shapes["points"][shape.frame].append(Points(shape))

            #     for frame in sorted(set(list(shapes["boxes"].keys()) +
            #         list(shapes["polygons"].keys()) +
            #         list(shapes["polylines"].keys()) +
            #         list(shapes["points"].keys()))):

            #         link = db_task.get_frame_path(frame)
            #         path = os.readlink(link)

            #         rpath = path.split(os.path.sep)
            #         rpath = os.path.sep.join(rpath[rpath.index(".upload")+1:])

            #         im_w = im_meta_data[frame]['width']
            #         im_h = im_meta_data[frame]['height']

            #         dumper.open_image(OrderedDict([
            #             ("id", str(frame)),
            #             ("name", rpath),
            #             ("width", str(im_meta_data[frame]["width"])),
            #             ("height", str(im_meta_data[frame]["height"]))
            #         ]))

            #         for shape_type in ["boxes", "polygons", "polylines", "points"]:
            #             shape_dict = shapes[shape_type]
            #             if frame in shape_dict:
            #                 for shape in shape_dict[frame]:
            #                     if shape_type == "boxes":
            #                         if db_task.flipped:
            #                             _flip_box(shape, im_w, im_h)

            #                         dump_dict = OrderedDict([
            #                             ("label", shape.label.name),
            #                             ("xtl", "{:.2f}".format(shape.xtl)),
            #                             ("ytl", "{:.2f}".format(shape.ytl)),
            #                             ("xbr", "{:.2f}".format(shape.xbr)),
            #                             ("ybr", "{:.2f}".format(shape.ybr)),
            #                             ("occluded", str(int(shape.occluded))),
            #                         ])
            #                         if db_task.z_order:
            #                             dump_dict['z_order'] = str(shape.z_order)
            #                         if shape.group_id:
            #                             dump_dict['group_id'] = str(shape.group_id)
            #                         dumper.open_box(dump_dict)
            #                     else:
            #                         if db_task.flipped:
            #                             _flip_shape(shape, im_w, im_h)

            #                         dump_dict = OrderedDict([
            #                             ("label", shape.label.name),
            #                             ("points", ';'.join((
            #                                 ','.join((
            #                                     "{:.2f}".format(float(p.split(',')[0])),
            #                                     "{:.2f}".format(float(p.split(',')[1]))
            #                                 )) for p in shape.points.split(' '))
            #                             )),
            #                             ("occluded", str(int(shape.occluded))),
            #                         ])

            #                         if db_task.z_order:
            #                             dump_dict['z_order'] = str(shape.z_order)
            #                         if shape.group_id:
            #                             dump_dict['group_id'] = str(shape.group_id)

            #                         if shape_type == "polygons":
            #                             dumper.open_polygon(dump_dict)
            #                         elif shape_type == "polylines":
            #                             dumper.open_polyline(dump_dict)
            #                         else:
            #                             dumper.open_points(dump_dict)

            #                     for attr in shape.attributes:
            #                         dumper.add_attribute(OrderedDict([
            #                             ("name", attr.name),
            #                             ("value", attr.value)
            #                         ]))

            #                     if shape_type == "boxes":
            #                         dumper.close_box()
            #                     elif shape_type == "polygons":
            #                         dumper.close_polygon()
            #                     elif shape_type == "polylines":
            #                         dumper.close_polyline()
            #                     else:
            #                         dumper.close_points()

            #         dumper.close_image()
            # else:
            #     paths = {}
            #     paths["boxes"] = self.to_box_paths()
            #     paths["polygons"] = self.to_polygon_paths()
            #     paths["polylines"] = self.to_polyline_paths()
            #     paths["points"] = self.to_points_paths()

            #     im_w = im_meta_data[0]['width']
            #     im_h = im_meta_data[0]['height']

            #     counter = 0
            #     for shape_type in ["boxes", "polygons", "polylines", "points"]:
            #         path_list = paths[shape_type]
            #         for path in path_list:
            #             path_id = path.client_id if path.client_id != -1 else counter
            #             counter += 1
            #             dump_dict = OrderedDict([
            #                 ("id", str(path_id)),
            #                 ("label", path.label.name),
            #             ])
            #             if path.group_id:
            #                 dump_dict['group_id'] = str(path.group_id)
            #             dumper.open_track(dump_dict)
            #             if shape_type == "boxes":
            #                 for box in path.get_interpolated_boxes():
            #                     if db_task.flipped:
            #                         _flip_box(box, im_w, im_h)
            #                     dump_dict = OrderedDict([
            #                         ("frame", str(box.frame)),
            #                         ("xtl", "{:.2f}".format(box.xtl)),
            #                         ("ytl", "{:.2f}".format(box.ytl)),
            #                         ("xbr", "{:.2f}".format(box.xbr)),
            #                         ("ybr", "{:.2f}".format(box.ybr)),
            #                         ("outside", str(int(box.outside))),
            #                         ("occluded", str(int(box.occluded))),
            #                         ("keyframe", str(int(box.keyframe)))
            #                     ])

            #                     if db_task.z_order:
            #                         dump_dict["z_order"] = str(box.z_order)

            #                     dumper.open_box(dump_dict)
            #                     for attr in path.attributes + box.attributes:
            #                         dumper.add_attribute(OrderedDict([
            #                             ("name", attr.name),
            #                             ("value", attr.value)
            #                         ]))
            #                     dumper.close_box()
            #             else:
            #                 for shape in path.get_interpolated_shapes():
            #                     if db_task.flipped:
            #                         _flip_shape(shape, im_w, im_h)
            #                     dump_dict = OrderedDict([
            #                         ("frame", str(shape.frame)),
            #                         ("points", ';'.join((
            #                             ','.join((
            #                                 "{:.2f}".format(float(p.split(',')[0])),
            #                                 "{:.2f}".format(float(p.split(',')[1]))
            #                             )) for p in shape.points.split(' '))
            #                         )),
            #                         ("outside", str(int(shape.outside))),
            #                         ("occluded", str(int(shape.occluded))),
            #                         ("keyframe", str(int(shape.keyframe)))
            #                     ])

            #                     if db_task.z_order:
            #                         dump_dict["z_order"] = str(shape.z_order)

            #                     if shape_type == "polygons":
            #                         dumper.open_polygon(dump_dict)
            #                     elif shape_type == "polylines":
            #                         dumper.open_polyline(dump_dict)
            #                     else:
            #                         dumper.open_points(dump_dict)

            #                     for attr in path.attributes + shape.attributes:
            #                         dumper.add_attribute(OrderedDict([
            #                             ("name", attr.name),
            #                             ("value", attr.value)
            #                         ]))

            #                     if shape_type == "polygons":
            #                         dumper.close_polygon()
            #                     elif shape_type == "polylines":
            #                         dumper.close_polyline()
            #                     else:
            #                         dumper.close_points()
            #             dumper.close_track()
            dumper.close_root()
