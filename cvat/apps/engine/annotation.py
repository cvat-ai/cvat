# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import copy
from enum import Enum
from django.utils import timezone
import numpy as np
from scipy.optimize import linear_sum_assignment
from collections import OrderedDict
from abc import ABC, abstractmethod
from PIL import Image
from shapely import geometry

from django.conf import settings
from django.db import transaction

from cvat.apps.profiler import silk_profile
from cvat.apps.engine.plugins import plugin_decorator
from . import models
from .task import get_image_meta_cache
from .log import slogger
from . import serializers
from .utils.import_modules import import_modules

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
def get_job_data(pk, user):
    annotation = JobAnnotation(pk, user)
    annotation.init_from_db()

    return annotation.data

@silk_profile(name="POST job data")
@transaction.atomic
def put_job_data(pk, user, data):
    annotation = JobAnnotation(pk, user)
    annotation.put(data)

    return annotation.data

@silk_profile(name="UPDATE job data")
@plugin_decorator
@transaction.atomic
def patch_job_data(pk, user, data, action):
    annotation = JobAnnotation(pk, user)
    if action == PatchAction.CREATE:
        annotation.create(data)
    elif action == PatchAction.UPDATE:
        annotation.update(data)
    elif action == PatchAction.DELETE:
        annotation.delete(data)

    return annotation.data

@silk_profile(name="DELETE job data")
@transaction.atomic
def delete_job_data(pk, user):
    annotation = JobAnnotation(pk, user)
    annotation.delete()

@silk_profile(name="GET task data")
@transaction.atomic
def get_task_data(pk, user):
    annotation = TaskAnnotation(pk, user)
    annotation.init_from_db()

    return annotation.data

@silk_profile(name="POST task data")
@transaction.atomic
def put_task_data(pk, user, data):
    annotation = TaskAnnotation(pk, user)
    annotation.put(data)

    return annotation.data

@silk_profile(name="UPDATE task data")
@transaction.atomic
def patch_task_data(pk, user, data, action):
    annotation = TaskAnnotation(pk, user)
    if action == PatchAction.CREATE:
        annotation.create(data)
    elif action == PatchAction.UPDATE:
        annotation.update(data)
    elif action == PatchAction.DELETE:
        annotation.delete(data)

    return annotation.data

@silk_profile(name="DELETE task data")
@transaction.atomic
def delete_task_data(pk, user):
    annotation = TaskAnnotation(pk, user)
    annotation.delete()


def dump_task_data(pk, user, file_path, scheme, host, query_params, dumper):
    # For big tasks dump function may run for a long time and
    # we dont need to acquire lock after _AnnotationForTask instance
    # has been initialized from DB.
    # But there is the bug with corrupted dump file in case 2 or more dump request received at the same time.
    # https://github.com/opencv/cvat/issues/217
    with transaction.atomic():
        annotation = TaskAnnotation(pk, user)
        annotation.init_from_db()

    annotation.dump(file_path, scheme, host, query_params, dumper)

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
            if item.id is not None:
                merged_rows[row_id][key].append(item)

    # Remove redundant keys from final objects
    redundant_keys = [item for values in keys_for_merge.values() for item in values]
    for i in merged_rows:
        for j in redundant_keys:
            del merged_rows[i][j]

    return list(merged_rows.values())

class AnnotationIR:
    def __init__(self):
        self.reset()

    def add_tag(self, tag):
        raise NotImplementedError

    def add_shape(self, shape):
        raise NotImplementedError

    def add_track(self, track):
        raise NotImplementedError

    @property
    def frame_info(self):
        return self._frame_info

    @property
    def tags(self):
        return self._tags

    @property
    def shapes(self):
        return self._shapes

    @property
    def tracks(self):
        return self._tracks

    @property
    def version(self):
        return self._version

    @property
    def meta(self):
        return self._meta

    @tags.setter
    def tags(self, tags):
        self._tags = tags

    @shapes.setter
    def shapes(self, shapes):
        self._shapes = shapes

    @tracks.setter
    def tracks(self, tracks):
        self._tracks = tracks

    @version.setter
    def version(self, version):
        self._version = version

    def reset(self):
        self._version = 0
        self._tags = []
        self._shapes = []
        self._tracks = []

