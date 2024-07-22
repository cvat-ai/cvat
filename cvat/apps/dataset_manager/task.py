# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from collections import OrderedDict
from copy import deepcopy
from enum import Enum
from tempfile import TemporaryDirectory
from datumaro.components.errors import DatasetError, DatasetImportError, DatasetNotFoundError

from django.db import transaction
from django.db.models.query import Prefetch
from django.conf import settings
from rest_framework.exceptions import ValidationError

from cvat.apps.engine import models, serializers
from cvat.apps.engine.plugins import plugin_decorator
from cvat.apps.engine.log import DatasetLogManager
from cvat.apps.events.handlers import handle_annotations_change
from cvat.apps.profiler import silk_profile

from cvat.apps.dataset_manager.annotation import AnnotationIR, AnnotationManager
from cvat.apps.dataset_manager.bindings import TaskData, JobData, CvatImportError, CvatDatasetNotFoundError
from cvat.apps.dataset_manager.formats.registry import make_exporter, make_importer
from cvat.apps.dataset_manager.util import add_prefetch_fields, bulk_create, get_cached

dlogger = DatasetLogManager()

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

def merge_table_rows(rows, keys_for_merge, field_id):
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
    @classmethod
    def add_prefetch_info(cls, queryset):
        assert issubclass(queryset.model, models.Job)

        label_qs = add_prefetch_fields(models.Label.objects.all(), [
            'skeleton',
            'parent',
            'attributespec_set',
        ])
        label_qs = JobData.add_prefetch_info(label_qs)

        return queryset.select_related(
            'segment',
            'segment__task',
        ).prefetch_related(
            'segment__task__project',
            'segment__task__owner',
            'segment__task__assignee',
            'segment__task__project__owner',
            'segment__task__project__assignee',

            Prefetch('segment__task__data',
                queryset=models.Data.objects.select_related('video').prefetch_related(
                    Prefetch('images', queryset=models.Image.objects.order_by('frame'))
            )),

            Prefetch('segment__task__label_set', queryset=label_qs),
            Prefetch('segment__task__project__label_set', queryset=label_qs),
        )

    def __init__(self, pk, *, is_prefetched=False, queryset=None):
        if queryset is None:
            queryset = self.add_prefetch_info(models.Job.objects)

        if is_prefetched:
            self.db_job: models.Job = queryset.select_related(
                'segment__task'
            ).select_for_update().get(id=pk)
        else:
            self.db_job: models.Job = get_cached(queryset, pk=int(pk))

        db_segment = self.db_job.segment
        self.start_frame = db_segment.start_frame
        self.stop_frame = db_segment.stop_frame
        self.ir_data = AnnotationIR(db_segment.task.dimension)

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

    def _validate_attribute_for_existence(self, db_attr_val, label_id, attr_type):
        if db_attr_val.spec_id not in self.db_attributes[label_id][attr_type]:
            raise ValidationError("spec_id `{}` is invalid".format(db_attr_val.spec_id))

    def _validate_label_for_existence(self, label_id):
        if label_id not in self.db_labels:
            raise ValidationError("label_id `{}` is invalid".format(label_id))

    def _add_missing_shape(self, track, first_shape):
        if first_shape["type"] == "skeleton":
            # in case with skeleton track we always expect to see one shape in track
            first_shape["frame"] = track["frame"]
        else:
            missing_shape = deepcopy(first_shape)
            missing_shape["frame"] = track["frame"]
            missing_shape["outside"] = True
            missing_shape.pop("id", None)
            track["shapes"].append(missing_shape)

    def _correct_frame_of_tracked_shapes(self, track):
        shapes = sorted(track["shapes"], key=lambda a: a["frame"])
        first_shape = shapes[0] if shapes else None

        if first_shape and track["frame"] < first_shape["frame"]:
            self._add_missing_shape(track, first_shape)
        elif first_shape and first_shape["frame"] < track["frame"]:
            track["frame"] = first_shape["frame"]

    def _sync_frames(self, tracks, parent_track):
        if not tracks:
            return

        min_frame = tracks[0]["frame"]

        for track in tracks:
            if parent_track and parent_track.frame < track["frame"]:
                track["frame"] = parent_track.frame

            # track and its first shape must have the same frame
            self._correct_frame_of_tracked_shapes(track)

            if track["frame"] < min_frame:
                min_frame = track["frame"]

        if not parent_track:
            return

        if min_frame < parent_track.frame:
            # parent track cannot have a frame greater than the frame of the child track
            parent_tracked_shape = parent_track.trackedshape_set.first()
            parent_track.frame = min_frame
            parent_tracked_shape.frame = min_frame

            parent_tracked_shape.save()
            parent_track.save()

            for track in tracks:
                if parent_track.frame < track["frame"]:
                    track["frame"] = parent_track.frame

                    self._correct_frame_of_tracked_shapes(track)

    def _save_tracks_to_db(self, tracks):

        def create_tracks(tracks, parent_track=None):
            db_tracks = []
            db_track_attr_vals = []
            db_shapes = []
            db_shape_attr_vals = []

            self._sync_frames(tracks, parent_track)

            for track in tracks:
                track_attributes = track.pop("attributes", [])
                shapes = track.pop("shapes")
                elements = track.pop("elements", [])
                db_track = models.LabeledTrack(job=self.db_job, parent=parent_track, **track)

                self._validate_label_for_existence(db_track.label_id)

                for attr in track_attributes:
                    db_attr_val = models.LabeledTrackAttributeVal(**attr, track_id=len(db_tracks))

                    self._validate_attribute_for_existence(db_attr_val, db_track.label_id, "immutable")

                    db_track_attr_vals.append(db_attr_val)

                for shape_idx, shape in enumerate(shapes):
                    shape_attributes = shape.pop("attributes", [])
                    db_shape = models.TrackedShape(**shape, track_id=len(db_tracks))

                    for attr in shape_attributes:
                        db_attr_val = models.TrackedShapeAttributeVal(**attr, shape_id=len(db_shapes))

                        self._validate_attribute_for_existence(db_attr_val, db_track.label_id, "mutable")

                        db_shape_attr_vals.append(db_attr_val)

                    db_shapes.append(db_shape)
                    shape["attributes"] = shape_attributes

                db_tracks.append(db_track)

                track["attributes"] = track_attributes
                track["shapes"] = shapes
                if elements or parent_track is None:
                    track["elements"] = elements

            db_tracks = bulk_create(
                db_model=models.LabeledTrack,
                objects=db_tracks,
                flt_param={"job_id": self.db_job.id}
            )

            for db_attr_val in db_track_attr_vals:
                db_attr_val.track_id = db_tracks[db_attr_val.track_id].id

            bulk_create(
                db_model=models.LabeledTrackAttributeVal,
                objects=db_track_attr_vals,
                flt_param={}
            )

            for db_shape in db_shapes:
                db_shape.track_id = db_tracks[db_shape.track_id].id

            db_shapes = bulk_create(
                db_model=models.TrackedShape,
                objects=db_shapes,
                flt_param={"track__job_id": self.db_job.id}
            )

            for db_attr_val in db_shape_attr_vals:
                db_attr_val.shape_id = db_shapes[db_attr_val.shape_id].id

            bulk_create(
                db_model=models.TrackedShapeAttributeVal,
                objects=db_shape_attr_vals,
                flt_param={}
            )

            shape_idx = 0
            for track, db_track in zip(tracks, db_tracks):
                track["id"] = db_track.id
                for shape in track["shapes"]:
                    shape["id"] = db_shapes[shape_idx].id
                    shape_idx += 1
                create_tracks(track.get("elements", []), db_track)

        create_tracks(tracks)

        self.ir_data.tracks = tracks

    def _save_shapes_to_db(self, shapes):
        def create_shapes(shapes, parent_shape=None):
            db_shapes = []
            db_attr_vals = []

            for shape in shapes:
                attributes = shape.pop("attributes", [])
                shape_elements = shape.pop("elements", [])
                # FIXME: need to clamp points (be sure that all of them inside the image)
                # Should we check here or implement a validator?
                db_shape = models.LabeledShape(job=self.db_job, parent=parent_shape, **shape)

                self._validate_label_for_existence(db_shape.label_id)

                for attr in attributes:
                    db_attr_val = models.LabeledShapeAttributeVal(**attr, shape_id=len(db_shapes))

                    self._validate_attribute_for_existence(db_attr_val, db_shape.label_id, "all")

                    db_attr_vals.append(db_attr_val)

                db_shapes.append(db_shape)
                shape["attributes"] = attributes
                if shape_elements or parent_shape is None:
                    shape["elements"] = shape_elements

            db_shapes = bulk_create(
                db_model=models.LabeledShape,
                objects=db_shapes,
                flt_param={"job_id": self.db_job.id}
            )

            for db_attr_val in db_attr_vals:
                db_attr_val.shape_id = db_shapes[db_attr_val.shape_id].id

            bulk_create(
                db_model=models.LabeledShapeAttributeVal,
                objects=db_attr_vals,
                flt_param={}
            )

            for shape, db_shape in zip(shapes, db_shapes):
                shape["id"] = db_shape.id
                create_shapes(shape.get("elements", []), db_shape)

        create_shapes(shapes)

        self.ir_data.shapes = shapes

    def _save_tags_to_db(self, tags):
        db_tags = []
        db_attr_vals = []

        for tag in tags:
            attributes = tag.pop("attributes", [])
            db_tag = models.LabeledImage(job=self.db_job, **tag)

            self._validate_label_for_existence(db_tag.label_id)

            for attr in attributes:
                db_attr_val = models.LabeledImageAttributeVal(**attr)

                self._validate_attribute_for_existence(db_attr_val, db_tag.label_id, "all")

                db_attr_val.tag_id = len(db_tags)
                db_attr_vals.append(db_attr_val)

            db_tags.append(db_tag)
            tag["attributes"] = attributes

        db_tags = bulk_create(
            db_model=models.LabeledImage,
            objects=db_tags,
            flt_param={"job_id": self.db_job.id}
        )

        for db_attr_val in db_attr_vals:
            db_attr_val.image_id = db_tags[db_attr_val.tag_id].id

        bulk_create(
            db_model=models.LabeledImageAttributeVal,
            objects=db_attr_vals,
            flt_param={}
        )

        for tag, db_tag in zip(tags, db_tags):
            tag["id"] = db_tag.id

        self.ir_data.tags = tags

    def _set_updated_date(self):
        db_task = self.db_job.segment.task
        with transaction.atomic():
            self.db_job.touch()
            db_task.touch()
            if db_project := db_task.project:
                db_project.touch()

    @staticmethod
    def _data_is_empty(data):
        return not (data["tags"] or data["shapes"] or data["tracks"])

    def _create(self, data):
        self.reset()
        self._save_tags_to_db(data["tags"])
        self._save_shapes_to_db(data["shapes"])
        self._save_tracks_to_db(data["tracks"])

    def create(self, data):
        self._create(data)
        handle_annotations_change(self.db_job, self.data, "create")

        if not self._data_is_empty(self.data):
            self._set_updated_date()

    def put(self, data):
        deleted_data = self._delete()
        handle_annotations_change(self.db_job, deleted_data, "delete")

        deleted_data_is_empty = self._data_is_empty(deleted_data)

        self._create(data)
        handle_annotations_change(self.db_job, self.data, "create")

        if not deleted_data_is_empty or not self._data_is_empty(self.data):
            self._set_updated_date()

    def update(self, data):
        self._delete(data)
        self._create(data)
        handle_annotations_change(self.db_job, self.data, "update")

        if not self._data_is_empty(self.data):
            self._set_updated_date()

    def _delete(self, data=None):
        deleted_data = {}
        if data is None:
            self.init_from_db()
            deleted_data = self.data
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
            # which were skipped (not actually deleted). The main idea is to
            # say that all requested objects are absent in DB after the method.
            self.ir_data.tags = data['tags']
            self.ir_data.shapes = data['shapes']
            self.ir_data.tracks = data['tracks']

            labeledimage_set.delete()
            labeledshape_set.delete()
            labeledtrack_set.delete()

            deleted_data = {
                "tags": data["tags"],
                "shapes": data["shapes"],
                "tracks": data["tracks"],
            }

        return deleted_data

    def delete(self, data=None):
        deleted_data = self._delete(data)
        handle_annotations_change(self.db_job, deleted_data, "delete")

        if not self._data_is_empty(deleted_data):
            self._set_updated_date()

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
        # NOTE: do not use .prefetch_related() with .values() since it's useless:
        # https://github.com/cvat-ai/cvat/pull/7748#issuecomment-2063695007
        db_tags = self.db_job.labeledimage_set.values(
            'id',
            'frame',
            'label_id',
            'group',
            'source',
            'labeledimageattributeval__spec_id',
            'labeledimageattributeval__value',
            'labeledimageattributeval__id',
        ).order_by('frame').iterator(chunk_size=2000)

        db_tags = merge_table_rows(
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

        serializer = serializers.LabeledImageSerializerFromDB(db_tags, many=True)
        self.ir_data.tags = serializer.data

    def _init_shapes_from_db(self):
        # NOTE: do not use .prefetch_related() with .values() since it's useless:
        # https://github.com/cvat-ai/cvat/pull/7748#issuecomment-2063695007
        db_shapes = self.db_job.labeledshape_set.values(
            'id',
            'label_id',
            'type',
            'frame',
            'group',
            'source',
            'occluded',
            'outside',
            'z_order',
            'rotation',
            'points',
            'parent',
            'labeledshapeattributeval__spec_id',
            'labeledshapeattributeval__value',
            'labeledshapeattributeval__id',
        ).order_by('frame').iterator(chunk_size=2000)

        db_shapes = merge_table_rows(
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

        shapes = {}
        elements = {}
        for db_shape in db_shapes:
            self._extend_attributes(db_shape.labeledshapeattributeval_set,
                self.db_attributes[db_shape.label_id]["all"].values())

            if db_shape.parent is None:
                db_shape.elements = []
                shapes[db_shape.id] = db_shape
            else:
                if db_shape.parent not in elements:
                    elements[db_shape.parent] = []
                elements[db_shape.parent].append(db_shape)

        for shape_id, shape_elements in elements.items():
            shapes[shape_id].elements = shape_elements

        serializer = serializers.LabeledShapeSerializerFromDB(list(shapes.values()), many=True)
        self.ir_data.shapes = serializer.data

    def _init_tracks_from_db(self):
        # NOTE: do not use .prefetch_related() with .values() since it's useless:
        # https://github.com/cvat-ai/cvat/pull/7748#issuecomment-2063695007
        db_tracks = self.db_job.labeledtrack_set.values(
            "id",
            "frame",
            "label_id",
            "group",
            "source",
            "parent",
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
        ).order_by('id', 'trackedshape__frame').iterator(chunk_size=2000)

        db_tracks = merge_table_rows(
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

        tracks = {}
        elements = {}
        for db_track in db_tracks:
            db_track["trackedshape_set"] = merge_table_rows(db_track["trackedshape_set"], {
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

            if db_track.parent is None:
                db_track.elements = []
                tracks[db_track.id] = db_track
            else:
                if db_track.parent not in elements:
                    elements[db_track.parent] = []
                elements[db_track.parent].append(db_track)

        for track_id, track_elements in elements.items():
            tracks[track_id].elements = track_elements

        serializer = serializers.LabeledTrackSerializerFromDB(list(tracks.values()), many=True)
        self.ir_data.tracks = serializer.data

    def _init_version_from_db(self):
        self.ir_data.version = 0 # FIXME: should be removed in the future

    def init_from_db(self):
        self._init_tags_from_db()
        self._init_shapes_from_db()
        self._init_tracks_from_db()
        self._init_version_from_db()

    @property
    def data(self):
        return self.ir_data.data

    def export(self, dst_file, exporter, host='', **options):
        job_data = JobData(
            annotation_ir=self.ir_data,
            db_job=self.db_job,
            host=host,
        )

        temp_dir_base = self.db_job.get_tmp_dirname()
        os.makedirs(temp_dir_base, exist_ok=True)
        with TemporaryDirectory(dir=temp_dir_base) as temp_dir:
            exporter(dst_file, temp_dir, job_data, **options)

    def import_annotations(self, src_file, importer, **options):
        job_data = JobData(
            annotation_ir=AnnotationIR(self.db_job.segment.task.dimension),
            db_job=self.db_job,
            create_callback=self.create,
        )
        self.delete()

        temp_dir_base = self.db_job.get_tmp_dirname()
        os.makedirs(temp_dir_base, exist_ok=True)
        with TemporaryDirectory(dir=temp_dir_base) as temp_dir:
            try:
                importer(src_file, temp_dir, job_data, **options)
            except (DatasetNotFoundError, CvatDatasetNotFoundError) as not_found:
                if settings.CVAT_LOG_IMPORT_ERRORS:
                    dlogger.log_import_error(
                        entity="job",
                        entity_id=self.db_job.id,
                        format_name=importer.DISPLAY_NAME,
                        base_error=str(not_found),
                        dir_path=temp_dir,
                    )

                raise not_found

        self.create(job_data.data.slice(self.start_frame, self.stop_frame).serialize())

class TaskAnnotation:
    def __init__(self, pk):
        self.db_task = models.Task.objects.prefetch_related(
            Prefetch('data__images', queryset=models.Image.objects.order_by('frame'))
        ).get(id=pk)

        # Postgres doesn't guarantee an order by default without explicit order_by
        self.db_jobs = models.Job.objects.select_related("segment").filter(
            segment__task_id=pk, type=models.JobType.ANNOTATION.value,
        ).order_by('id')
        self.ir_data = AnnotationIR(self.db_task.dimension)

    def reset(self):
        self.ir_data.reset()

    def _patch_data(self, data, action):
        _data = data if isinstance(data, AnnotationIR) else AnnotationIR(self.db_task.dimension, data)
        splitted_data = {}
        jobs = {}
        for db_job in self.db_jobs:
            jid = db_job.id
            start = db_job.segment.start_frame
            stop = db_job.segment.stop_frame
            jobs[jid] = { "start": start, "stop": stop }
            splitted_data[jid] = _data.slice(start, stop)

        for jid, job_data in splitted_data.items():
            _data = AnnotationIR(self.db_task.dimension)
            if action is None:
                _data.data = put_job_data(jid, job_data)
            else:
                _data.data = patch_job_data(jid, job_data, action)
            if _data.version > self.ir_data.version:
                self.ir_data.version = _data.version
            self._merge_data(_data, jobs[jid]["start"], self.db_task.overlap, self.db_task.dimension)

    def _merge_data(self, data, start_frame, overlap, dimension):
        annotation_manager = AnnotationManager(self.ir_data)
        annotation_manager.merge(data, start_frame, overlap, dimension)

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
            if db_job.type != models.JobType.ANNOTATION:
                continue

            annotation = JobAnnotation(db_job.id, is_prefetched=True)
            annotation.init_from_db()
            if annotation.ir_data.version > self.ir_data.version:
                self.ir_data.version = annotation.ir_data.version
            db_segment = db_job.segment
            start_frame = db_segment.start_frame
            overlap = self.db_task.overlap
            dimension = self.db_task.dimension
            self._merge_data(annotation.ir_data, start_frame, overlap, dimension)

    def export(self, dst_file, exporter, host='', **options):
        task_data = TaskData(
            annotation_ir=self.ir_data,
            db_task=self.db_task,
            host=host,
        )

        temp_dir_base = self.db_task.get_tmp_dirname()
        os.makedirs(temp_dir_base, exist_ok=True)
        with TemporaryDirectory(dir=temp_dir_base) as temp_dir:
            exporter(dst_file, temp_dir, task_data, **options)

    def import_annotations(self, src_file, importer, **options):
        task_data = TaskData(
            annotation_ir=AnnotationIR(self.db_task.dimension),
            db_task=self.db_task,
            create_callback=self.create,
        )
        self.delete()

        temp_dir_base = self.db_task.get_tmp_dirname()
        os.makedirs(temp_dir_base, exist_ok=True)
        with TemporaryDirectory(dir=temp_dir_base) as temp_dir:
            try:
                importer(src_file, temp_dir, task_data, **options)
            except (DatasetNotFoundError, CvatDatasetNotFoundError) as not_found:
                if settings.CVAT_LOG_IMPORT_ERRORS:
                    dlogger.log_import_error(
                        entity="task",
                        entity_id=self.db_task.id,
                        format_name=importer.DISPLAY_NAME,
                        base_error=str(not_found),
                        dir_path=temp_dir,
                    )

                raise not_found

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

def export_job(job_id, dst_file, format_name, server_url=None, save_images=False):
    # For big tasks dump function may run for a long time and
    # we dont need to acquire lock after the task has been initialized from DB.
    # But there is the bug with corrupted dump file in case 2 or
    # more dump request received at the same time:
    # https://github.com/cvat-ai/cvat/issues/217
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

def export_task(task_id, dst_file, format_name, server_url=None, save_images=False):
    # For big tasks dump function may run for a long time and
    # we dont need to acquire lock after the task has been initialized from DB.
    # But there is the bug with corrupted dump file in case 2 or
    # more dump request received at the same time:
    # https://github.com/cvat-ai/cvat/issues/217
    with transaction.atomic():
        task = TaskAnnotation(task_id)
        task.init_from_db()

    exporter = make_exporter(format_name)
    with open(dst_file, 'wb') as f:
        task.export(f, exporter, host=server_url, save_images=save_images)

@transaction.atomic
def import_task_annotations(src_file, task_id, format_name, conv_mask_to_poly):
    task = TaskAnnotation(task_id)
    task.init_from_db()

    importer = make_importer(format_name)
    with open(src_file, 'rb') as f:
        try:
            task.import_annotations(f, importer, conv_mask_to_poly=conv_mask_to_poly)
        except (DatasetError, DatasetImportError, DatasetNotFoundError) as ex:
            raise CvatImportError(str(ex))

@transaction.atomic
def import_job_annotations(src_file, job_id, format_name, conv_mask_to_poly):
    job = JobAnnotation(job_id)
    job.init_from_db()

    importer = make_importer(format_name)
    with open(src_file, 'rb') as f:
        try:
            job.import_annotations(f, importer, conv_mask_to_poly=conv_mask_to_poly)
        except (DatasetError, DatasetImportError, DatasetNotFoundError) as ex:
            raise CvatImportError(str(ex))
