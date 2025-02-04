# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import itertools
from collections import OrderedDict
from contextlib import nullcontext
from copy import deepcopy
from enum import Enum
from typing import Callable, Optional, Union

from datumaro.components.errors import DatasetError, DatasetImportError, DatasetNotFoundError
from django.conf import settings
from django.db import transaction
from django.db.models.query import Prefetch, QuerySet
from rest_framework.exceptions import ValidationError

from cvat.apps.dataset_manager.annotation import AnnotationIR, AnnotationManager
from cvat.apps.dataset_manager.bindings import (
    CvatDatasetNotFoundError,
    CvatImportError,
    JobData,
    TaskData,
)
from cvat.apps.dataset_manager.formats.registry import make_exporter, make_importer
from cvat.apps.dataset_manager.util import (
    TmpDirManager,
    add_prefetch_fields,
    bulk_create,
    faster_deepcopy,
    get_cached,
)
from cvat.apps.engine import models, serializers
from cvat.apps.engine.log import DatasetLogManager
from cvat.apps.engine.plugins import plugin_decorator
from cvat.apps.engine.utils import take_by
from cvat.apps.events.handlers import handle_annotations_change
from cvat.apps.profiler import silk_profile

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
    def add_prefetch_info(cls, queryset: QuerySet[models.Job], prefetch_images: bool = True) -> QuerySet[models.Job]:
        assert issubclass(queryset.model, models.Job)

        label_qs = add_prefetch_fields(models.Label.objects.all(), [
            'skeleton',
            'parent',
            'attributespec_set',
        ])
        label_qs = JobData.add_prefetch_info(label_qs)

        task_data_queryset = models.Data.objects.all()
        if prefetch_images:
            task_data_queryset = task_data_queryset.select_related('video').prefetch_related(
                Prefetch('images', queryset=models.Image.objects.order_by('frame'))
            )

        return queryset.select_related(
            'segment',
            'segment__task',
        ).prefetch_related(
            'segment__task__project',
            'segment__task__owner',
            'segment__task__assignee',

            Prefetch('segment__task__data', queryset=task_data_queryset),

            Prefetch('segment__task__label_set', queryset=label_qs),
            Prefetch('segment__task__project__label_set', queryset=label_qs),
        )

    def __init__(
        self,
        pk,
        *,
        lock_job_in_db: bool = False,
        queryset: QuerySet | None = None,
        prefetch_images: bool = False,
        db_job: models.Job | None = None
    ):
        assert db_job is None or lock_job_in_db is False
        assert (db_job is None and queryset is None) or prefetch_images is False
        assert db_job is None or queryset is None
        if db_job is None:
            if queryset is None:
                queryset = self.add_prefetch_info(models.Job.objects, prefetch_images=prefetch_images)

            if lock_job_in_db:
                queryset = queryset.select_for_update()

            self.db_job: models.Job = get_cached(queryset, pk=int(pk))
        else:
            self.db_job: models.Job = db_job

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
            parent_tracked_shape = parent_track.shapes.first()
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
        data = self._validate_input_annotations(data)

        self._create(data)
        handle_annotations_change(self.db_job, self.data, "create")

        if not self._data_is_empty(self.data):
            self._set_updated_date()

    def put(self, data):
        data = self._validate_input_annotations(data)

        deleted_data = self._delete()
        handle_annotations_change(self.db_job, deleted_data, "delete")

        deleted_data_is_empty = self._data_is_empty(deleted_data)

        self._create(data)
        handle_annotations_change(self.db_job, self.data, "create")

        if not deleted_data_is_empty or not self._data_is_empty(self.data):
            self._set_updated_date()

    def update(self, data):
        data = self._validate_input_annotations(data)

        self._delete(data)
        self._create(data)
        handle_annotations_change(self.db_job, self.data, "update")

        if not self._data_is_empty(self.data):
            self._set_updated_date()

    def _validate_input_annotations(self, data: Union[AnnotationIR, dict]) -> AnnotationIR:
        if not isinstance(data, AnnotationIR):
            data = AnnotationIR(self.db_job.segment.task.dimension, data)

        db_data = self.db_job.segment.task.data

        if data.tracks and db_data.validation_mode == models.ValidationMode.GT_POOL:
            # Only tags and shapes can be used in tasks with GT pool
            raise ValidationError("Tracks are not supported when task validation mode is {}".format(
                models.ValidationMode.GT_POOL
            ))

        return data

    def _delete_job_labeledimages(self, ids__UNSAFE: list[int]) -> None:
        # ids__UNSAFE is a list, received from the user
        # we MUST filter it by job_id additionally before applying to any queries
        ids = self.db_job.labeledimage_set.filter(pk__in=ids__UNSAFE).values_list('id', flat=True)
        models.LabeledImageAttributeVal.objects.filter(image_id__in=ids).delete()
        self.db_job.labeledimage_set.filter(pk__in=ids).delete()

    def _delete_job_labeledshapes(self, ids__UNSAFE: list[int], *, is_subcall: bool = False) -> None:
        # ids__UNSAFE is a list, received from the user
        # we MUST filter it by job_id additionally before applying to any queries
        if is_subcall:
            ids = ids__UNSAFE
        else:
            ids = self.db_job.labeledshape_set.filter(pk__in=ids__UNSAFE).values_list('id', flat=True)
            child_ids = self.db_job.labeledshape_set.filter(parent_id__in=ids).values_list('id', flat=True)
            if len(child_ids):
                self._delete_job_labeledshapes(child_ids, is_subcall=True)

        models.LabeledShapeAttributeVal.objects.filter(shape_id__in=ids).delete()
        self.db_job.labeledshape_set.filter(pk__in=ids).delete()

    def _delete_job_labeledtracks(self, ids__UNSAFE: list[int], *, is_subcall: bool = False) -> None:
        # ids__UNSAFE is a list, received from the user
        # we MUST filter it by job_id additionally before applying to any queries
        if is_subcall:
            ids = ids__UNSAFE
        else:
            ids = self.db_job.labeledtrack_set.filter(pk__in=ids__UNSAFE).values_list('id', flat=True)
            child_ids = self.db_job.labeledtrack_set.filter(parent_id__in=ids).values_list('id', flat=True)
            if len(child_ids):
                self._delete_job_labeledtracks(child_ids, is_subcall=True)

        models.TrackedShapeAttributeVal.objects.filter(shape__track_id__in=ids).delete()
        models.LabeledTrackAttributeVal.objects.filter(track_id__in=ids).delete()
        self.db_job.labeledtrack_set.filter(pk__in=ids).delete()

    def _delete(self, data=None):
        deleted_data = {}
        if data is None:
            self.init_from_db()
            deleted_data = self.data
            models.clear_annotations_in_jobs([self.db_job.id])
        else:
            labeledimage_ids = [image["id"] for image in data["tags"]]
            labeledshape_ids = [shape["id"] for shape in data["shapes"]]
            labeledtrack_ids = [track["id"] for track in data["tracks"]]

            # It is not important for us that data had some "invalid" objects
            # which were skipped (not actually deleted). The main idea is to
            # say that all requested objects are absent in DB after the method.
            self.ir_data.tags = data['tags']
            self.ir_data.shapes = data['shapes']
            self.ir_data.tracks = data['tracks']

            for labeledimage_ids_chunk in take_by(labeledimage_ids, chunk_size=1000):
                self._delete_job_labeledimages(labeledimage_ids_chunk)

            for labeledshape_ids_chunk in take_by(labeledshape_ids, chunk_size=1000):
                self._delete_job_labeledshapes(labeledshape_ids_chunk)

            for labeledtrack_ids_chunk in take_by(labeledtrack_ids, chunk_size=1000):
                self._delete_job_labeledtracks(labeledtrack_ids_chunk)

            deleted_data = {
                "tags": data["tags"],
                "shapes": data["shapes"],
                "tracks": data["tracks"],
            }

        return deleted_data

    def delete(self, data=None):
        deleted_data = self._delete(data)
        if not self._data_is_empty(deleted_data):
            self._set_updated_date()

        handle_annotations_change(self.db_job, deleted_data, "delete")

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
            'attribute__spec_id',
            'attribute__value',
            'attribute__id',
        ).order_by('frame').iterator(chunk_size=2000)

        db_tags = merge_table_rows(
            rows=db_tags,
            keys_for_merge={
                "attributes": [
                    'attribute__spec_id',
                    'attribute__value',
                    'attribute__id',
                ],
            },
            field_id='id',
        )

        for db_tag in db_tags:
            self._extend_attributes(db_tag.attributes,
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
            'attribute__spec_id',
            'attribute__value',
            'attribute__id',
        ).order_by('frame').iterator(chunk_size=2000)

        db_shapes = merge_table_rows(
            rows=db_shapes,
            keys_for_merge={
                'attributes': [
                    'attribute__spec_id',
                    'attribute__value',
                    'attribute__id',
                ],
            },
            field_id='id',
        )

        shapes = {}
        elements = {}
        for db_shape in db_shapes:
            self._extend_attributes(db_shape.attributes,
                self.db_attributes[db_shape.label_id]["all"].values())
            if db_shape['type'] == str(models.ShapeType.SKELETON):
                # skeletons themselves should not have points as they consist of other elements
                # here we ensure that it was initialized correctly
                db_shape['points'] = []

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
            "attribute__spec_id",
            "attribute__value",
            "attribute__id",
            "shape__type",
            "shape__occluded",
            "shape__z_order",
            "shape__rotation",
            "shape__points",
            "shape__id",
            "shape__frame",
            "shape__outside",
            "shape__attribute__spec_id",
            "shape__attribute__value",
            "shape__attribute__id",
        ).order_by('id', 'shape__frame').iterator(chunk_size=2000)

        db_tracks = merge_table_rows(
            rows=db_tracks,
            keys_for_merge={
                "attributes": [
                    "attribute__spec_id",
                    "attribute__value",
                    "attribute__id",
                ],
                "shapes":[
                    "shape__type",
                    "shape__occluded",
                    "shape__z_order",
                    "shape__points",
                    "shape__rotation",
                    "shape__id",
                    "shape__frame",
                    "shape__outside",
                    "shape__attribute__spec_id",
                    "shape__attribute__value",
                    "shape__attribute__id",
                ],
            },
            field_id="id",
        )

        tracks = {}
        elements = {}
        for db_track in db_tracks:
            db_track["shapes"] = merge_table_rows(db_track["shapes"], {
                'attributes': [
                    'attribute__value',
                    'attribute__spec_id',
                    'attribute__id',
                ]
            }, 'id')

            # A result table can consist many equal rows for track/shape attributes
            # We need filter unique attributes manually
            db_track["attributes"] = list(set(db_track["attributes"]))
            self._extend_attributes(db_track.attributes,
                self.db_attributes[db_track.label_id]["immutable"].values())

            default_attribute_values = self.db_attributes[db_track.label_id]["mutable"].values()
            for db_shape in db_track["shapes"]:
                db_shape["attributes"] = list(set(db_shape["attributes"]))
                # in case of trackedshapes need to interpolate attribute values and extend it
                # by previous shape attribute values (not default values)
                self._extend_attributes(db_shape["attributes"], default_attribute_values)
                if db_shape['type'] == str(models.ShapeType.SKELETON):
                    # skeletons themselves should not have points as they consist of other elements
                    # here we ensure that it was initialized correctly
                    db_shape['points'] = []
                default_attribute_values = db_shape["attributes"]

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

    def export(
        self,
        dst_file: io.BufferedWriter,
        exporter: Callable[..., None],
        *,
        host: str = '',
        temp_dir: str | None = None,
        **options
    ):
        job_data = JobData(
            annotation_ir=self.ir_data,
            db_job=self.db_job,
            host=host,
        )

        with (
            TmpDirManager.get_tmp_directory_for_export(
                instance_type=self.db_job.__class__.__name__,
            ) if not temp_dir else nullcontext(temp_dir)
        ) as temp_dir:
            exporter(dst_file, temp_dir, job_data, **options)

    def import_annotations(self, src_file, importer, **options):
        job_data = JobData(
            annotation_ir=AnnotationIR(self.db_job.segment.task.dimension),
            db_job=self.db_job,
            create_callback=self.create,
        )
        self.delete()

        with TmpDirManager.get_tmp_directory() as temp_dir:
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

        # TODO: maybe include consensus jobs except for task export
        requested_job_types = [models.JobType.ANNOTATION]
        if self.db_task.data.validation_mode == models.ValidationMode.GT_POOL:
            requested_job_types.append(models.JobType.GROUND_TRUTH)

        self.db_jobs = (
            JobAnnotation.add_prefetch_info(models.Job.objects, prefetch_images=False)
            .filter(segment__task_id=pk, type__in=requested_job_types)
        )

        self.ir_data = AnnotationIR(self.db_task.dimension)

    def reset(self):
        self.ir_data.reset()

    def _patch_data(self, data: Union[AnnotationIR, dict], action: Optional[PatchAction]):
        if not isinstance(data, AnnotationIR):
            data = AnnotationIR(self.db_task.dimension, data)

        if self.db_task.data.validation_mode == models.ValidationMode.GT_POOL:
            self._preprocess_input_annotations_for_gt_pool_task(data, action=action)

        splitted_data = {}
        jobs = {}
        for db_job in self.db_jobs:
            jid = db_job.id
            start = db_job.segment.start_frame
            stop = db_job.segment.stop_frame
            jobs[jid] = { "start": start, "stop": stop }
            splitted_data[jid] = (data.slice(start, stop), db_job)

        for jid, (job_data, db_job) in splitted_data.items():
            data = AnnotationIR(self.db_task.dimension)
            if action is None:
                data.data = put_job_data(jid, job_data, db_job=db_job)
            else:
                data.data = patch_job_data(jid, job_data, action, db_job=db_job)

            if data.version > self.ir_data.version:
                self.ir_data.version = data.version

            self._merge_data(data, jobs[jid]["start"])

    def _merge_data(self, data: AnnotationIR, start_frame: int):
        annotation_manager = AnnotationManager(self.ir_data, dimension=self.db_task.dimension)
        annotation_manager.merge(data, start_frame, overlap=self.db_task.overlap)

    def put(self, data):
        self._patch_data(data, None)

    def create(self, data):
        self._patch_data(data, PatchAction.CREATE)

    def _preprocess_input_annotations_for_gt_pool_task(
        self, data: Union[AnnotationIR, dict], *, action: Optional[PatchAction]
    ) -> AnnotationIR:
        if not isinstance(data, AnnotationIR):
            data = AnnotationIR(self.db_task.dimension, data)

        if data.tracks:
            # Only tags and shapes are supported in tasks with GT pool
            raise ValidationError("Tracks are not supported when task validation mode is {}".format(
                models.ValidationMode.GT_POOL
            ))

        gt_job = self.db_task.gt_job
        if gt_job is None:
            raise AssertionError(f"Can't find GT job in the task {self.db_task.id}")

        db_data = self.db_task.data
        frame_step = db_data.get_frame_step()

        def _to_rel_frame(abs_frame: int) -> int:
            return (abs_frame - db_data.start_frame) // frame_step

        # Copy GT pool annotations into other jobs, with replacement of any existing annotations
        gt_abs_frame_set = sorted(gt_job.segment.frame_set)
        task_gt_honeypots: dict[int, int] = {} # real_id -> [placeholder_id, ...]
        task_gt_frames: set[int] = set()
        for abs_frame, abs_real_frame in (
            self.db_task.data.images
            .filter(is_placeholder=True, real_frame__in=gt_abs_frame_set)
            .values_list('frame', 'real_frame')
            .iterator(chunk_size=1000)
        ):
            frame = _to_rel_frame(abs_frame)
            task_gt_frames.add(frame)
            task_gt_honeypots.setdefault(_to_rel_frame(abs_real_frame), []).append(frame)

        gt_pool_frames = tuple(map(_to_rel_frame, gt_abs_frame_set))
        if sorted(gt_pool_frames) != list(range(min(gt_pool_frames), max(gt_pool_frames) + 1)):
            raise AssertionError("Expected a continuous GT pool frame set") # to be used in slice()

        gt_annotations = data.slice(min(gt_pool_frames), max(gt_pool_frames))

        if action and not (
            gt_annotations.tags or gt_annotations.shapes or gt_annotations.tracks
        ):
            return

        if not (
            action is None or # put
            action == PatchAction.CREATE
        ):
            # allow validation frame editing only with full task updates
            raise ValidationError(
                "Annotations on validation frames can only be edited via task import or the GT job"
            )

        task_annotation_manager = AnnotationManager(data, dimension=self.db_task.dimension)
        task_annotation_manager.clear_frames(task_gt_frames)

        for ann_type, gt_annotation in itertools.chain(
            zip(itertools.repeat('tag'), gt_annotations.tags),
            zip(itertools.repeat('shape'), gt_annotations.shapes),
        ):
            for honeypot_frame_id in task_gt_honeypots.get(
                gt_annotation["frame"], [] # some GT frames may be unused
            ):
                copied_annotation = faster_deepcopy(gt_annotation)
                copied_annotation["frame"] = honeypot_frame_id

                for ann in itertools.chain(
                    [copied_annotation], copied_annotation.get('elements', [])
                ):
                    ann.pop("id", None)

                if ann_type == 'tag':
                    data.add_tag(copied_annotation)
                elif ann_type == 'shape':
                    data.add_shape(copied_annotation)
                else:
                    assert False

        return data

    def update(self, data):
        self._patch_data(data, PatchAction.UPDATE)

    def delete(self, data=None):
        if data:
            self._patch_data(data, PatchAction.DELETE)
        else:
            for db_job in self.db_jobs:
                delete_job_data(db_job.id, db_job=db_job)

    def init_from_db(self):
        self.reset()

        for db_job in self.db_jobs.select_for_update():
            if db_job.type == models.JobType.GROUND_TRUTH and not (
                self.db_task.data.validation_mode == models.ValidationMode.GT_POOL
            ):
                continue

            gt_annotation = JobAnnotation(db_job.id, db_job=db_job)
            gt_annotation.init_from_db()
            if gt_annotation.ir_data.version > self.ir_data.version:
                self.ir_data.version = gt_annotation.ir_data.version

            self._merge_data(gt_annotation.ir_data, start_frame=db_job.segment.start_frame)

    def export(
        self,
        dst_file: io.BufferedWriter,
        exporter: Callable[..., None],
        *,
        host: str = '',
        temp_dir: str | None = None,
        **options
    ):
        task_data = TaskData(
            annotation_ir=self.ir_data,
            db_task=self.db_task,
            host=host,
        )

        with (
            TmpDirManager.get_tmp_directory_for_export(
                instance_type=self.db_task.__class__.__name__,
            ) if not temp_dir else nullcontext(temp_dir)
        ) as temp_dir:
            exporter(dst_file, temp_dir, task_data, **options)

    def import_annotations(self, src_file, importer, **options):
        task_data = TaskData(
            annotation_ir=AnnotationIR(self.db_task.dimension),
            db_task=self.db_task,
            create_callback=self.create,
        )
        self.delete()

        with TmpDirManager.get_tmp_directory() as temp_dir:
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
def put_job_data(pk, data: AnnotationIR | dict, *, db_job: models.Job | None = None):
    annotation = JobAnnotation(pk, db_job=db_job)
    annotation.put(data)

    return annotation.data