class AnnotationExporter:
    def __init__(self, annotation_ir, db_task, scheme, host):
        self._annotation_ir = annotation_ir
        self._db_task = db_task
        self._scheme = scheme
        self._host = host

        db_labels = self._db_task.label_set.all().prefetch_related('attributespec_set')
        self._label_mapping = {db_label.id:db_label for db_label in db_labels}
        self._attribute_mapping = {db_attribute.id:db_attribute
            for db_label in db_labels
            for db_attribute in db_label.attributespec_set.all()}

        self._init_frame_info()
        self._init_meta()

    def _init_frame_info(self):
        if self._db_task.mode == "interpolation":
            self._frame_info = {
                frame: {
                    "path": str(frame),
                    "width": self._db_task.video.width,
                    "height": self._db_task.video.height,
                } for frame in range(self._db_task.size)
            }
        else:
            self._frame_info = {db_image.frame: db_image
                for db_image in self._db_task.image_set.all()}

    def _init_meta(self):
        db_segments = self._db_task.segment_set.all().prefetch_related('job_set')
        self._meta = OrderedDict([
            ("task", OrderedDict([
                ("id", str(self._db_task.id)),
                ("name", self._db_task.name),
                ("size", str(self._db_task.size)),
                ("mode", self._db_task.mode),
                ("overlap", str(self._db_task.overlap)),
                ("bugtracker", self._db_task.bug_tracker),
                ("created", str(timezone.localtime(self._db_task.created_date))),
                ("updated", str(timezone.localtime(self._db_task.updated_date))),
                ("start_frame", str(self._db_task.start_frame)),
                ("stop_frame", str(self._db_task.stop_frame)),
                ("frame_filter", self._db_task.frame_filter),
                ("z_order", self._db_task.z_order),

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
                    ])) for db_label in self._label_mapping.values()
                ]),

                ("segments", [
                    ("segment", OrderedDict([
                        ("id", str(db_segment.id)),
                        ("start", str(db_segment.start_frame)),
                        ("stop", str(db_segment.stop_frame)),
                        ("url", "{0}://{1}/?id={2}".format(
                            self._scheme, self._host, db_segment.job_set.all()[0].id))]
                    )) for db_segment in db_segments
                ]),

                ("owner", OrderedDict([
                    ("username", self._db_task.owner.username),
                    ("email", self._db_task.owner.email)
                ]) if self._db_task.owner else ""),
            ])),
            ("dumped", str(timezone.localtime(timezone.now())))
        ])

        if self._db_task.mode == "interpolation":
            self._meta["task"]["original_size"] = OrderedDict([
                ("width", str(self._db_task.video.width)),
                ("height", str(self._db_task.video.height))
            ])
            # Add source to dumped file
            self._meta["source"] = str(self._db_task.video.path)

    def _export_shape(self, shape):
        exported_shape = {
            "type": shape["type"],
            "label": self._label_mapping[shape["label_id"]].name,
            "outside": str(int(shape.get("outside", False))),
            "occluded": str(int(shape["occluded"])),
            "points": shape["points"],
            "z_order": shape["z_order"],
            "keyframe": shape.get("keyframe", True),
            "attributes": {},
        }
        if "group" in shape and shape["group"]:
            exported_shape["group"] = shape["group"]

        if "track_id" in shape:
            exported_shape["track_id"] = shape["track_id"]

        for attr in shape["attributes"]:
            db_attribute = self._attribute_mapping[attr["spec_id"]]
            exported_shape["attributes"][db_attribute.name] = attr["value"]

        return exported_shape

    def export_as_shapes(self):
        if self._frame_info == None or self._meta == None or self._label_mapping == None or self._attribute_mapping == None:
            raise Exception("Annotation exporter is not initialized properly")

        annotations = []
        data_manager = DataManager(self._annotation_ir)
        for shape in data_manager.to_shapes(int(self._db_task.size)):
            frame = self._db_task.start_frame + shape["frame"] * self._db_task.get_frame_step()
            db_image = self._frame_info[frame]
            rpath = db_image['path'].split(os.path.sep)
            if len(rpath) != 1:
                rpath = os.path.sep.join(rpath[rpath.index(".upload")+1:])
            else:
                rpath = rpath[0]
            annotations.append({
                "frame": frame,
                "height": db_image["height"],
                "width": db_image["width"],
                "name": rpath,
                "shapes": [],
            })

            annotations[frame]["shapes"].append(self._export_shape(shape))
        return annotations

    def get_meta(self):
        return self._meta

