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

        db_shapes = bulk_create(models.LabeledShape, db_shapes,
            {"job_id": self.db_job.id})

        for db_attrval in db_attrvals:
            db_attrval.shape_id = db_shapes[db_attrval.shape_id].id

        bulk_create(models.LabeledShapeAttributeVal, db_attrvals)

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

        db_tags = bulk_create(models.LabeledImage, db_tags,
            {"job_id": self.db_job.id})

        for db_attrval in db_attrvals:
            db_attrval.tag_id = db_tags[db_attrval.tag_id].id

        bulk_create(models.LabeledImageAttributeVal, db_attrvals)

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

        return serializers.LabeledImageSerializer(db_tags, many=True)

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

        return serializers.LabeledShapeSerializer(db_shapes, many=True)

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

        return serializers.LabeledTrackSerializer(db_tracks, many=True)

    def init_from_db(self):
        self.data["tags"]   = self._init_tags_from_db().data
        self.data["shapes"] = self._init_shapes_from_db().data
        self.data["tracks"] = self._init_tracks_from_db().data

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

class DataManager:
    def __init__(self, data):
        self.data = data

    def merge(self, data, start_frame, overlap):
        tags = TagManager(self.data["tags"])
        tags.merge(data["tags"], start_frame, overlap)

        shapes = ShapeManager(self.data["shapes"])
        shapes.merge(data["shapes"], start_frame, overlap)

        tracks = TrackManager(self.data["tracks"])
        tracks.merge(data["tracks"], start_frame, overlap)

    def to_shapes(self):
        shapes = self.data["shapes"]
        tracks = TrackManager(self.data["tracks"])

        return shapes + tracks.to_shapes()

    def to_tracks(self):
        tracks = self.data["tracks"]
        shapes = ShapeManager(self.data["shapes"])

        return tracks + shapes.to_tracks()

class ObjectManager:
    def __init__(self, objects):
        self.objects = objects

    @staticmethod
    def _get_objects_by_frame(objects, start_frame):
        objects_by_frame = {}
        for obj in objects:
            if obj["frame"] >= start_frame:
                if obj["frame"] in objects_by_frame:
                    objects_by_frame[obj["frame"]].append(obj)
                else:
                    objects_by_frame[obj["frame"]] = [obj]

        return objects_by_frame

    @staticmethod
    def _get_cost_threshold():
        raise NotImplementedError()

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        raise NotImplementedError()

    @staticmethod
    def _unite_objects(obj0, obj1):
        raise NotImplementedError()

    def merge(self, objects, start_frame, overlap):
        # 1. Split objects on two parts: new and which can be intersected
        # with existing objects.
        new_objects = [obj for obj in objects
            if obj["frame"] >= start_frame + overlap]
        int_objects = [obj for obj in objects
            if obj["frame"] < start_frame + overlap]
        assert len(new_objects) + len(int_objects) == len(objects)

        # 2. Convert to more convenient data structure (objects by frame)
        int_objects_by_frame = self._get_objects_by_frame(int_objects, start_frame)
        old_objects_by_frame = self._get_objects_by_frame(self.objects, start_frame)

        # 3. Add new objects as is. It should be done only after old_objects_by_frame
        # variable is initialized.
        self.objects.extend(new_objects)

        # Nothing to merge here. Just add all int_objects if any.
        if not old_objects_by_frame or not int_objects_by_frame:
            self.objects.extend(int_objects)
            return

        # 4. Build cost matrix for each frame and find correspondence using
        # Hungarian algorithm. In this case min_cost_thresh is stronger
        # because we compare only on one frame.
        min_cost_thresh = self._get_cost_threshold()
        for frame in int_objects_by_frame:
            if frame in old_objects_by_frame:
                int_objects = int_objects_by_frame[frame]
                old_objects = old_objects_by_frame[frame]
                cost_matrix = np.empty(obj=(len(int_objects), len(old_objects)),
                    dtype=float)
                # 5.1 Construct cost matrix for the frame.
                for i, int_obj in enumerate(int_objects):
                    for j, old_obj in enumerate(old_objects):
                        cost_matrix[i][j] = 1 - self._calc_objects_similarity(
                            int_obj, old_obj, start_frame, overlap)

                # 6. Find optimal solution using Hungarian algorithm.
                row_ind, col_ind = linear_sum_assignment(cost_matrix)
                int_objects_indexes = list(range(0, len(int_objects)))
                for i, j in zip(row_ind, col_ind):
                    # Reject the solution if the cost is too high. Remember
                    # inside int_objects_indexes objects which were handled.
                    if cost_matrix[i][j] <= min_cost_thresh:
                        old_objects[j] = self._unite_objects(int_objects[i], old_objects[j])
                        int_objects_indexes[i] = -1

                # 7. Add all objects which were not processed.
                for i in int_objects_indexes:
                    if i != -1:
                        self.objects.append(int_objects[i])
            else:
                # We don't have old objects on the frame. Let's add all new ones.
                self.objects.extend(int_objects_by_frame[frame])

