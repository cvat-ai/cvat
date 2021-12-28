
# Copyright (C) 2019-2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
from enum import Enum

from django.db import transaction
from django.db.models.query import Prefetch
from django.utils import timezone

from cvat.apps.engine import models, serializers
from cvat.apps.engine.plugins import plugin_decorator
from cvat.apps.profiler import silk_profile

from .annotation import AnnotationIR, AnnotationManager
from .bindings import TaskData
from .formats.registry import make_exporter, make_importer
from .util import bulk_create


class dotdict(OrderedDict):
    """dot.notation access to dictionary attributes"""
    __getattr__ = OrderedDict.get
    __setattr__ = OrderedDict.__setitem__
    __delattr__ = OrderedDict.__delitem__
    __eq__ = lambda self, other: self.id == other.id
    __hash__ = lambda self: self.id

class PatchAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

    @classmethod
    def values(cls):
        return [item.value for item in cls]

    def __str__(self):
        return self.value

def _merge_table_rows(rows, keys_for_merge, field_id):
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

class JobAnnotation:
    def __init__(self, pk):
        self.db_job = models.Job.objects.select_related('segment__task') \
            .select_for_update().get(id=pk)

        db_segment = self.db_job.segment
        self.start_frame = db_segment.start_frame
        self.stop_frame = db_segment.stop_frame
        self.ir_data = AnnotationIR()

        self.db_labels = {db_label.id:db_label
            for db_label in (db_segment.task.project.label_set.all()
            if db_segment.task.project_id else db_segment.task.label_set.all())}

        self.db_attributes = {}
        for db_label in self.db_labels.values():
            self.db_attributes[db_label.id] = {
                "mutable": OrderedDict(),
                "immutable": OrderedDict(),
                "all": OrderedDict(),
            }
            for db_attr in db_label.attributespec_set.all():
                default_value = dotdict([
                    ('spec_id', db_attr.id),
                    ('value', db_attr.default_value),
                ])
                if db_attr.mutable:
                    self.db_attributes[db_label.id]["mutable"][db_attr.id] = default_value
                else:
                    self.db_attributes[db_label.id]["immutable"][db_attr.id] = default_value

                self.db_attributes[db_label.id]["all"][db_attr.id] = default_value

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
                if db_attrval.spec_id not in self.db_attributes[db_track.label_id]["immutable"]:
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
                    if db_attrval.spec_id not in self.db_attributes[db_track.label_id]["mutable"]:
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
                if db_attrval.spec_id not in self.db_attributes[db_shape.label_id]["all"]:
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
                if db_attrval.spec_id not in self.db_attributes[db_tag.label_id]["all"]:
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
            db_attrval.image_id = db_tags[db_attrval.tag_id].id

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

    def _set_updated_date(self):
        db_task = self.db_job.segment.task
        db_task.updated_date = timezone.now()
        db_task.save()

    def _save_to_db(self, data):
        self.reset()
        self._save_tags_to_db(data["tags"])
        self._save_shapes_to_db(data["shapes"])
        self._save_tracks_to_db(data["tracks"])

        return self.ir_data.tags or self.ir_data.shapes or self.ir_data.tracks

    def _create(self, data):
        if self._save_to_db(data):
            self._set_updated_date()
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
        deleted_shapes = 0
        if data is None:
            deleted_shapes += self.db_job.labeledimage_set.all().delete()[0]
            deleted_shapes += self.db_job.labeledshape_set.all().delete()[0]
            deleted_shapes += self.db_job.labeledtrack_set.all().delete()[0]
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
            # which were skipped (not actually deleted). The main idea is to
            # say that all requested objects are absent in DB after the method.
            self.ir_data.tags = data['tags']
            self.ir_data.shapes = data['shapes']
            self.ir_data.tracks = data['tracks']

            deleted_shapes += labeledimage_set.delete()[0]
            deleted_shapes += labeledshape_set.delete()[0]
            deleted_shapes += labeledtrack_set.delete()[0]

        if deleted_shapes:
            self._set_updated_date()

    def delete(self, data=None):
        self._delete(data)
        self._commit()

    @staticmethod
    def _extend_attributes(attributeval_set, default_attribute_values):
        shape_attribute_specs_set = set(attr.spec_id for attr in attributeval_set)
        for db_attr in default_attribute_values:
            if db_attr.spec_id not in shape_attribute_specs_set:
                attributeval_set.append(dotdict([
                    ('spec_id', db_attr.spec_id),
                    ('value', db_attr.value),
                ]))

    def _init_tags_from_db(self):
        db_tags = self.db_job.labeledimage_set.prefetch_related(
            "label",
            "labeledimageattributeval_set"
        ).values(
            'id',
            'frame',
            'label_id',
            'group',
            'source',
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

        for db_tag in db_tags:
            self._extend_attributes(db_tag.labeledimageattributeval_set,
                self.db_attributes[db_tag.label_id]["all"].values())

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
            'source',
            'occluded',
            'z_order',
            'rotation',
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
        for db_shape in db_shapes:
            self._extend_attributes(db_shape.labeledshapeattributeval_set,
                self.db_attributes[db_shape.label_id]["all"].values())

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
            "source",
            "labeledtrackattributeval__spec_id",
            "labeledtrackattributeval__value",
            "labeledtrackattributeval__id",
            "trackedshape__type",
            "trackedshape__occluded",
            "trackedshape__z_order",
            "trackedshape__rotation",
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
                    "trackedshape__rotation",
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
            self._extend_attributes(db_track.labeledtrackattributeval_set,
                self.db_attributes[db_track.label_id]["immutable"].values())

            default_attribute_values = self.db_attributes[db_track.label_id]["mutable"].values()
            for db_shape in db_track["trackedshape_set"]:
                db_shape["trackedshapeattributeval_set"] = list(
                    set(db_shape["trackedshapeattributeval_set"])
                )
                # in case of trackedshapes need to interpolate attriute values and extend it
                # by previous shape attribute values (not default values)
                self._extend_attributes(db_shape["trackedshapeattributeval_set"], default_attribute_values)
                default_attribute_values = db_shape["trackedshapeattributeval_set"]


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
        return self.ir_data.data

    def export(self, dst_file, exporter, host='', **options):
        task_data = TaskData(
            annotation_ir=self.ir_data,
            db_task=self.db_job.segment.task,
            host=host,
        )
        exporter(dst_file, task_data, **options)

    def import_annotations(self, src_file, importer):
        task_data = TaskData(
            annotation_ir=AnnotationIR(),
            db_task=self.db_job.segment.task,
            create_callback=self.create,
        )
        self.delete()

        importer(src_file, task_data)

        self.create(task_data.data.slice(self.start_frame, self.stop_frame).serialize())

class TaskAnnotation:
    def __init__(self, pk):
        self.db_task = models.Task.objects.prefetch_related(
            Prefetch('data__images', queryset=models.Image.objects.order_by('frame'))
        ).get(id=pk)

        # Postgres doesn't guarantee an order by default without explicit order_by
        self.db_jobs = models.Job.objects.select_related("segment").filter(segment__task_id=pk).order_by('id')
        self.ir_data = AnnotationIR()

    def reset(self):
        self.ir_data.reset()

    def _patch_data(self, data, action):
        _data = data if isinstance(data, AnnotationIR) else AnnotationIR(data)
        splitted_data = {}
        jobs = {}
        for db_job in self.db_jobs:
            jid = db_job.id
            start = db_job.segment.start_frame
            stop = db_job.segment.stop_frame
            jobs[jid] = { "start": start, "stop": stop }
            splitted_data[jid] = _data.slice(start, stop)

        for jid, job_data in splitted_data.items():
            _data = AnnotationIR()
            if action is None:
                _data.data = put_job_data(jid, job_data)
            else:
                _data.data = patch_job_data(jid, job_data, action)
            if _data.version > self.ir_data.version:
                self.ir_data.version = _data.version
            self._merge_data(_data, jobs[jid]["start"], self.db_task.overlap)

    def _merge_data(self, data, start_frame, overlap):
        annotation_manager = AnnotationManager(self.ir_data)
        annotation_manager.merge(data, start_frame, overlap)

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
                delete_job_data(db_job.id)

    def init_from_db(self):
        self.reset()

        for db_job in self.db_jobs:
            annotation = JobAnnotation(db_job.id)
            annotation.init_from_db()
            if annotation.ir_data.version > self.ir_data.version:
                self.ir_data.version = annotation.ir_data.version
            db_segment = db_job.segment
            start_frame = db_segment.start_frame
            overlap = self.db_task.overlap
            self._merge_data(annotation.ir_data, start_frame, overlap)

    def export(self, dst_file, exporter, host='', **options):
        task_data = TaskData(
            annotation_ir=self.ir_data,
            db_task=self.db_task,
            host=host,
        )
        exporter(dst_file, task_data, **options)

    def import_annotations(self, src_file, importer, **options):
        task_data = TaskData(
            annotation_ir=AnnotationIR(),
            db_task=self.db_task,
            create_callback=self.create,
        )
        self.delete()

        importer(src_file, task_data, **options)

        self.create(task_data.data.serialize())

    @property
    def data(self):
        return self.ir_data.data


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
    annotation.put(data)

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

def export_job(job_id, dst_file, format_name,
        server_url=None, save_images=False):
    # For big tasks dump function may run for a long time and
    # we dont need to acquire lock after the task has been initialized from DB.
    # But there is the bug with corrupted dump file in case 2 or
    # more dump request received at the same time:
    # https://github.com/opencv/cvat/issues/217
    with transaction.atomic():
        job = JobAnnotation(job_id)
        job.init_from_db()

    exporter = make_exporter(format_name)
    with open(dst_file, 'wb') as f:
        job.export(f, exporter, host=server_url, save_images=save_images)

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
    annotation.put(data)

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

def export_task(task_id, dst_file, format_name,
        server_url=None, save_images=False):
    # For big tasks dump function may run for a long time and
    # we dont need to acquire lock after the task has been initialized from DB.
    # But there is the bug with corrupted dump file in case 2 or
    # more dump request received at the same time:
    # https://github.com/opencv/cvat/issues/217
    with transaction.atomic():
        task = TaskAnnotation(task_id)
        task.init_from_db()

    exporter = make_exporter(format_name)
    with open(dst_file, 'wb') as f:
        task.export(f, exporter, host=server_url, save_images=save_images)

@transaction.atomic
def import_task_annotations(task_id, src_file, format_name):
    task = TaskAnnotation(task_id)
    task.init_from_db()

    importer = make_importer(format_name)
    with open(src_file, 'rb') as f:
        task.import_annotations(f, importer)

@transaction.atomic
def import_job_annotations(job_id, src_file, format_name):
    job = JobAnnotation(job_id)
    job.init_from_db()

    importer = make_importer(format_name)
    with open(src_file, 'rb') as f:
        job.import_annotations(f, importer)