class AnnoDumper(ABC):
    def __init__(self, anno_IR):
        self._ir = anno_IR

    @abstractmethod
    def dump(self, filename):
        pass

class AnnoParser(ABC):
    def __init__(self, anno_IR):
        self._ir = anno_IR

    @abstractmethod
    def parse(self, filename):
        pass

class JobAnnotation:
    def __init__(self, pk, user):
        self.user = user
        self.db_job = models.Job.objects.select_related('segment__task') \
            .select_for_update().get(id=pk)

        db_segment = self.db_job.segment
        self.start_frame = db_segment.start_frame
        self.stop_frame = db_segment.stop_frame
        self.ir_data = AnnotationIR()

        # pylint: disable=bad-continuation
        self.logger = slogger.job[self.db_job.id]
        self.db_labels = {db_label.id:db_label
            for db_label in db_segment.task.label_set.all()}
        self.db_attributes = {db_attr.id:db_attr
            for db_attr in models.AttributeSpec.objects.filter(
                label__task__id=db_segment.task.id)}

    def reset(self):
        self.ir_data.reset()

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
                # FIXME: need to clamp points (be sure that all of them inside the image)
                # Should we check here or implement a validator?
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

        self.ir_data.tracks = tracks

    def _save_shapes_to_db(self, shapes):
        db_shapes = []
        db_attrvals = []

        for shape in shapes:
            attributes = shape.pop("attributes", [])
            # FIXME: need to clamp points (be sure that all of them inside the image)
            # Should we check here or implement a validator?
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

        self.ir_data.shapes = shapes

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

        self.ir_data.tags = tags

    def _commit(self):
        db_prev_commit = self.db_job.commits.last()
        db_curr_commit = models.JobCommit()
        if db_prev_commit:
            db_curr_commit.version = db_prev_commit.version + 1
        else:
            db_curr_commit.version = 1
        db_curr_commit.job = self.db_job
        db_curr_commit.message = "Changes: tags - {}; shapes - {}; tracks - {}".format(
            len(self.ir_data.tags), len(self.ir_data.shapes), len(self.ir_data.tracks))
        db_curr_commit.save()
        self.ir_data.version = db_curr_commit.version

    def _save_to_db(self, data):
        self.reset()
        self._save_tags_to_db(data["tags"])
        self._save_shapes_to_db(data["shapes"])
        self._save_tracks_to_db(data["tracks"])

        return self.ir_data.tags or self.ir_data.shapes or self.ir_data.tracks

    def _create(self, data):
        if self._save_to_db(data):
            db_task = self.db_job.segment.task
            db_task.updated_date = timezone.now()
            db_task.save()
            self.db_job.save()

    def create(self, data):
        self._create(data)
        self._commit()

    def put(self, data):
        self._delete()
        self._create(data)
        self._commit()

    def update(self, data):
        self._delete(data)
        self._create(data)
        self._commit()

    def _delete(self, data=None):
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
            self.ir_data.tags = data['tags']
            self.ir_data.shapes = data['shapes']
            self.ir_data.tracks = data['tracks']

            labeledimage_set.delete()
            labeledshape_set.delete()
            labeledtrack_set.delete()

    def delete(self, data=None):
        self._delete(data)
        self._commit()

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
        ).order_by('frame')

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
        self.ir_data.tags = serializer.data

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
            ).order_by('frame')

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
        self.ir_data.shapes = serializer.data

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
        ).order_by('id', 'trackedshape__frame')

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

            # A result table can consist many equal rows for track/shape attributes
            # We need filter unique attributes manually
            db_track["labeledtrackattributeval_set"] = list(set(db_track["labeledtrackattributeval_set"]))
            for db_shape in db_track["trackedshape_set"]:
                db_shape["trackedshapeattributeval_set"] = list(
                    set(db_shape["trackedshapeattributeval_set"])
                )

        serializer = serializers.LabeledTrackSerializer(db_tracks, many=True)
        self.ir_data.tracks = serializer.data

    def _init_version_from_db(self):
        db_commit = self.db_job.commits.last()
        self.ir_data.version = db_commit.version if db_commit else 0

    def init_from_db(self):
        self._init_tags_from_db()
        self._init_shapes_from_db()
        self._init_tracks_from_db()
        self._init_version_from_db()

    @property
    def data(self):
        return {
            'version': self.ir_data.version,
            'tags': self.ir_data.tags,
            'shapes': self.ir_data.shapes,
            'tracks': self.ir_data.tracks,
        }