class TagManager(ObjectManager):
    @staticmethod
    def _get_cost_threshold():
        raise 0.25

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        # TODO: improve the trivial implementation, compare attributes
        return 1 if obj0["label_id"] == obj1["label_id"] else 0

    @staticmethod
    def _unite_objects(obj0, obj1):
        # TODO: improve the trivial implementation
        return obj0 if obj0["frame"] < obj1["frame"] else obj1

def pairwise(iterable):
    a = iter(iterable)
    return zip(a, a)

class ShapeManager(ObjectManager):
    def to_tracks(self):
        tracks = []
        for shape in self.data["shapes"]:
            shape0 = copy.copy(shape)
            shape0["keyframe"] = True
            shape0["outside"] = False
            shape0.pop("group", None)
            shape0.pop("attributes")
            shape1 = copy.copy(shape0)
            shape1["outside"] = True
            shape1["frame"] += 1

            track = {
                "label_id": shape["label_id"],
                "frame": shape["frame"],
                "group": shape.get(group, None),
                "attributes": shape["attributes"],
                "shapes": [shape0, shape1]
            }
            tracks.append(path)

        return tracks

    @staticmethod
    def _get_cost_threshold():
        raise 0.25

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        def _calc_polygons_similarity(p0, p1):
            overlap_area = p0.intersection(p1).area
            return overlap_area / (p0.area + p1.area - overlap_area)

        has_same_type  = obj0["type"] == obj1["type"]
        has_same_label = obj0["label_id"] == obj1["label_id"]
        if has_same_type and has_same_label:
            if obj0["type"] == models.ShapeType.RECTANGLE:
                p0 = geometry.box(*obj0["points"])
                p1 = geometry.box(*obj1["points"])

                return self._calc_polygons_similarity(p0, p1)
            elif obj0["type"] == models.ShapeType.POLYGON:
                p0 = geometry.Polygon(pairwise(obj0["points"]))
                p1 = geometry.Polygon(pairwise(obj0["points"]))

                return self._calc_polygons_similarity(p0, p1)
            else:
                return 0 # FIXME: need some similarity for points and polylines
        return 0

    @staticmethod
    def _unite_objects(obj0, obj1):
        # TODO: improve the trivial implementation
        return obj0 if obj0["frame"] < obj1["frame"] else obj1