@silk_profile(name="UPDATE job data")
@plugin_decorator
@transaction.atomic
def patch_job_data(pk, data: AnnotationIR | dict, action: PatchAction, *, db_job: models.Job | None = None):
    annotation = JobAnnotation(pk, db_job=db_job)
    if action == PatchAction.CREATE:
        annotation.create(data)
    elif action == PatchAction.UPDATE:
        annotation.update(data)
    elif action == PatchAction.DELETE:
        annotation.delete(data)

    return annotation.data


@silk_profile(name="DELETE job data")
@transaction.atomic
def delete_job_data(pk, *, db_job: models.Job | None = None):
    annotation = JobAnnotation(pk, db_job=db_job)
    annotation.delete()


def export_job(
    job_id: int,
    dst_file: str,
    *,
    format_name: str,
    server_url: str | None = None,
    save_images=False,
    temp_dir: str | None = None,
):
    # For big tasks dump function may run for a long time and
    # we dont need to acquire lock after the task has been initialized from DB.
    # But there is the bug with corrupted dump file in case 2 or
    # more dump request received at the same time:
    # https://github.com/cvat-ai/cvat/issues/217
    with transaction.atomic():
        job = JobAnnotation(job_id, prefetch_images=True, lock_job_in_db=True)
        job.init_from_db()

    exporter = make_exporter(format_name)
    with open(dst_file, 'wb') as f:
        job.export(f, exporter, host=server_url, save_images=save_images, temp_dir=temp_dir)


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


def export_task(
    task_id: int,
    dst_file: str,
    *,
    format_name: str,
    server_url: str | None = None,
    save_images: bool = False,
    temp_dir: str | None = None,
    ):
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
        task.export(f, exporter, host=server_url, save_images=save_images, temp_dir=temp_dir)


@transaction.atomic
def import_task_annotations(src_file, task_id, format_name, conv_mask_to_poly):
    task = TaskAnnotation(task_id)

    importer = make_importer(format_name)
    with open(src_file, 'rb') as f:
        try:
            task.import_annotations(f, importer, conv_mask_to_poly=conv_mask_to_poly)
        except (DatasetError, DatasetImportError, DatasetNotFoundError) as ex:
            raise CvatImportError(str(ex))


@transaction.atomic
def import_job_annotations(src_file, job_id, format_name, conv_mask_to_poly):
    job = JobAnnotation(job_id, prefetch_images=True)

    importer = make_importer(format_name)
    with open(src_file, 'rb') as f:
        try:
            job.import_annotations(f, importer, conv_mask_to_poly=conv_mask_to_poly)
        except (DatasetError, DatasetImportError, DatasetNotFoundError) as ex:
            raise CvatImportError(str(ex))