class DataManager:
    def __init__(self, data):
        self.data = data

    def merge(self, data, start_frame, overlap):
        tags = TagManager(self.data.tags)
        tags.merge(data.tags, start_frame, overlap)

        shapes = ShapeManager(self.data.shapes)
        shapes.merge(data.shapes, start_frame, overlap)

        tracks = TrackManager(self.data.tracks)
        tracks.merge(data.tracks, start_frame, overlap)

    def to_shapes(self, end_frame):
        shapes = self.data.shapes
        tracks = TrackManager(self.data.tracks)

        return shapes + tracks.to_shapes(end_frame)

    def to_tracks(self):
        tracks = self.data.tracks
        shapes = ShapeManager(self.data.shapes)

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

    @staticmethod
    def _modify_unmached_object(obj, end_frame):
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
            for frame in old_objects_by_frame:
                for old_obj in old_objects_by_frame[frame]:
                    self._modify_unmached_object(old_obj, start_frame + overlap)
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
                cost_matrix = np.empty(shape=(len(int_objects), len(old_objects)),
                    dtype=float)
                # 5.1 Construct cost matrix for the frame.
                for i, int_obj in enumerate(int_objects):
                    for j, old_obj in enumerate(old_objects):
                        cost_matrix[i][j] = 1 - self._calc_objects_similarity(
                            int_obj, old_obj, start_frame, overlap)

                # 6. Find optimal solution using Hungarian algorithm.
                row_ind, col_ind = linear_sum_assignment(cost_matrix)
                old_objects_indexes = list(range(0, len(old_objects)))
                int_objects_indexes = list(range(0, len(int_objects)))
                for i, j in zip(row_ind, col_ind):
                    # Reject the solution if the cost is too high. Remember
                    # inside int_objects_indexes objects which were handled.
                    if cost_matrix[i][j] <= min_cost_thresh:
                        old_objects[j] = self._unite_objects(int_objects[i], old_objects[j])
                        int_objects_indexes[i] = -1
                        old_objects_indexes[j] = -1

                # 7. Add all new objects which were not processed.
                for i in int_objects_indexes:
                    if i != -1:
                        self.objects.append(int_objects[i])

                # 8. Modify all old objects which were not processed
                # (e.g. generate a shape with outside=True at the end).
                for j in old_objects_indexes:
                    if j != -1:
                        self._modify_unmached_object(old_objects[j],
                            start_frame + overlap)
            else:
                # We don't have old objects on the frame. Let's add all new ones.
                self.objects.extend(int_objects_by_frame[frame])