class TrackManager(ObjectManager):
    def to_shapes(self):
        shapes = []
        for track in self.data["tracks"]:
            for shape in TrackManager.get_interpolated_shapes(track):
                if not shape["outside"]:
                    shape.pop("outside")
                    shape["label_id"] = track["label_id"]
                    shape["group"] = track["group"]
                    shape["attributes"] += track["attributes"]

                    shapes.append(shape)

        return shapes

    @staticmethod
    def _get_objects_by_frame(objects, start_frame):
        # Just for unification. All tracks are assigned on the same frame
        objects_by_frame = {0: []}
        for obj in objects:
            shape = obj["shapes"][-1] # optimization for old tracks
            if shape["frame"] >= start_frame or shape["outside"]:
                objects_by_frame[0].append(obj)

        if not objects_by_frame[0]:
            objects_by_frame = {}

        return objects_by_frame

    @staticmethod
    def _get_cost_threshold():
        raise 0.5

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        if obj0["label_id"] == obj1["label_id"]:
            # Here start_frame is the start frame of next segment
            # and stop_frame is the stop frame of current segment
            stop_frame = start_frame + overlap - 1
            obj0_shapes = self.get_interpolated_shapes(obj0, start_frame, stop_frame)
            obj1_shapes = self.get_interpolated_shapes(obj1, start_frame, stop_frame)
            obj0_shapes_by_frame = {shape["frame"]:shape for shape in obj0_shapes}
            obj1_shapes_by_frame = {shape["frame"]:shape for shape in obj1_shapes}
            assert obj0_shapes_by_frame and obj1_shapes_by_frame

            count, error = 0, 0
            for frame in range(start_frame, stop_frame + 1):
                shape0 = obj0_shapes_by_frame.get(frame)
                shape1 = obj1_shapes_by_frame.get(frame)
                if shape0 and shape1:
                    if shape0["outside"] != shape1["outside"]:
                        error += 1
                    else:
                        error += 1 - ShapeManager._calc_objects_similarity(shape0, shape1)
                    count += 1
                elif shape0 or shape1:
                    error += 1
                    count += 1

            return 1 - error / count
        else:
            return 0

    @staticmethod
    def get_interpolated_shapes(obj0, start_frame = None, stop_frame = None):
        if start_frame is None:
            start_frame = obj0["frame"]

        if stop_frame is None:
            stop_frame = obj0["shapes"][-1]["frame"]

    @staticmethod
    def _unite_objects(obj0, obj1):
        track = obj0 if obj0["frame"] < obj1["frame"] else obj1
        assert obj0["label_id"] == obj1["label_id"]
        shapes = {shape["frame"]:shape for shape in obj0["shapes"]}
        for shape in obj1["shapes"]:
            frame = shape["frame"]
            if frame in shapes:
                shapes[frame] = ShapeManager._unite_objects(shapes[frame], shape)
            else:
                shapes[frame] = shape

        track["frame"] = min(obj0["frame"], obj1["frame"])
        track["shapes"] = list(sorted(shapes.values(), key=lambda shape: shape["frame"]))
        track["interpoated_shapes"] = {}

        return track

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

    def _merge_data(self, data, start_frame, overlap):
        DataManager(self.data).merge(data, start_frame, overlap)

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
            start_frame = db_segment.start_frame
            overlap = self.db_task.overlap
            self._merge_data(annotation.data, start_frame, overlap)

    @staticmethod
    def _flip_shape(shape, im_w, im_h):
        for x in range(0, len(shape["points"]), 2):
            y = x + 1
            shape["points"][x] = im_w - shape["points"][x]
            shape["points"][y] = im_w - shape["points"][y]

    def dump(self, file_path, scheme, host, query_params):
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

            if db_task.mode == "annotation":
                shapes = {}
                data_manager = DataManager(self.data)
                for shape in data_manager.to_shapes():
                    frame = shape["frame"]
                    if frame not in shapes:
                        shapes[frame] = []
                    shapes[frame].append(shape)

                for frame in sorted(set(list(shapes.keys()))):
                    link = db_task.get_frame_path(frame)
                    track = os.readlink(link)

                    rpath = track.split(os.path.sep)
                    rpath = os.path.sep.join(rpath[rpath.index(".upload")+1:])

                    im_w = im_meta_data[frame]['width']
                    im_h = im_meta_data[frame]['height']

                    dumper.open_image(OrderedDict([
                        ("id", str(frame)),
                        ("name", rpath),
                        ("width", str(im_meta_data[frame]["width"])),
                        ("height", str(im_meta_data[frame]["height"]))
                    ]))

                    for shape in shapes.get(frame, []):
                        if db_task.flipped:
                            self._flip_shape(shape, im_w, im_h)

                        db_label = db_labels.get(shape["label_id"])

                        dump_data = OrderedDict([
                            ("label", db_label.name),
                            ("occluded", str(int(shape["occluded"]))),
                        ])

                        if shape["type"] == models.ShapeType.RECTANGLE:
                            dump_data.update(OrderedDict([
                                ("xtl", "{:.2f}".format(shape["points"][0])),
                                ("ytl", "{:.2f}".format(shape["points"][1])),
                                ("xbr", "{:.2f}".format(shape["points"][2])),
                                ("ybr", "{:.2f}".format(shape["points"][3]))
                            ]))
                        else:
                            dump_data.update(OrderedDict([
                                ("points", ';'.join((
                                    ','.join((
                                        "{:.2f}".format(x),
                                        "{:.2f}".format(y)
                                    )) for x,y in pairwise(shape["points"]))
                                )),
                            ]))

                        if db_task.z_order:
                            dump_data['z_order'] = str(shape["z_order"])
                        if shape.group_id:
                            dump_data['group_id'] = str(shape["group"])

                        if shape["type"] == models.ShapeType.RECTANGLE:
                            dumper.open_box(dump_data)
                        elif shape["type"] == models.ShapeType.POLYGON:
                            dumper.open_polygon(dump_data)
                        elif shape["type"] == models.ShapeType.POLYLINE:
                            dumper.open_polyline(dump_data)
                        elif shape["type"] == models.ShapeType.POINTS:
                            dumper.open_points(dump_data)
                        else:
                            raise NotImplementedError("unknown shape type")

                        for attr in shape["attributes"]:
                            db_attribute = db_label.attributespec_set.get(attr["spec_id"])
                            dumper.add_attribute(OrderedDict([
                                ("name", db_attribute.name),
                                ("value", attr["value"])
                            ]))

                        elif shape["type"] == models.ShapeType.RECTANGLE:
                            dumper.close_box()
                        elif shape["type"] == models.ShapeType.POLYGON:
                            dumper.close_polygon()
                        elif shape["type"] == models.ShapeType.POLYLINE:
                            dumper.close_polyline()
                        elif shape["type"] == models.ShapeType.POINTS:
                            dumper.close_points()
                        else:
                            raise NotImplementedError("unknown shape type")

                    dumper.close_image()
            else:
                data_manager = DataManager(self.data)
                tracks = data_manager.to_tracks()

                im_w = im_meta_data[0]['width']
                im_h = im_meta_data[0]['height']

                counter = 0
                for track in tracks:
                    track_id = counter
                    counter += 1
                    db_label = db_labels.get(track["label_id"])
                    dump_data = OrderedDict([
                        ("id", str(track_id)),
                        ("label", db_label.name),
                    ])
                    if track["group"]:
                        dump_data['group_id'] = str(track["group"])
                    dumper.open_track(dump_data)
                    for shape in TrackManager.get_interpolated_shapes(track):
                        if db_task.flipped:
                            self._flip_shape(shape, im_w, im_h)

                        dump_data = OrderedDict([
                            ("frame", str(shape["frame"])),
                            ("outside", str(int(shape["outside"]))),
                            ("occluded", str(int(shape["occluded"]))),
                            ("keyframe", str(int(shape["keyframe"])))
                        ])

                        if shape["type"] == models.ShapeType.RECTANGLE:
                            dump_data.update(OrderedDict([
                                ("xtl", "{:.2f}".format(shape["points"][0])),
                                ("ytl", "{:.2f}".format(shape["points"][1])),
                                ("xbr", "{:.2f}".format(shape["points"][2])),
                                ("ybr", "{:.2f}".format(shape["points"][3])),
                            ]))
                        else:
                            dump_data.update(OrderedDict([
                                ("points", ';'.join((
                                    ','.join((
                                        "{:.2f}".format(x)),
                                        "{:.2f}".format(y))
                                    )) for x,y in pairwise(shape["points"])
                                ))
                            ])))

                        if db_task.z_order:
                            dump_data["z_order"] = str(shape["z_order"])

                        if shape["type"] == models.ShapeType.RECTANGLE:
                            dumper.open_box(dump_data)
                        elif shape["type"] == models.ShapeType.POLYGON:
                            dumper.open_polygon(dump_data)
                        elif shape["type"] == models.ShapeType.POLYLINE:
                            dumper.open_polyline(dump_data)
                        elif shape["type"] == models.ShapeType.POINTS:
                            dumper.open_points(dump_data)
                        else:
                            raise NotImplementedError("unknown shape type")

                        for attr in shape["attributes"]:
                            db_attribute = db_label.attributespec_set.get(attr["spec_id"])
                            dumper.add_attribute(OrderedDict([
                                ("name", db_attribute.name),
                                ("value", attr["value"])
                            ]))

                        if shape["type"] == models.ShapeType.RECTANGLE:
                            dumper.close_box()
                        elif shape["type"] == models.ShapeType.POLYGON:
                            dumper.close_polygon()
                        elif shape["type"] == models.ShapeType.POLYLINE:
                            dumper.close_polyline()
                        elif shape["type"] == models.ShapeType.POINTS:
                            dumper.close_points()
                        else:
                            raise NotImplementedError("unknown shape type")
                dumper.close_track()
            dumper.close_root()