class TagManager(ObjectManager):
    @staticmethod
    def _get_cost_threshold():
        return 0.25

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        # TODO: improve the trivial implementation, compare attributes
        return 1 if obj0["label_id"] == obj1["label_id"] else 0

    @staticmethod
    def _unite_objects(obj0, obj1):
        # TODO: improve the trivial implementation
        return obj0 if obj0["frame"] < obj1["frame"] else obj1

    @staticmethod
    def _modify_unmached_object(obj, end_frame):
        pass

def pairwise(iterable):
    a = iter(iterable)
    return zip(a, a)

class ShapeManager(ObjectManager):
    def to_tracks(self):
        tracks = []
        for shape in self.objects:
            shape0 = copy.copy(shape)
            shape0["keyframe"] = True
            shape0["outside"] = False
            # TODO: Separate attributes on mutable and unmutable
            shape0["attributes"] = []
            shape0.pop("group", None)
            shape1 = copy.copy(shape0)
            shape1["outside"] = True
            shape1["frame"] += 1

            track = {
                "label_id": shape["label_id"],
                "frame": shape["frame"],
                "group": shape.get("group", None),
                "attributes": shape["attributes"],
                "shapes": [shape0, shape1]
            }
            tracks.append(track)

        return tracks

    @staticmethod
    def _get_cost_threshold():
        return 0.25

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        def _calc_polygons_similarity(p0, p1):
            overlap_area = p0.intersection(p1).area
            return overlap_area / (p0.area + p1.area - overlap_area)

        has_same_type  = obj0["type"] == obj1["type"]
        has_same_label = obj0.get("label_id") == obj1.get("label_id")
        if has_same_type and has_same_label:
            if obj0["type"] == models.ShapeType.RECTANGLE:
                p0 = geometry.box(*obj0["points"])
                p1 = geometry.box(*obj1["points"])

                return _calc_polygons_similarity(p0, p1)
            elif obj0["type"] == models.ShapeType.POLYGON:
                p0 = geometry.Polygon(pairwise(obj0["points"]))
                p1 = geometry.Polygon(pairwise(obj0["points"]))

                return _calc_polygons_similarity(p0, p1)
            else:
                return 0 # FIXME: need some similarity for points and polylines
        return 0

    @staticmethod
    def _unite_objects(obj0, obj1):
        # TODO: improve the trivial implementation
        return obj0 if obj0["frame"] < obj1["frame"] else obj1

    @staticmethod
    def _modify_unmached_object(obj, end_frame):
        pass

class TrackManager(ObjectManager):
    def to_shapes(self, end_frame):
        shapes = []
        counter = 0
        for track in self.objects:
            for shape in TrackManager.get_interpolated_shapes(track, 0, end_frame):
                if not shape["outside"]:
                    shape["label_id"] = track["label_id"]
                    shape["group"] = track["group"]
                    shape["track_id"] = counter
                    shape["attributes"] += track["attributes"]

                    shapes.append(shape)

        return shapes

    @staticmethod
    def _get_objects_by_frame(objects, start_frame):
        # Just for unification. All tracks are assigned on the same frame
        objects_by_frame = {0: []}
        for obj in objects:
            shape = obj["shapes"][-1] # optimization for old tracks
            if shape["frame"] >= start_frame or not shape["outside"]:
                objects_by_frame[0].append(obj)

        if not objects_by_frame[0]:
            objects_by_frame = {}

        return objects_by_frame

    @staticmethod
    def _get_cost_threshold():
        return 0.5

    @staticmethod
    def _calc_objects_similarity(obj0, obj1, start_frame, overlap):
        if obj0["label_id"] == obj1["label_id"]:
            # Here start_frame is the start frame of next segment
            # and stop_frame is the stop frame of current segment
            # end_frame == stop_frame + 1
            end_frame = start_frame + overlap
            obj0_shapes = TrackManager.get_interpolated_shapes(obj0, start_frame, end_frame)
            obj1_shapes = TrackManager.get_interpolated_shapes(obj1, start_frame, end_frame)
            obj0_shapes_by_frame = {shape["frame"]:shape for shape in obj0_shapes}
            obj1_shapes_by_frame = {shape["frame"]:shape for shape in obj1_shapes}
            assert obj0_shapes_by_frame and obj1_shapes_by_frame

            count, error = 0, 0
            for frame in range(start_frame, end_frame):
                shape0 = obj0_shapes_by_frame.get(frame)
                shape1 = obj1_shapes_by_frame.get(frame)
                if shape0 and shape1:
                    if shape0["outside"] != shape1["outside"]:
                        error += 1
                    else:
                        error += 1 - ShapeManager._calc_objects_similarity(shape0, shape1, start_frame, overlap)
                    count += 1
                elif shape0 or shape1:
                    error += 1
                    count += 1

            return 1 - error / count
        else:
            return 0

    @staticmethod
    def _modify_unmached_object(obj, end_frame):
        shape = obj["shapes"][-1]
        if not shape["outside"]:
            shape = copy.deepcopy(shape)
            shape["frame"] = end_frame
            shape["outside"] = True
            obj["shapes"].append(shape)

    @staticmethod
    def normalize_shape(shape):
        points = np.asarray(shape["points"]).reshape(-1, 2)
        broken_line = geometry.LineString(points)
        points = []
        for off in range(0, 100, 1):
            p = broken_line.interpolate(off / 100, True)
            points.append(p.x)
            points.append(p.y)

        shape = copy.copy(shape)
        shape["points"] = points

        return shape

    @staticmethod
    def get_interpolated_shapes(track, start_frame, end_frame):
        def interpolate(shape0, shape1):
            shapes = []
            is_same_type = shape0["type"] == shape1["type"]
            is_polygon = shape0["type"] == models.ShapeType.POLYGON
            is_polyline = shape0["type"] == models.ShapeType.POLYLINE
            is_same_size = len(shape0["points"]) == len(shape1["points"])
            if not is_same_type or is_polygon or is_polyline or not is_same_size:
                shape0 = TrackManager.normalize_shape(shape0)
                shape1 = TrackManager.normalize_shape(shape1)

            distance = shape1["frame"] - shape0["frame"]
            step = np.subtract(shape1["points"], shape0["points"]) / distance
            for frame in range(shape0["frame"] + 1, shape1["frame"]):
                off = frame - shape0["frame"]
                if shape1["outside"]:
                    points = np.asarray(shape0["points"]).reshape(-1, 2)
                else:
                    points = (shape0["points"] + step * off).reshape(-1, 2)
                shape = copy.deepcopy(shape0)
                if len(points) == 1:
                    shape["points"] = points.flatten()
                else:
                    broken_line = geometry.LineString(points).simplify(0.05, False)
                    shape["points"] = [x for p in broken_line.coords for x in p]

                shape["keyframe"] = False
                shape["frame"] = frame
                shapes.append(shape)
            return shapes

        if track.get("interpolated_shapes"):
            return track["interpolated_shapes"]

        # TODO: should be return an iterator?
        shapes = []
        curr_frame = track["shapes"][0]["frame"]
        prev_shape = {}
        for shape in track["shapes"]:
            if prev_shape:
                assert shape["frame"] > curr_frame
                for attr in prev_shape["attributes"]:
                    if attr["spec_id"] not in map(lambda el: el["spec_id"], shape["attributes"]):
                        shape["attributes"].append(copy.deepcopy(attr))
                if not prev_shape["outside"]:
                    shapes.extend(interpolate(prev_shape, shape))

            shape["keyframe"] = True
            shapes.append(shape)
            curr_frame = shape["frame"]
            prev_shape = shape

        # TODO: Need to modify a client and a database (append "outside" shapes for polytracks)
        if not prev_shape["outside"] and prev_shape["type"] == models.ShapeType.RECTANGLE:
            shape = copy.copy(prev_shape)
            shape["frame"] = end_frame
            shapes.extend(interpolate(prev_shape, shape))

        track["interpolated_shapes"] = shapes

        return shapes

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
        track["interpolated_shapes"] = []

        return track

class TaskAnnotation:
    def __init__(self, pk, user):
        self.user = user
        self.db_task = models.Task.objects.prefetch_related("image_set").get(id=pk)
        self.db_jobs = models.Job.objects.select_related("segment").filter(segment__task_id=pk)
        self.ir_data = AnnotationIR()

    def reset(self):
        self.ir_data.reset()

    def _patch_data(self, data, action):
        splitted_data = {}
        jobs = {}
        for db_job in self.db_jobs:
            jid = db_job.id
            start = db_job.segment.start_frame
            stop = db_job.segment.stop_frame
            jobs[jid] = { "start": start, "stop": stop }
            is_frame_inside = lambda x: (start <= int(x['frame']) <= stop)
            # patch_job_data function changes 'data' argument by assign IDs for saved shapes,
            # in case of overlapped jobs need to make deepcopy of data here to save all shapes properly
            splitted_data[jid] = {
                "tags":   copy.deepcopy(list(filter(is_frame_inside, data['tags']))),
                "shapes": copy.deepcopy(list(filter(is_frame_inside, data['shapes']))),
                "tracks": copy.deepcopy(list(filter(lambda y: len(list(filter(is_frame_inside, y['shapes']))), data['tracks']))),
            }

        for jid, job_data in splitted_data.items():
            if action is None:
                _data = put_job_data(jid, self.user, job_data)
            else:
                _data = patch_job_data(jid, self.user, job_data, action)
            if _data["version"] > self.ir_data.version:
                self.ir_data.version = _data["version"]
            self._merge_data(_data, jobs[jid]["start"], self.db_task.overlap)

    def _merge_data(self, data, start_frame, overlap):
        data_manager = DataManager(self.ir_data)
        data_manager.merge(data, start_frame, overlap)

    def put(self, data):
        self._patch_data(data, None)

    def create(self, data):
        self._patch_data(data, PatchAction.CREATE)

    def update(self, data):
        self._patch_data(data, PatchAction.UPDATE)

    def delete(self, data=None):
        if data:
            self._patch_data(data, PatchAction.DELETE)
        else:
            for db_job in self.db_jobs:
                delete_job_data(db_job.id, self.user)

    def init_from_db(self):
        self.reset()

        for db_job in self.db_jobs:
            annotation = JobAnnotation(db_job.id, self.user)
            annotation.init_from_db()
            if annotation.ir_data.version > self.ir_data.version:
                self.ir_data.version = annotation.ir_data.version
            db_segment = db_job.segment
            start_frame = db_segment.start_frame
            overlap = self.db_task.overlap
            self._merge_data(annotation.ir_data, start_frame, overlap)

    def dump(self, file_path, scheme, host, query_params, dumper):
        anno_exporter = AnnotationExporter(
            annotation_ir=self.ir_data,
            db_task=self.db_task,
            scheme=scheme,
            host=host,
        )
        annotations = anno_exporter.export_as_shapes()

        local_vars = {
            "annotations": annotations,
            "task_meta": anno_exporter.get_meta(),
            "filename": file_path,
            "ShapeType": models.ShapeType,
            "dump_format": dumper.name,
            }
        source_code = open(os.path.join(settings.ANNO_DUMPERS_ROOT, dumper.handler_file.name)).read()
        global_vars = globals()
        imports = import_modules(source_code)
        global_vars.update(imports)

        exec(source_code, global_vars, local_vars)

