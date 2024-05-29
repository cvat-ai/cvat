# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import os.path as osp
import re
import sys
from collections import namedtuple
from functools import reduce
from operator import add
from pathlib import Path
from types import SimpleNamespace
from typing import (Any, Callable, DefaultDict, Dict, Iterable, List, Literal, Mapping,
                    NamedTuple, Optional, OrderedDict, Sequence, Set, Tuple, Union)

from attrs.converters import to_bool
import datumaro as dm
import defusedxml.ElementTree as ET
import numpy as np
import rq
from attr import attrib, attrs
from datumaro.components.media import PointCloud
from datumaro.components.environment import Environment
from datumaro.components.extractor import Importer
from datumaro.components.format_detection import RejectionReason
from django.db.models import QuerySet
from django.utils import timezone
from django.conf import settings

from cvat.apps.dataset_manager.formats.utils import get_label_color
from cvat.apps.dataset_manager.util import add_prefetch_fields
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import (AttributeSpec, AttributeType, Data, DimensionType, Job,
                                     JobType, Label, LabelType, Project, SegmentType, ShapeType,
                                     Task)

from .annotation import AnnotationIR, AnnotationManager, TrackManager
from .formats.transformations import CVATRleToCOCORle, EllipsesToMasks

CVAT_INTERNAL_ATTRIBUTES = {'occluded', 'outside', 'keyframe', 'track_id', 'rotation'}

class InstanceLabelData:
    Attribute = NamedTuple('Attribute', [('name', str), ('value', Any)])

    @classmethod
    def add_prefetch_info(cls, queryset: QuerySet):
        assert issubclass(queryset.model, Label)

        return add_prefetch_fields(queryset, [
            'skeleton',
            'parent',
            'attributespec_set',
            'sublabels',
        ])

    def __init__(self, instance: Union[Task, Project]) -> None:
        instance = instance.project if isinstance(instance, Task) and instance.project_id is not None else instance

        db_labels = self.add_prefetch_info(instance.label_set.all())

        # If this flag is set to true, create attribute within anntations import
        self._soft_attribute_import = False
        self._label_mapping = OrderedDict[int, Label](
            (db_label.id, db_label)
            for db_label in sorted(db_labels, key=lambda v: v.pk)
        )

        self._attribute_mapping = {db_label.id: {
            'mutable': {}, 'immutable': {}, 'spec': {}}
            for db_label in db_labels}

        for db_label in db_labels:
            for db_attribute in db_label.attributespec_set.all():
                if db_attribute.mutable:
                    self._attribute_mapping[db_label.id]['mutable'][db_attribute.id] = db_attribute.name
                else:
                    self._attribute_mapping[db_label.id]['immutable'][db_attribute.id] = db_attribute.name
                self._attribute_mapping[db_label.id]['spec'][db_attribute.id] = db_attribute

        self._attribute_mapping_merged = {}
        for label_id, attr_mapping in self._attribute_mapping.items():
            self._attribute_mapping_merged[label_id] = {
                **attr_mapping['mutable'],
                **attr_mapping['immutable'],
            }

    def _get_label_id(self, label_name, parent_id=None):
        for db_label in self._label_mapping.values():
            if label_name == db_label.name and parent_id == db_label.parent_id:
                return db_label.id
        raise ValueError("Label {!r} is not registered for this task".format(label_name))

    def _get_label_name(self, label_id):
        return self._label_mapping[label_id].name

    def _get_attribute_name(self, attribute_id):
        for attribute_mapping in self._attribute_mapping_merged.values():
            if attribute_id in attribute_mapping:
                return attribute_mapping[attribute_id]

    def _get_attribute_id(self, label_id, attribute_name, attribute_type=None):
        if attribute_type:
            container = self._attribute_mapping[label_id][attribute_type]
        else:
            container = self._attribute_mapping_merged[label_id]

        for attr_id, attr_name in container.items():
            if attribute_name == attr_name:
                return attr_id
        return None

    def _get_mutable_attribute_id(self, label_id, attribute_name):
        return self._get_attribute_id(label_id, attribute_name, 'mutable')

    def _get_immutable_attribute_id(self, label_id, attribute_name):
        return self._get_attribute_id(label_id, attribute_name, 'immutable')

    def _import_attribute(self, label_id, attribute, mutable=False):
        spec_id = self._get_attribute_id(label_id, attribute.name)
        value = attribute.value

        if spec_id:
            spec = self._attribute_mapping[label_id]['spec'][spec_id]

            try:
                if spec.input_type == AttributeType.NUMBER:
                    pass # no extra processing required
                elif spec.input_type == AttributeType.CHECKBOX:
                    if value == spec.default_value:
                        pass
                    elif isinstance(value, str):
                        value = value.lower()
                        assert value in {'true', 'false'}
                    elif isinstance(value, (bool, int, float)):
                        value = 'true' if value else 'false'
                    else:
                        raise ValueError("Unexpected attribute value")
            except Exception as e:
                raise Exception("Failed to convert attribute '%s'='%s': %s" %
                    (self._get_label_name(label_id), value, e))

        elif self._soft_attribute_import:
            if isinstance(value, (int, float)):
                attr_type = AttributeType.NUMBER
            elif isinstance(value, bool):
                attr_type = AttributeType.CHECKBOX
            else:
                value = str(value)
                if value.lower() in {'true', 'false'}:
                    value = value.lower() == 'true'
                    attr_type = AttributeType.CHECKBOX
                else:
                    attr_type = AttributeType.TEXT

            attr_spec = AttributeSpec(
                label_id=label_id,
                name=attribute.name,
                input_type=attr_type,
                mutable=mutable,
            )
            attr_spec.save()
            spec_id = attr_spec.id
            if label_id not in self._label_mapping:
                self._label_mapping[label_id] = Label.objects.get(id=label_id)
            if label_id not in self._attribute_mapping:
                self._attribute_mapping[label_id] = {'mutable': {}, 'immutable': {}, 'spec': {}}
            self._attribute_mapping[label_id]['immutable'][spec_id] = attribute.name
            self._attribute_mapping[label_id]['spec'][spec_id] = attr_spec
            self._attribute_mapping_merged[label_id] = {
                **self._attribute_mapping[label_id]['mutable'],
                **self._attribute_mapping[label_id]['immutable'],
            }


        return { 'spec_id': spec_id, 'value': value }

    def _export_attributes(self, attributes):
        exported_attributes = []
        for attr in attributes:
            attribute_name = self._get_attribute_name(attr["spec_id"])
            exported_attributes.append(InstanceLabelData.Attribute(
                name=attribute_name,
                value=attr["value"],
            ))
        return exported_attributes

class CommonData(InstanceLabelData):
    Shape = namedtuple("Shape", 'id, label_id')  # 3d
    LabeledShape = namedtuple(
        'LabeledShape', 'type, frame, label, points, occluded, attributes, source, rotation, group, z_order, elements, outside, id')
    LabeledShape.__new__.__defaults__ = (0, 0, 0, [], False, None)
    TrackedShape = namedtuple(
        'TrackedShape', 'type, frame, points, occluded, outside, keyframe, attributes, rotation, source, group, z_order, label, track_id, elements, id')
    TrackedShape.__new__.__defaults__ = (0, 'manual', 0, 0, None, 0, [], None)
    Track = namedtuple('Track', 'label, group, source, shapes, elements, id')
    Track.__new__.__defaults__ = ([], None)
    Tag = namedtuple('Tag', 'frame, label, attributes, source, group, id')
    Tag.__new__.__defaults__ = (0, None)
    Frame = namedtuple(
        'Frame', 'idx, id, frame, name, width, height, labeled_shapes, tags, shapes, labels')
    Label = namedtuple('Label', 'id, name, color, type')

    def __init__(self,
        annotation_ir,
        db_task,
        *,
        host='',
        create_callback=None,
        use_server_track_ids: bool = False,
        included_frames: Optional[Sequence[int]] = None
    ) -> None:
        self._dimension = annotation_ir.dimension
        self._annotation_ir = annotation_ir
        self._host = host
        self._create_callback = create_callback
        self._MAX_ANNO_SIZE = 30000
        self._frame_info = {}
        self._frame_mapping: Dict[str, int] = {}
        self._frame_step = db_task.data.get_frame_step()
        self._db_data = db_task.data
        self._use_server_track_ids = use_server_track_ids
        self._required_frames = included_frames

        super().__init__(db_task)

        self._init_frame_info()
        self._init_meta()

    @property
    def rel_range(self):
        raise NotImplementedError()

    @property
    def start(self) -> int:
        return 0

    @property
    def stop(self) -> int:
        return len(self)

    def _get_queryset(self):
        raise NotImplementedError()

    def abs_frame_id(self, relative_id):
        # relative_id is frame index in segment for job, so it can start with more than just zero
        if relative_id not in self.rel_range:
            raise ValueError("Unknown internal frame id %s" % relative_id)
        return relative_id * self._frame_step + self._db_data.start_frame

    def rel_frame_id(self, absolute_id):
        d, m = divmod(
            absolute_id - self._db_data.start_frame, self._frame_step)
        if m or d not in self.rel_range:
            raise ValueError("Unknown frame %s" % absolute_id)
        return d

    def _init_frame_info(self):
        self._deleted_frames = { k: True for k in self._db_data.deleted_frames }

        self._excluded_frames = set()

        if hasattr(self._db_data, 'video'):
            self._frame_info = {
                frame: {
                    "path": "frame_{:06d}".format(self.abs_frame_id(frame)),
                    "width": self._db_data.video.width,
                    "height": self._db_data.video.height,
                } for frame in self.rel_range
            }
        else:
            queryset = self._get_queryset()
            self._frame_info = {
                self.rel_frame_id(db_image.frame): {
                    "id": db_image.id,
                    "path": db_image.path,
                    "width": db_image.width,
                    "height": db_image.height,
                } for db_image in queryset
            }

        self._frame_mapping = {
            self._get_filename(info["path"]): frame_number
            for frame_number, info in self._frame_info.items()
        }

    @staticmethod
    def _convert_db_labels(db_labels):
        labels = []
        for db_label in db_labels:
            label = OrderedDict([
                ("name", db_label.name),
                ("color", db_label.color),
                ("type", db_label.type),
                ("attributes", [
                    ("attribute", OrderedDict([
                        ("name", db_attr.name),
                        ("mutable", str(db_attr.mutable)),
                        ("input_type", db_attr.input_type),
                        ("default_value", db_attr.default_value),
                        ("values", db_attr.values)]))
                    for db_attr in db_label.attributespec_set.all()])
            ])

            if db_label.parent:
                label["parent"] = db_label.parent.name

            if db_label.type == str(LabelType.SKELETON):
                label["svg"] = db_label.skeleton.svg
                for db_sublabel in list(db_label.sublabels.all()):
                    label["svg"] = label["svg"].replace(f'data-label-id="{db_sublabel.id}"', f'data-label-name="{db_sublabel.name}"')

            labels.append(('label', label))
        return labels

    def _init_meta(self):
        raise NotImplementedError()

    def _export_tracked_shape(self, shape):
        return CommonData.TrackedShape(
            id=shape["id"],
            type=shape["type"],
            frame=self.abs_frame_id(shape["frame"]),
            label=self._get_label_name(shape["label_id"]),
            points=shape["points"],
            rotation=shape["rotation"],
            occluded=shape["occluded"],
            z_order=shape.get("z_order", 0),
            group=shape.get("group", 0),
            outside=shape.get("outside", False),
            keyframe=shape.get("keyframe", True),
            track_id=shape["track_id"],
            source=shape.get("source", "manual"),
            attributes=self._export_attributes(shape["attributes"]),
            elements=[self._export_tracked_shape(element) for element in shape.get("elements", [])]
        )

    def _export_labeled_shape(self, shape):
        return CommonData.LabeledShape(
            id=shape["id"],
            type=shape["type"],
            label=self._get_label_name(shape["label_id"]),
            frame=self.abs_frame_id(shape["frame"]),
            points=shape["points"],
            rotation=shape["rotation"],
            occluded=shape["occluded"],
            outside=shape.get("outside", False),
            z_order=shape.get("z_order", 0),
            group=shape.get("group", 0),
            source=shape["source"],
            attributes=self._export_attributes(shape["attributes"]),
            elements=[self._export_labeled_shape(element) for element in shape.get("elements", [])]
        )

    def _export_shape(self, shape):
        return CommonData.Shape(
            id=shape["id"],
            label_id=shape["label_id"]
        )

    def _export_tag(self, tag):
        return CommonData.Tag(
            id=tag["id"],
            frame=self.abs_frame_id(tag["frame"]),
            label=self._get_label_name(tag["label_id"]),
            group=tag.get("group", 0),
            source=tag["source"],
            attributes=self._export_attributes(tag["attributes"]),
        )

    def _export_track(self, track, idx):
        track['shapes'] = list(filter(lambda x: not self._is_frame_deleted(x['frame']), track['shapes']))
        tracked_shapes = TrackManager.get_interpolated_shapes(
            track, 0, self.stop, self._annotation_ir.dimension)
        for tracked_shape in tracked_shapes:
            tracked_shape["attributes"] += track["attributes"]
            tracked_shape["track_id"] = track["track_id"] if self._use_server_track_ids else idx
            tracked_shape["group"] = track["group"]
            tracked_shape["source"] = track["source"]
            tracked_shape["label_id"] = track["label_id"]

        return CommonData.Track(
            id=track["id"],
            label=self._get_label_name(track["label_id"]),
            group=track["group"],
            source=track["source"],
            shapes=[self._export_tracked_shape(shape)
                for shape in tracked_shapes if not self._is_frame_deleted(shape["frame"])],
            elements=[self._export_track(element, i) for i, element in enumerate(track.get("elements", []))]
        )

    @staticmethod
    def _export_label(label):
        return CommonData.Label(
            id=label.id,
            name=label.name,
            color=label.color,
            type=label.type
        )

    def group_by_frame(self, include_empty: bool = False):
        frames = {}
        def get_frame(idx):
            frame_info = self._frame_info[idx]
            frame = self.abs_frame_id(idx)
            if frame not in frames:
                frames[frame] = CommonData.Frame(
                    idx=idx,
                    id=frame_info.get("id", 0),
                    frame=frame,
                    name=frame_info["path"],
                    height=frame_info["height"],
                    width=frame_info["width"],
                    labeled_shapes=[],
                    tags=[],
                    shapes=[],
                    labels={}
                )
            return frames[frame]

        included_frames = self.get_included_frames()

        if include_empty:
            for idx in sorted(set(self._frame_info) & included_frames):
                get_frame(idx)

        anno_manager = AnnotationManager(self._annotation_ir)
        for shape in sorted(
            anno_manager.to_shapes(self.stop, self._annotation_ir.dimension,
                # Skip outside, deleted and excluded frames
                included_frames=included_frames,
                include_outside=False,
                use_server_track_ids=self._use_server_track_ids
            ),
            key=lambda shape: shape.get("z_order", 0)
        ):
            shape_data = ''

            if 'track_id' in shape:
                if shape['outside']:
                    continue
                exported_shape = self._export_tracked_shape(shape)
            else:
                exported_shape = self._export_labeled_shape(shape)
                shape_data = self._export_shape(shape)

            get_frame(shape['frame']).labeled_shapes.append(exported_shape)

            if shape_data:
                get_frame(shape['frame']).shapes.append(shape_data)
                for label in self._label_mapping.values():
                    label = self._export_label(label)
                    get_frame(shape['frame']).labels.update({label.id: label})

        for tag in self._annotation_ir.tags:
            if tag['frame'] not in included_frames:
                continue
            get_frame(tag['frame']).tags.append(self._export_tag(tag))

        return iter(frames.values())

    @property
    def shapes(self):
        for shape in self._annotation_ir.shapes:
            if not self._is_frame_deleted(shape["frame"]):
                yield self._export_labeled_shape(shape)

    def get_included_frames(self):
        return set(
            i for i in self.rel_range
            if not self._is_frame_deleted(i)
            and not self._is_frame_excluded(i)
            and self._is_frame_required(i)
        )

    def _is_frame_deleted(self, frame):
        return frame in self._deleted_frames

    def _is_frame_excluded(self, frame):
        return frame in self._excluded_frames

    def _is_frame_required(self, frame):
        return self._required_frames is None or frame in self._required_frames

    @property
    def tracks(self):
        for idx, track in enumerate(self._annotation_ir.tracks):
            yield self._export_track(track, idx)

    @property
    def tags(self):
        for tag in self._annotation_ir.tags:
            if tag["frame"] not in self._deleted_frames:
                yield self._export_tag(tag)

    @property
    def meta(self):
        return self._meta

    @property
    def soft_attribute_import(self):
        return self._soft_attribute_import

    @soft_attribute_import.setter
    def soft_attribute_import(self, value: bool):
        self._soft_attribute_import = value

    def _import_tag(self, tag):
        _tag = tag._asdict()
        label_id = self._get_label_id(_tag.pop('label'))
        _tag['frame'] = self.rel_frame_id(int(_tag['frame']))
        _tag['label_id'] = label_id
        _tag['attributes'] = [self._import_attribute(label_id, attrib)
            for attrib in _tag['attributes']
            if self._get_attribute_id(label_id, attrib.name) or (
                self.soft_attribute_import and attrib.name not in CVAT_INTERNAL_ATTRIBUTES
            )
        ]
        return _tag

    def _import_shape(self, shape, parent_label_id=None):
        _shape = shape._asdict()
        label_id = self._get_label_id(_shape.pop('label'), parent_label_id)
        _shape['frame'] = self.rel_frame_id(int(_shape['frame']))
        _shape['label_id'] = label_id
        _shape['attributes'] = [self._import_attribute(label_id, attrib)
            for attrib in _shape['attributes']
            if self._get_attribute_id(label_id, attrib.name) or (
                self.soft_attribute_import and attrib.name not in CVAT_INTERNAL_ATTRIBUTES
            )
        ]
        _shape['points'] = list(map(float, _shape['points']))
        _shape['elements'] = [self._import_shape(element, label_id) for element in _shape.get('elements', [])]

        return _shape

    def _import_track(self, track, parent_label_id=None):
        _track = track._asdict()
        label_id = self._get_label_id(_track.pop('label'), parent_label_id)
        _track['frame'] = self.rel_frame_id(
            min(int(shape.frame) for shape in _track['shapes']))
        _track['label_id'] = label_id
        _track['attributes'] = []
        _track['shapes'] = [shape._asdict() for shape in _track['shapes']]
        _track['elements'] = [self._import_track(element, label_id) for element in _track.get('elements', [])]
        for shape in _track['shapes']:
            shape['frame'] = self.rel_frame_id(int(shape['frame']))
            _track['attributes'] = [self._import_attribute(label_id, attrib)
                for attrib in shape['attributes']
                if self._get_immutable_attribute_id(label_id, attrib.name) or (
                    self.soft_attribute_import and attrib.name not in CVAT_INTERNAL_ATTRIBUTES
                )
            ]
            shape['attributes'] = [self._import_attribute(label_id, attrib, mutable=True)
                for attrib in shape['attributes']
                if self._get_mutable_attribute_id(label_id, attrib.name)
            ]
            shape['points'] = list(map(float, shape['points']))

        return _track

    def _call_callback(self):
        if self._len() > self._MAX_ANNO_SIZE:
            self._create_callback(self._annotation_ir.serialize())
            self._annotation_ir.reset()

    def add_tag(self, tag):
        imported_tag = self._import_tag(tag)
        if imported_tag['label_id']:
            self._annotation_ir.add_tag(imported_tag)
            self._call_callback()

    def add_shape(self, shape):
        imported_shape = self._import_shape(shape)
        if imported_shape['label_id']:
            self._annotation_ir.add_shape(imported_shape)
            self._call_callback()

    def add_track(self, track):
        imported_track = self._import_track(track)
        if imported_track['label_id']:
            self._annotation_ir.add_track(imported_track)
            self._call_callback()

    @property
    def data(self):
        return self._annotation_ir

    def _len(self):
        track_len = 0
        for track in self._annotation_ir.tracks:
            track_len += len(track['shapes'])

        return len(self._annotation_ir.tags) + len(self._annotation_ir.shapes) + track_len

    @property
    def frame_info(self):
        return self._frame_info

    @property
    def deleted_frames(self):
        return self._deleted_frames

    @property
    def frame_step(self):
        return self._frame_step

    @property
    def db_instance(self):
        raise NotImplementedError()

    @property
    def db_data(self):
        return self._db_data

    def __len__(self):
        raise NotImplementedError()

    @staticmethod
    def _get_filename(path: str) -> str:
        return osp.splitext(path)[0]

    def match_frame(self,
        path: str, root_hint: Optional[str] = None, *, path_has_ext: bool = True
    ) -> Optional[int]:
        if path_has_ext:
            path = self._get_filename(path)

        match = self._frame_mapping.get(path)

        if not match and root_hint and not path.startswith(root_hint):
            path = osp.join(root_hint, path)
            match = self._frame_mapping.get(path)

        return match

    def match_frame_fuzzy(self, path: str, *, path_has_ext: bool = True) -> Optional[int]:
        # Preconditions:
        # - The input dataset is full, i.e. all items present. Partial dataset
        # matching can't be correct for all input cases.
        # - path is the longest path of input dataset in terms of path parts

        if path_has_ext:
            path = self._get_filename(path)

        path = Path(path).parts
        for p, v in self._frame_mapping.items():
            if Path(p).parts[-len(path):] == path: # endswith() for paths
                return v

        return None

class JobData(CommonData):
    META_FIELD = "job"
    def __init__(self, annotation_ir, db_job, **kwargs):
        self._db_job = db_job
        self._db_task = db_job.segment.task

        super().__init__(annotation_ir, self._db_task, **kwargs)

    def _init_meta(self):
        db_segment = self._db_job.segment
        self._meta = OrderedDict([
            (JobData.META_FIELD, OrderedDict([
                ("id", str(self._db_job.id)),
                ("size", str(len(self))),
                ("mode", self._db_task.mode),
                ("overlap", str(self._db_task.overlap)),
                ("bugtracker", self._db_task.bug_tracker),
                ("created", str(timezone.localtime(self._db_task.created_date))),
                ("updated", str(timezone.localtime(self._db_job.updated_date))),
                ("subset", self._db_task.subset or dm.DEFAULT_SUBSET_NAME),
                ("start_frame", str(self._db_data.start_frame + db_segment.start_frame * self._frame_step)),
                ("stop_frame", str(self._db_data.start_frame + db_segment.stop_frame * self._frame_step)),
                ("frame_filter", self._db_data.frame_filter),
                ("segments", [
                    ("segment", OrderedDict([
                        ("id", str(db_segment.id)),
                        ("start", str(db_segment.start_frame)),
                        ("stop", str(db_segment.stop_frame)),
                        ("url", "{}/api/jobs/{}".format(self._host, self._db_job.id))])),
                ]),
                ("owner", OrderedDict([
                    ("username", self._db_task.owner.username),
                    ("email", self._db_task.owner.email)
                ]) if self._db_task.owner else ""),

                ("assignee", OrderedDict([
                    ("username", self._db_job.assignee.username),
                    ("email", self._db_job.assignee.email)
                ]) if self._db_job.assignee else ""),
            ])),
            ("dumped", str(timezone.localtime(timezone.now()))),
        ])

        if self._label_mapping is not None:
            self._meta[JobData.META_FIELD]["labels"] = CommonData._convert_db_labels(self._label_mapping.values())

        if hasattr(self._db_data, "video"):
            self._meta["original_size"] = OrderedDict([
                ("width", str(self._db_data.video.width)),
                ("height", str(self._db_data.video.height))
            ])

    def _init_frame_info(self):
        super()._init_frame_info()

        if self.db_instance.segment.type == SegmentType.SPECIFIC_FRAMES:
            frame_set = self.db_instance.segment.frame_set
            self._excluded_frames.update(
                frame for frame in self.rel_range
                if self.abs_frame_id(frame) not in frame_set
            )

        if self._required_frames:
            abs_range = self.abs_range
            self._required_frames = set(
                self.abs_frame_id(frame) for frame in self._required_frames
                if frame in abs_range
            )

    def __len__(self):
        segment = self._db_job.segment
        return segment.stop_frame - segment.start_frame + 1

    def _get_queryset(self):
        return (image for image in self._db_data.images.all() if image.frame in self.abs_range)

    @property
    def abs_range(self):
        segment = self._db_job.segment
        step = self._frame_step
        start_frame = self._db_data.start_frame + segment.start_frame * step
        stop_frame = self._db_data.start_frame + segment.stop_frame * step + 1
        return range(start_frame, stop_frame, step)

    @property
    def rel_range(self):
        segment = self._db_job.segment
        return range(segment.start_frame, segment.stop_frame + 1)

    @property
    def start(self) -> int:
        segment = self._db_job.segment
        return segment.start_frame

    @property
    def stop(self) -> int:
        segment = self._db_job.segment
        return segment.stop_frame + 1

    @property
    def db_instance(self):
        return self._db_job


class TaskData(CommonData):
    META_FIELD = "task"
    def __init__(self, annotation_ir, db_task, **kwargs):
        self._db_task = db_task
        super().__init__(annotation_ir, db_task, **kwargs)

    @staticmethod
    def meta_for_task(db_task, host, label_mapping=None):
        db_segments = db_task.segment_set.all().prefetch_related('job_set')

        meta = OrderedDict([
            ("id", str(db_task.id)),
            ("name", db_task.name),
            ("size", str(db_task.data.size)),
            ("mode", db_task.mode),
            ("overlap", str(db_task.overlap)),
            ("bugtracker", db_task.bug_tracker),
            ("created", str(timezone.localtime(db_task.created_date))),
            ("updated", str(timezone.localtime(db_task.updated_date))),
            ("subset", db_task.subset or dm.DEFAULT_SUBSET_NAME),
            ("start_frame", str(db_task.data.start_frame)),
            ("stop_frame", str(db_task.data.stop_frame)),
            ("frame_filter", db_task.data.frame_filter),

            ("segments", [
                ("segment", OrderedDict([
                    ("id", str(db_segment.id)),
                    ("start", str(db_segment.start_frame)),
                    ("stop", str(db_segment.stop_frame)),
                    ("url", "{}/api/jobs/{}".format(
                        host, db_segment.job_set.first().id))]
                ))
                for db_segment in db_segments
                if db_segment.job_set.first().type == JobType.ANNOTATION
            ]),

            ("owner", OrderedDict([
                ("username", db_task.owner.username),
                ("email", db_task.owner.email)
            ]) if db_task.owner else ""),

            ("assignee", OrderedDict([
                ("username", db_task.assignee.username),
                ("email", db_task.assignee.email)
            ]) if db_task.assignee else ""),
        ])

        if label_mapping is not None:
            meta['labels'] = CommonData._convert_db_labels(label_mapping.values())

        if hasattr(db_task.data, "video"):
            meta["original_size"] = OrderedDict([
                ("width", str(db_task.data.video.width)),
                ("height", str(db_task.data.video.height))
            ])

            # Add source to dumped file
            meta["source"] = str(osp.basename(db_task.data.video.path))

        return meta

    def _init_meta(self):
        self._meta = OrderedDict([
            (TaskData.META_FIELD, self.meta_for_task(self._db_task, self._host, self._label_mapping)),
            ("dumped", str(timezone.localtime(timezone.now())))
        ])

    def __len__(self):
        return self._db_data.size

    @property
    def rel_range(self):
        return range(len(self))

    @property
    def db_instance(self):
        return self._db_task

    def _get_queryset(self):
        return self._db_data.images.all()

class ProjectData(InstanceLabelData):
    META_FIELD = 'project'
    @attrs
    class LabeledShape:
        type: str = attrib()
        frame: int = attrib()
        label: str = attrib()
        points: List[float] = attrib()
        occluded: bool = attrib()
        attributes: List[InstanceLabelData.Attribute] = attrib()
        source: str = attrib(default='manual')
        group: int = attrib(default=0)
        rotation: int = attrib(default=0)
        z_order: int = attrib(default=0)
        task_id: int = attrib(default=None)
        subset: str = attrib(default=None)
        outside: bool = attrib(default=False)
        elements: List['ProjectData.LabeledShape'] = attrib(default=[])

    @attrs
    class TrackedShape:
        type: str = attrib()
        frame: int = attrib()
        points: List[float] = attrib()
        occluded: bool = attrib()
        outside: bool = attrib()
        keyframe: bool = attrib()
        attributes: List[InstanceLabelData.Attribute] = attrib()
        rotation: int = attrib(default=0)
        source: str = attrib(default='manual')
        group: int = attrib(default=0)
        z_order: int = attrib(default=0)
        label: str = attrib(default=None)
        track_id: int = attrib(default=0)
        elements: List['ProjectData.TrackedShape'] = attrib(default=[])

    @attrs
    class Track:
        label: str = attrib()
        shapes: List['ProjectData.TrackedShape'] = attrib()
        source: str = attrib(default='manual')
        group: int = attrib(default=0)
        task_id: int = attrib(default=None)
        subset: str = attrib(default=None)
        elements: List['ProjectData.Track'] = attrib(default=[])

    @attrs
    class Tag:
        frame: int = attrib()
        label: str = attrib()
        attributes: List[InstanceLabelData.Attribute] = attrib()
        source: str = attrib(default='manual')
        group: int = attrib(default=0)
        task_id: int = attrib(default=None)
        subset: str = attrib(default=None)

    @attrs
    class Frame:
        idx: int = attrib()
        id: int = attrib()
        frame: int = attrib()
        name: str = attrib()
        width: int = attrib()
        height: int = attrib()
        labeled_shapes: List[Union['ProjectData.LabeledShape', 'ProjectData.TrackedShape']] = attrib()
        tags: List['ProjectData.Tag'] = attrib()
        task_id: int = attrib(default=None)
        subset: str = attrib(default=None)

    def __init__(self,
        annotation_irs: Mapping[str, AnnotationIR],
        db_project: Project,
        host: str = '',
        task_annotations: Mapping[int, Any] = None,
        project_annotation=None,
        *,
        use_server_track_ids: bool = False
    ):
        self._annotation_irs = annotation_irs
        self._db_project = db_project
        self._task_annotations = task_annotations
        self._host = host
        self._soft_attribute_import = False
        self._project_annotation = project_annotation
        self._tasks_data: Dict[int, TaskData] = {}
        self._frame_info: Dict[Tuple[int, int], Literal["path", "width", "height", "subset"]] = dict()
        # (subset, path): (task id, frame number)
        self._frame_mapping: Dict[Tuple[str, str], Tuple[int, int]] = dict()
        self._frame_steps: Dict[int, int] = {}
        self.new_tasks: Set[int] = set()
        self._use_server_track_ids = use_server_track_ids

        InstanceLabelData.__init__(self, db_project)
        self.init()


    def abs_frame_id(self, task_id: int, relative_id: int) -> int:
        task = self._db_tasks[task_id]
        if relative_id not in range(0, task.data.size):
            raise ValueError(f"Unknown internal frame id {relative_id}")
        return relative_id * task.data.get_frame_step() + task.data.start_frame + self._task_frame_offsets[task_id]

    def rel_frame_id(self, task_id: int, absolute_id: int) -> int:
        task = self._db_tasks[task_id]
        d, m = divmod(
            absolute_id - task.data.start_frame, task.data.get_frame_step())
        if m or d not in range(0, task.data.size):
            raise ValueError(f"Unknown frame {absolute_id}")
        return d

    def init(self):
        self._init_tasks()
        self._init_task_frame_offsets()
        self._init_frame_info()
        self._init_meta()

    def _init_tasks(self):
        self._db_tasks: OrderedDict[int, Task] = OrderedDict(
            (
                (db_task.id, db_task)
                for db_task in self._db_project.tasks.exclude(data=None).order_by("subset","id").all()
            )
        )

        subsets = set()
        for task in self._db_tasks.values():
            subsets.add(task.subset)
        self._subsets: List[str] = list(subsets)

        self._frame_steps: Dict[int, int] = {task.id: task.data.get_frame_step() for task in self._db_tasks.values()}

    def _init_task_frame_offsets(self):
        self._task_frame_offsets: Dict[int, int] = dict()
        s = 0
        subset = None

        for task in self._db_tasks.values():
            if subset != task.subset:
                s = 0
                subset = task.subset
            self._task_frame_offsets[task.id] = s
            s += task.data.start_frame + task.data.get_frame_step() * task.data.size


    def _init_frame_info(self):
        self._frame_info = dict()
        self._deleted_frames = { (task.id, frame): True for task in self._db_tasks.values() for frame in task.data.deleted_frames }
        original_names = DefaultDict[Tuple[str, str], int](int)
        for task in self._db_tasks.values():
            defaulted_subset = get_defaulted_subset(task.subset, self._subsets)
            if hasattr(task.data, 'video'):
                self._frame_info.update({(task.id, frame): {
                    "path": "frame_{:06d}".format(self.abs_frame_id(task.id, frame)),
                    "width": task.data.video.width,
                    "height": task.data.video.height,
                    "subset": defaulted_subset,
                } for frame in range(task.data.size)})
            else:
                self._frame_info.update({(task.id, self.rel_frame_id(task.id, db_image.frame)): {
                    "path": mangle_image_name(db_image.path, defaulted_subset, original_names),
                    "id": db_image.id,
                    "width": db_image.width,
                    "height": db_image.height,
                    "subset": defaulted_subset
                } for db_image in task.data.images.all()})

        self._frame_mapping = {
            (self._db_tasks[frame_ident[0]].subset, self._get_filename(info["path"])): frame_ident
            for frame_ident, info in self._frame_info.items()
        }

    def _init_meta(self):
        self._meta = OrderedDict([
            (ProjectData.META_FIELD, OrderedDict([
                ('id', str(self._db_project.id)),
                ('name', self._db_project.name),
                ("bugtracker", self._db_project.bug_tracker),
                ("created", str(timezone.localtime(self._db_project.created_date))),
                ("updated", str(timezone.localtime(self._db_project.updated_date))),
                ("tasks", [
                    ('task',
                        TaskData.meta_for_task(db_task, self._host)
                    ) for db_task in self._db_tasks.values()
                ]),

                ("subsets", '\n'.join([s if s else dm.DEFAULT_SUBSET_NAME for s in self._subsets])),

                ("owner", OrderedDict([
                    ("username", self._db_project.owner.username),
                    ("email", self._db_project.owner.email),
                ]) if self._db_project.owner else ""),

                ("assignee", OrderedDict([
                    ("username", self._db_project.assignee.username),
                    ("email", self._db_project.assignee.email),
                ]) if self._db_project.assignee else ""),
            ])),
            ("dumped", str(timezone.localtime(timezone.now())))
        ])

        if self._label_mapping is not None:
            labels = []
            for db_label in self._label_mapping.values():
                label = OrderedDict([
                    ("name", db_label.name),
                    ("color", db_label.color),
                    ("type", db_label.type),
                    ("attributes", [
                        ("attribute", OrderedDict([
                            ("name", db_attr.name),
                            ("mutable", str(db_attr.mutable)),
                            ("input_type", db_attr.input_type),
                            ("default_value", db_attr.default_value),
                            ("values", db_attr.values)]))
                        for db_attr in db_label.attributespec_set.all()])
                ])

                if db_label.parent:
                    label["parent"] = db_label.parent.name

                if db_label.type == str(LabelType.SKELETON):
                    label["svg"] = db_label.skeleton.svg
                    for db_sublabel in list(db_label.sublabels.all()):
                        label["svg"] = label["svg"].replace(f'data-label-id="{db_sublabel.id}"', f'data-label-name="{db_sublabel.name}"')

                labels.append(('label', label))

            self._meta[ProjectData.META_FIELD]['labels'] = labels

    def _export_tracked_shape(self, shape: dict, task_id: int):
        return ProjectData.TrackedShape(
            type=shape["type"],
            frame=self.abs_frame_id(task_id, shape["frame"]),
            label=self._get_label_name(shape["label_id"]),
            points=shape["points"],
            rotation=shape["rotation"],
            occluded=shape["occluded"],
            z_order=shape.get("z_order", 0),
            group=shape.get("group", 0),
            outside=shape.get("outside", False),
            keyframe=shape.get("keyframe", True),
            track_id=shape["track_id"],
            source=shape.get("source", "manual"),
            attributes=self._export_attributes(shape["attributes"]),
            elements=[self._export_tracked_shape(element, task_id) for element in shape.get("elements", [])],
        )

    def _export_labeled_shape(self, shape: dict, task_id: int):
        return ProjectData.LabeledShape(
            type=shape["type"],
            label=self._get_label_name(shape["label_id"]),
            frame=self.abs_frame_id(task_id, shape["frame"]),
            points=shape["points"],
            rotation=shape["rotation"],
            occluded=shape["occluded"],
            outside=shape.get("outside", False),
            z_order=shape.get("z_order", 0),
            group=shape.get("group", 0),
            source=shape["source"],
            attributes=self._export_attributes(shape["attributes"]),
            elements=[self._export_labeled_shape(element, task_id) for element in shape.get("elements", [])],
            task_id=task_id,
        )

    def _export_tag(self, tag: dict, task_id: int):
        return ProjectData.Tag(
            frame=self.abs_frame_id(task_id, tag["frame"]),
            label=self._get_label_name(tag["label_id"]),
            group=tag.get("group", 0),
            source=tag["source"],
            attributes=self._export_attributes(tag["attributes"]),
            task_id=task_id
        )

    def _export_track(self, track: dict, task_id: int, task_size: int, idx: int):
        track['shapes'] = list(filter(lambda x: (task_id, x['frame']) not in self._deleted_frames, track['shapes']))
        tracked_shapes = TrackManager.get_interpolated_shapes(
            track, 0, task_size, self._annotation_irs[task_id].dimension
        )
        for tracked_shape in tracked_shapes:
            tracked_shape["attributes"] += track["attributes"]
            tracked_shape["track_id"] = track["track_id"] if self._use_server_track_ids else idx
            tracked_shape["group"] = track["group"]
            tracked_shape["source"] = track["source"]
            tracked_shape["label_id"] = track["label_id"]

        return ProjectData.Track(
            label=self._get_label_name(track["label_id"]),
            group=track["group"],
            source=track["source"],
            shapes=[self._export_tracked_shape(shape, task_id) for shape in tracked_shapes
                if (task_id, shape["frame"]) not in self._deleted_frames],
            task_id=task_id,
            elements=[self._export_track(element, task_id, task_size, i)
                for i, element in enumerate(track.get("elements", []))]
        )

    def group_by_frame(self, include_empty=False):
        frames: Dict[Tuple[str, int], ProjectData.Frame] = {}
        def get_frame(task_id: int, idx: int) -> ProjectData.Frame:
            frame_info = self._frame_info[(task_id, idx)]
            abs_frame = self.abs_frame_id(task_id, idx)
            if (frame_info["subset"], abs_frame) not in frames:
                frames[(frame_info["subset"], abs_frame)] = ProjectData.Frame(
                    task_id=task_id,
                    subset=frame_info["subset"],
                    idx=idx,
                    id=frame_info.get('id',0),
                    frame=abs_frame,
                    name=frame_info["path"],
                    height=frame_info["height"],
                    width=frame_info["width"],
                    labeled_shapes=[],
                    tags=[],
                )
            return frames[(frame_info["subset"], abs_frame)]

        if include_empty:
            for ident in sorted(self._frame_info):
                if ident not in self._deleted_frames:
                    get_frame(*ident)

        for task in self._db_tasks.values():
            anno_manager = AnnotationManager(self._annotation_irs[task.id])
            for shape in sorted(
                anno_manager.to_shapes(
                    task.data.size, self._annotation_irs[task.id].dimension,
                    include_outside=False,
                    use_server_track_ids=self._use_server_track_ids
                ),
                key=lambda shape: shape.get("z_order", 0)
            ):
                if (task.id, shape['frame']) not in self._frame_info or (task.id, shape['frame']) in self._deleted_frames:
                    continue

                if 'track_id' in shape:
                    if shape['outside']:
                        continue
                    exported_shape = self._export_tracked_shape(shape, task.id)
                else:
                    exported_shape = self._export_labeled_shape(shape, task.id)
                get_frame(task.id, shape['frame']).labeled_shapes.append(exported_shape)

            for tag in self._annotation_irs[task.id].tags:
                if (task.id, tag['frame']) not in self._frame_info:
                    continue
                get_frame(task.id, tag['frame']).tags.append(self._export_tag(tag, task.id))

        return iter(frames.values())

    @property
    def shapes(self):
        for task in self._db_tasks.values():
            for shape in self._annotation_irs[task.id].shapes:
                if (task.id, shape['frame']) not in self._deleted_frames:
                    yield self._export_labeled_shape(shape, task.id)

    @property
    def tracks(self):
        idx = 0
        for task in self._db_tasks.values():
            for track in self._annotation_irs[task.id].tracks:
                yield self._export_track(track, task.id, task.data.size, idx)

    @property
    def tags(self):
        for task in self._db_tasks.values():
            for tag in self._annotation_irs[task.id].tags:
                if (task.id, tag['frame']) not in self._deleted_frames:
                    yield self._export_tag(tag, task.id)

    @property
    def meta(self):
        return self._meta

    @property
    def data(self):
        raise NotImplementedError()

    @property
    def frame_info(self):
        return self._frame_info

    @property
    def deleted_frames(self):
        return self._deleted_frames

    @property
    def frame_step(self):
        return self._frame_steps

    @property
    def db_project(self):
        return self._db_project

    @property
    def subsets(self) -> List[str]:
        return self._subsets

    @property
    def tasks(self):
        return list(self._db_tasks.values())

    @property
    def soft_attribute_import(self):
        return self._soft_attribute_import

    @soft_attribute_import.setter
    def soft_attribute_import(self, value: bool):
        self._soft_attribute_import =  value
        for task_data in self._tasks_data.values():
            task_data.soft_attribute_import = value

    @property
    def task_data(self):
        for task_id, task in self._db_tasks.items():
            if task_id in self._tasks_data:
                yield self._tasks_data[task_id]
            else:
                task_data = TaskData(
                    annotation_ir=self._annotation_irs[task_id],
                    db_task=task,
                    host=self._host,
                    create_callback=self._task_annotations[task_id].create \
                        if self._task_annotations is not None else None,
                )
                task_data._MAX_ANNO_SIZE //= len(self._db_tasks)
                task_data.soft_attribute_import = self.soft_attribute_import
                self._tasks_data[task_id] = task_data
                yield task_data

    @staticmethod
    def _get_filename(path):
        return osp.splitext(path)[0]

    def match_frame(self,
        path: str, subset: str = dm.DEFAULT_SUBSET_NAME,
        root_hint: str = None, path_has_ext: bool = True
    ) -> Optional[int]:
        if path_has_ext:
            path = self._get_filename(path)

        match_task, match_frame = self._frame_mapping.get((subset, path), (None, None))

        if not match_frame and root_hint and not path.startswith(root_hint):
            path = osp.join(root_hint, path)
            match_task, match_frame = self._frame_mapping.get((subset, path), (None, None))

        return match_task, match_frame

    def match_frame_fuzzy(self, path: str, *, path_has_ext: bool = True) -> Optional[int]:
        if path_has_ext:
            path = self._get_filename(path)

        path = Path(path).parts
        for (_subset, _path), (_tid, frame_number) in self._frame_mapping.items():
            if Path(_path).parts[-len(path):] == path :
                return frame_number

        return None

    def split_dataset(self, dataset: dm.Dataset):
        for task_data in self.task_data:
            if task_data._db_task.id not in self.new_tasks:
                continue
            subset_dataset: dm.Dataset = dataset.subsets()[task_data.db_instance.subset].as_dataset()
            yield subset_dataset, task_data

    def add_labels(self, labels: List[dict]):
        attributes = []
        _labels = []
        for label in labels:
            _attributes = label.pop('attributes')
            _labels.append(Label(**label))
            attributes += [(label['name'], AttributeSpec(**at)) for at in _attributes]
        self._project_annotation.add_labels(_labels, attributes)

    def add_task(self, task, files):
        self._project_annotation.add_task(task, files, self)

@attrs(frozen=True, auto_attribs=True)
class ImageSource:
    db_data: Data
    is_video: bool = attrib(kw_only=True)

class ImageProvider:
    def __init__(self, sources: Dict[int, ImageSource]) -> None:
        self._sources = sources

    def unload(self) -> None:
        pass

class ImageProvider2D(ImageProvider):
    def __init__(self, sources: Dict[int, ImageSource]) -> None:
        super().__init__(sources)
        self._current_source_id = None
        self._frame_provider = None

    def unload(self) -> None:
        self._unload_source()

    def get_image_for_frame(self, source_id: int, frame_index: int, **image_kwargs):
        source = self._sources[source_id]

        if source.is_video:
            def video_frame_loader(_):
                self._load_source(source_id, source)

                # optimization for videos: use numpy arrays instead of bytes
                # some formats or transforms can require image data
                return self._frame_provider.get_frame(frame_index,
                    quality=FrameProvider.Quality.ORIGINAL,
                    out_type=FrameProvider.Type.NUMPY_ARRAY)[0]
            return dm.Image(data=video_frame_loader, **image_kwargs)
        else:
            def image_loader(_):
                self._load_source(source_id, source)

                # for images use encoded data to avoid recoding
                return self._frame_provider.get_frame(frame_index,
                    quality=FrameProvider.Quality.ORIGINAL,
                    out_type=FrameProvider.Type.BUFFER)[0].getvalue()
            return dm.ByteImage(data=image_loader, **image_kwargs)

    def _load_source(self, source_id: int, source: ImageSource) -> None:
        if self._current_source_id == source_id:
            return

        self._unload_source()
        self._frame_provider = FrameProvider(source.db_data)
        self._current_source_id = source_id

    def _unload_source(self) -> None:
        if self._frame_provider:
            self._frame_provider.unload()
            self._frame_provider = None

        self._current_source_id = None

class ImageProvider3D(ImageProvider):
    def __init__(self, sources: Dict[int, ImageSource]) -> None:
        super().__init__(sources)
        self._images_per_source = {
            source_id: {
                image.id: image
                for image in source.db_data.images.prefetch_related('related_files')
            }
            for source_id, source in sources.items()
        }

    def get_image_for_frame(self, source_id: int, frame_id: int, **image_kwargs):
        source = self._sources[source_id]

        point_cloud_path = osp.join(
            source.db_data.get_upload_dirname(), image_kwargs['path'],
        )

        image = self._images_per_source[source_id][frame_id]

        related_images = [
            path
            for rf in image.related_files.all()
            for path in [osp.realpath(str(rf.path))]
            if osp.isfile(path)
        ]

        return point_cloud_path, related_images

IMAGE_PROVIDERS_BY_DIMENSION = {
    DimensionType.DIM_3D: ImageProvider3D,
    DimensionType.DIM_2D: ImageProvider2D,
}

class CVATDataExtractorMixin:
    def __init__(self, *,
        convert_annotations: Callable = None
    ):
        self.convert_annotations = convert_annotations or convert_cvat_anno_to_dm

        self._image_provider: Optional[ImageProvider] = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        if self._image_provider:
            self._image_provider.unload()

    def categories(self) -> dict:
        raise NotImplementedError()

    @staticmethod
    def _load_categories(labels: list):
        categories: Dict[dm.AnnotationType,
            dm.Categories] = {}

        label_categories = dm.LabelCategories(attributes=['occluded'])
        point_categories = dm.PointsCategories()

        for _, label in labels:
            label_id = label_categories.add(label['name'], label.get('parent'))
            for _, attr in label['attributes']:
                label_categories.attributes.add(attr['name'])

            if label['type'] == str(LabelType.SKELETON):
                joints = []
                sublabels = []
                for el in ET.fromstring('<root>' + label.get('svg', '') + '</root>'):
                    if el.tag == 'line':
                        joints.append([int(el.attrib['data-node-from']), int(el.attrib['data-node-to'])])
                    elif el.tag == 'circle':
                        sublabels.append(el.attrib['data-label-name'])

                point_categories.add(label_id, sublabels, joints)

        categories[dm.AnnotationType.label] = label_categories
        categories[dm.AnnotationType.points] = point_categories

        return categories

    @staticmethod
    def _load_user_info(meta: dict):
        return {
            "name": meta['owner']['username'],
            "createdAt": meta['created'],
            "updatedAt": meta['updated']
        }

    def _read_cvat_anno(self, cvat_frame_anno: Union[ProjectData.Frame, CommonData.Frame], labels: list):
        categories = self.categories()
        label_cat = categories[dm.AnnotationType.label]
        def map_label(name, parent=''): return label_cat.find(name, parent)[0]
        label_attrs = {
            label.get('parent', '') + label['name']: label['attributes']
            for _, label in labels
        }

        return self.convert_annotations(cvat_frame_anno, label_attrs, map_label)


class CvatTaskOrJobDataExtractor(dm.SourceExtractor, CVATDataExtractorMixin):
    def __init__(
        self,
        instance_data: CommonData,
        *,
        include_images: bool = False,
        format_type: str = None,
        dimension: DimensionType = DimensionType.DIM_2D,
        **kwargs
    ):
        dm.SourceExtractor.__init__(
            self, media_type=dm.Image if dimension == DimensionType.DIM_2D else PointCloud
        )
        CVATDataExtractorMixin.__init__(self, **kwargs)

        instance_meta = instance_data.meta[instance_data.META_FIELD]
        self._categories = self._load_categories(instance_meta['labels'])
        self._user = self._load_user_info(instance_meta) if dimension == DimensionType.DIM_3D else {}
        self._dimension = dimension
        self._format_type = format_type
        dm_items = []

        is_video = instance_meta['mode'] == 'interpolation'
        ext = ''
        if is_video:
            ext = FrameProvider.VIDEO_FRAME_EXT

        if dimension == DimensionType.DIM_3D or include_images:
            self._image_provider = IMAGE_PROVIDERS_BY_DIMENSION[dimension](
                {0: ImageSource(instance_data.db_data, is_video=is_video)}
            )

        for frame_data in instance_data.group_by_frame(include_empty=True):
            image_args = {
                'path': frame_data.name + ext,
                'size': (frame_data.height, frame_data.width),
            }

            if dimension == DimensionType.DIM_3D:
                dm_image = self._image_provider.get_image_for_frame(0, frame_data.id, **image_args)
            elif include_images:
                dm_image = self._image_provider.get_image_for_frame(0, frame_data.idx, **image_args)
            else:
                dm_image = dm.Image(**image_args)
            dm_anno = self._read_cvat_anno(frame_data, instance_meta['labels'])

            if dimension == DimensionType.DIM_2D:
                dm_item = dm.DatasetItem(
                        id=osp.splitext(frame_data.name)[0],
                        annotations=dm_anno, media=dm_image,
                        attributes={'frame': frame_data.frame
                    })
            elif dimension == DimensionType.DIM_3D:
                attributes = {'frame': frame_data.frame}
                if format_type == "sly_pointcloud":
                    attributes["name"] = self._user["name"]
                    attributes["createdAt"] = self._user["createdAt"]
                    attributes["updatedAt"] = self._user["updatedAt"]
                    attributes["labels"] = []
                    for (idx, (_, label)) in enumerate(instance_meta['labels']):
                        attributes["labels"].append({"label_id": idx, "name": label["name"], "color": label["color"], "type": label["type"]})
                        attributes["track_id"] = -1

                dm_item = dm.DatasetItem(
                    id=osp.splitext(osp.split(frame_data.name)[-1])[0],
                    annotations=dm_anno, media=PointCloud(dm_image[0]), related_images=dm_image[1],
                    attributes=attributes
                )

            dm_items.append(dm_item)

        self._items = dm_items

    def _read_cvat_anno(self, cvat_frame_anno: CommonData.Frame, labels: list):
        categories = self.categories()
        label_cat = categories[dm.AnnotationType.label]
        def map_label(name, parent=''): return label_cat.find(name, parent)[0]
        label_attrs = {
            label.get('parent', '') + label['name']: label['attributes']
            for _, label in labels
        }

        return self.convert_annotations(cvat_frame_anno,
            label_attrs, map_label, self._format_type, self._dimension)

class CVATProjectDataExtractor(dm.Extractor, CVATDataExtractorMixin):
    def __init__(
        self,
        project_data: ProjectData,
        *,
        include_images: bool = False,
        format_type: str = None,
        dimension: DimensionType = DimensionType.DIM_2D,
        **kwargs
    ):
        dm.Extractor.__init__(
            self, media_type=dm.Image if dimension == DimensionType.DIM_2D else PointCloud
        )
        CVATDataExtractorMixin.__init__(self, **kwargs)

        self._categories = self._load_categories(project_data.meta[project_data.META_FIELD]['labels'])
        self._user = self._load_user_info(project_data.meta[project_data.META_FIELD]) if dimension == DimensionType.DIM_3D else {}
        self._dimension = dimension
        self._format_type = format_type

        dm_items: List[dm.DatasetItem] = []

        if self._dimension == DimensionType.DIM_3D or include_images:
            self._image_provider = IMAGE_PROVIDERS_BY_DIMENSION[self._dimension](
                {
                    task.id: ImageSource(task.data, is_video=task.mode == 'interpolation')
                    for task in project_data.tasks
                }
            )

        ext_per_task: Dict[int, str] = {
            task.id: FrameProvider.VIDEO_FRAME_EXT if is_video else ''
            for task in project_data.tasks
            for is_video in [task.mode == 'interpolation']
        }

        for frame_data in project_data.group_by_frame(include_empty=True):
            image_args = {
                'path': frame_data.name + ext_per_task[frame_data.task_id],
                'size': (frame_data.height, frame_data.width),
            }
            if self._dimension == DimensionType.DIM_3D:
                dm_image = self._image_provider.get_image_for_frame(
                    frame_data.task_id, frame_data.id, **image_args)
            elif include_images:
                dm_image = self._image_provider.get_image_for_frame(
                    frame_data.task_id, frame_data.idx, **image_args)
            else:
                dm_image = dm.Image(**image_args)
            dm_anno = self._read_cvat_anno(frame_data, project_data.meta[project_data.META_FIELD]['labels'])
            if self._dimension == DimensionType.DIM_2D:
                dm_item = dm.DatasetItem(
                    id=osp.splitext(frame_data.name)[0],
                    annotations=dm_anno, media=dm_image,
                    subset=frame_data.subset,
                    attributes={'frame': frame_data.frame}
                )
            else:
                attributes = {'frame': frame_data.frame}
                if format_type == "sly_pointcloud":
                    attributes["name"] = self._user["name"]
                    attributes["createdAt"] = self._user["createdAt"]
                    attributes["updatedAt"] = self._user["updatedAt"]
                    attributes["labels"] = []
                    for (idx, (_, label)) in enumerate(project_data.meta[project_data.META_FIELD]['labels']):
                        attributes["labels"].append({"label_id": idx, "name": label["name"], "color": label["color"], "type": label["type"]})
                        attributes["track_id"] = -1

                dm_item = dm.DatasetItem(
                    id=osp.splitext(osp.split(frame_data.name)[-1])[0],
                    annotations=dm_anno, media=PointCloud(dm_image[0]), related_images=dm_image[1],
                    attributes=attributes, subset=frame_data.subset
                )
            dm_items.append(dm_item)

        self._items = dm_items

    def categories(self):
        return self._categories

    def __iter__(self):
        yield from self._items

    def __len__(self):
        return len(self._items)


def GetCVATDataExtractor(
    instance_data: Union[ProjectData, CommonData],
    include_images: bool = False,
    format_type: str = None,
    dimension: DimensionType = DimensionType.DIM_2D,
    **kwargs
):
    kwargs.update({
        'include_images': include_images,
        'format_type': format_type,
        'dimension': dimension,
    })
    if isinstance(instance_data, ProjectData):
        return CVATProjectDataExtractor(instance_data, **kwargs)
    else:
        return CvatTaskOrJobDataExtractor(instance_data, **kwargs)

class CvatImportError(Exception):
    pass

@attrs
class CvatDatasetNotFoundError(CvatImportError):
    message: str = ""
    reason: str = ""
    format_name: str = ""
    _docs_base_url = f"{settings.CVAT_DOCS_URL}/manual/advanced/formats/"

    def __str__(self) -> str:
        formatted_format_name = self._format_name_for_docs()
        docs_message = self._docs_message(formatted_format_name)
        display_message = self._clean_display_message()
        return f"{docs_message}. {display_message}"

    def _format_name_for_docs(self) -> str:
        return self.format_name.replace("_", "-")

    def _docs_message(self, formatted_format_name: str) -> str:
        return f"Check [format docs]({self._docs_base_url}format-{formatted_format_name})"

    def _clean_display_message(self) -> str:
        message = re.sub(r'^.*?:', "", self.message)
        if "dataset must contain a file matching pattern" in message:
            message = message.replace("dataset must contain a file matching pattern", "")
            message = message.replace("\n", "")
            message = "Dataset must contain a file:" + message
        return re.sub(r' +', " ", message)

def mangle_image_name(name: str, subset: str, names: DefaultDict[Tuple[str, str], int]) -> str:
    name, ext = name.rsplit(osp.extsep, maxsplit=1)

    if not names[(subset, name)]:
        names[(subset, name)] += 1
        return osp.extsep.join([name, ext])
    else:
        image_name = f"{name}_{names[(subset, name)]}"
        if not names[(subset, image_name)]:
            names[(subset, name)] += 1
            return osp.extsep.join([image_name, ext])
        else:
            i = 1
            while i < sys.maxsize:
                new_image_name = f"{image_name}_{i}"
                if not names[(subset, new_image_name)]:
                    names[(subset, name)] += 1
                    return osp.extsep.join([new_image_name, ext])
                i += 1
    raise Exception('Cannot mangle image name')

def get_defaulted_subset(subset: str, subsets: List[str]) -> str:
    if subset:
        return subset
    else:
        if dm.DEFAULT_SUBSET_NAME not in subsets:
            return dm.DEFAULT_SUBSET_NAME
        else:
            i = 1
            while i < sys.maxsize:
                if f'{dm.DEFAULT_SUBSET_NAME}_{i}' not in subsets:
                    return f'{dm.DEFAULT_SUBSET_NAME}_{i}'
                i += 1
            raise Exception('Cannot find default name for subset')


class CvatToDmAnnotationConverter:
    def __init__(self,
        cvat_frame_anno: CommonData.Frame,
        label_attrs,
        map_label,
        format_name=None,
        dimension: DimensionType = DimensionType.DIM_2D
    ) -> None:
        self.cvat_frame_anno = cvat_frame_anno
        self.label_attrs = label_attrs
        self.map_label = map_label
        self.format_name = format_name
        self.dimension = dimension
        self.item_anno = []
        self.num_of_tracks = None

    def _convert_attrs(self, label: CommonData.Label, cvat_attrs: CommonData.Attribute):
        cvat_attrs = {a.name: a.value for a in cvat_attrs}

        dm_attr = dict()
        for _, a_desc in self.label_attrs[label]:
            a_name = a_desc['name']

            a_value = cvat_attrs.get(a_name, a_desc['default_value'])
            try:
                if a_desc['input_type'] == AttributeType.NUMBER:
                    a_value = float(a_value)
                elif a_desc['input_type'] == AttributeType.CHECKBOX:
                    a_value = (a_value.lower() == 'true')
                dm_attr[a_name] = a_value
            except Exception as e:
                raise Exception(
                    "Failed to convert attribute '%s'='%s': %s" %
                    (a_name, a_value, e))

        return dm_attr

    def _convert_tag(self, tag: CommonData.Tag) -> Iterable[dm.Annotation]:
        anno_group = tag.group or 0
        anno_label = self.map_label(tag.label)
        anno_attr = self._convert_attrs(tag.label, tag.attributes)
        return [dm.Label(label=anno_label, attributes=anno_attr, group=anno_group)]

    def _convert_tags(self, tags) -> Iterable[dm.Annotation]:
        return reduce(add, map(self._convert_tag, tags), [])

    def _convert_shape(self,
        shape: CommonData.LabeledShape, *, index: int
    ) -> Iterable[dm.Annotation]:
        dm_group = shape.group or 0
        dm_label = self.map_label(shape.label)

        dm_attr = self._convert_attrs(shape.label, shape.attributes)
        dm_attr['occluded'] = shape.occluded

        if shape.type == ShapeType.RECTANGLE:
            dm_attr['rotation'] = shape.rotation

        if hasattr(shape, 'track_id'):
            dm_attr['track_id'] = shape.track_id
            dm_attr['keyframe'] = shape.keyframe

        dm_points = shape.points

        anno = None

        if shape.type == ShapeType.POINTS:
            anno = dm.Points(dm_points,
                label=dm_label, attributes=dm_attr, group=dm_group,
                z_order=shape.z_order)
        elif shape.type == ShapeType.ELLIPSE:
            # TODO: for now Datumaro does not support ellipses
            # so, we convert an ellipse to RLE mask here
            # instead of applying transformation in directly in formats
            anno = EllipsesToMasks.convert_ellipse(SimpleNamespace(**{
                "points": shape.points,
                "label": dm_label,
                "z_order": shape.z_order,
                "rotation": shape.rotation,
                "group": dm_group,
                "attributes": dm_attr,
            }), self.cvat_frame_anno.height, self.cvat_frame_anno.width)
        elif shape.type == ShapeType.MASK:
            anno = CVATRleToCOCORle.convert_mask(SimpleNamespace(**{
                "points": shape.points,
                "label": dm_label,
                "z_order": shape.z_order,
                "rotation": shape.rotation,
                "group": dm_group,
                "attributes": dm_attr,
            }), self.cvat_frame_anno.height, self.cvat_frame_anno.width)
        elif shape.type == ShapeType.POLYLINE:
            anno = dm.PolyLine(dm_points,
                label=dm_label, attributes=dm_attr, group=dm_group,
                z_order=shape.z_order)
        elif shape.type == ShapeType.POLYGON:
            anno = dm.Polygon(dm_points,
                label=dm_label, attributes=dm_attr, group=dm_group,
                z_order=shape.z_order)
        elif shape.type == ShapeType.RECTANGLE:
            x0, y0, x1, y1 = dm_points
            anno = dm.Bbox(x0, y0, x1 - x0, y1 - y0,
                label=dm_label, attributes=dm_attr, group=dm_group,
                z_order=shape.z_order)
        elif shape.type == ShapeType.CUBOID:
            if self.dimension == DimensionType.DIM_3D:
                anno_id = getattr(shape, 'track_id', None)
                if anno_id is None:
                    anno_id = self.num_of_tracks + index
                position, rotation, scale = dm_points[0:3], dm_points[3:6], dm_points[6:9]
                anno = dm.Cuboid3d(
                    id=anno_id, position=position, rotation=rotation, scale=scale,
                    label=dm_label, attributes=dm_attr, group=dm_group
                )
        elif shape.type == ShapeType.SKELETON:
            elements = []
            for element in shape.elements:
                element_attr = self._convert_attrs(
                    shape.label + element.label, element.attributes)

                if hasattr(element, 'track_id'):
                    element_attr['track_id'] = element.track_id
                    element_attr['keyframe'] = element.keyframe

                element_vis = dm.Points.Visibility.visible
                if element.outside:
                    element_vis = dm.Points.Visibility.absent
                elif element.occluded:
                    element_vis = dm.Points.Visibility.hidden

                elements.append(dm.Points(element.points, [element_vis],
                    label=self.map_label(element.label, shape.label),
                    attributes=element_attr))

            dm_attr["keyframe"] = any([element.attributes.get("keyframe") for element in elements])
            anno = dm.Skeleton(elements, label=dm_label,
                attributes=dm_attr, group=dm_group, z_order=shape.z_order)
        else:
            raise Exception("Unknown shape type '%s'" % shape.type)

        results = []

        if anno:
            results.append(anno)

        return results

    def _convert_shapes(self, shapes: List[CommonData.LabeledShape]) -> Iterable[dm.Annotation]:
        dm_anno = []

        self.num_of_tracks = reduce(
            lambda a, x: a + (1 if getattr(x, 'track_id', None) is not None else 0),
            shapes,
            0
        )

        for index, shape in enumerate(shapes):
            dm_anno.extend(self._convert_shape(shape, index=index))

        return dm_anno

    def convert(self) -> List[dm.Annotation]:
        dm_anno = []
        dm_anno.extend(self._convert_tags(self.cvat_frame_anno.tags))
        dm_anno.extend(self._convert_shapes(self.cvat_frame_anno.labeled_shapes))
        return dm_anno


def convert_cvat_anno_to_dm(
    cvat_frame_anno,
    label_attrs,
    map_label,
    format_name=None,
    dimension=DimensionType.DIM_2D
) -> List[dm.Annotation]:
    converter = CvatToDmAnnotationConverter(
        cvat_frame_anno=cvat_frame_anno,
        label_attrs=label_attrs,
        map_label=map_label,
        format_name=format_name,
        dimension=dimension
    )
    return converter.convert()


def match_dm_item(
    item: dm.DatasetItem,
    instance_data: Union[ProjectData, CommonData],
    root_hint: Optional[str] = None
) -> int:
    is_video = instance_data.meta[instance_data.META_FIELD]['mode'] == 'interpolation'

    frame_number = None
    if frame_number is None and item.has_image:
        frame_number = instance_data.match_frame(item.id + item.image.ext, root_hint)
    if frame_number is None:
        frame_number = instance_data.match_frame(item.id, root_hint, path_has_ext=False)
    if frame_number is None:
        frame_number = dm.util.cast(item.attributes.get('frame', item.id), int)
    if frame_number is None and is_video:
        frame_number = dm.util.cast(osp.basename(item.id)[len('frame_'):], int)

    if not frame_number in instance_data.frame_info:
        raise CvatImportError("Could not match item id: "
            "'%s' with any task frame" % item.id)
    return frame_number

def find_dataset_root(
    dm_dataset: dm.IDataset, instance_data: Union[ProjectData, CommonData]
) -> Optional[str]:
    longest_path_item = max(dm_dataset, key=lambda item: len(Path(item.id).parts), default=None)
    if longest_path_item is None:
        return None
    longest_path = longest_path_item.id

    matched_frame_number = instance_data.match_frame_fuzzy(longest_path, path_has_ext=False)
    if matched_frame_number is None:
        return None

    longest_match = osp.dirname(instance_data.frame_info[matched_frame_number]['path'])
    prefix = longest_match[:-len(osp.dirname(longest_path)) or None]
    if prefix.endswith('/'):
        prefix = prefix[:-1]

    return prefix

def import_dm_annotations(dm_dataset: dm.Dataset, instance_data: Union[ProjectData, CommonData]):
    if len(dm_dataset) == 0:
        return

    if isinstance(instance_data, ProjectData):
        for sub_dataset, task_data in instance_data.split_dataset(dm_dataset):
            # FIXME: temporary workaround for cvat format
            # will be removed after migration importer to datumaro
            sub_dataset._format = dm_dataset.format
            import_dm_annotations(sub_dataset, task_data)
        return

    shapes = {
        dm.AnnotationType.bbox: ShapeType.RECTANGLE,
        dm.AnnotationType.polygon: ShapeType.POLYGON,
        dm.AnnotationType.polyline: ShapeType.POLYLINE,
        dm.AnnotationType.points: ShapeType.POINTS,
        dm.AnnotationType.cuboid_3d: ShapeType.CUBOID,
        dm.AnnotationType.skeleton: ShapeType.SKELETON,
        dm.AnnotationType.mask: ShapeType.MASK
    }

    track_formats = [
        'cvat',
        'datumaro',
        'sly_pointcloud',
        'coco',
        'coco_instances',
        'coco_person_keypoints',
        'voc'
    ]

    label_cat = dm_dataset.categories()[dm.AnnotationType.label]

    root_hint = find_dataset_root(dm_dataset, instance_data)

    tracks = {}

    for item in dm_dataset:
        frame_number = instance_data.abs_frame_id(
            match_dm_item(item, instance_data, root_hint=root_hint))

        if (isinstance(instance_data.db_instance, Job)
            and instance_data.db_instance.type == JobType.GROUND_TRUTH
            and frame_number not in instance_data.db_instance.segment.frame_set
        ):
            # Given there is a dataset with annotated frames,
            # it would be very hard to create annotations with frame skips for users,
            # so we just skip such annotations. We still need to match the frames.
            continue

        # do not store one-item groups
        group_map = {0: 0}
        group_size = {0: 0}
        for ann in item.annotations:
            if ann.type in shapes:
                group = group_map.get(ann.group)
                if group is None:
                    group = len(group_map)
                    group_map[ann.group] = group
                    group_size[ann.group] = 1
                else:
                    group_size[ann.group] += 1
        group_map = {g: s for g, s in group_size.items()
            if 1 < s and group_map[g]}
        group_map = {g: i for i, g in enumerate([0] + sorted(group_map))}

        for idx, ann in enumerate(item.annotations):
            try:
                if hasattr(ann, 'label') and ann.label is None:
                    raise CvatImportError("annotation has no label")

                attributes = [
                    instance_data.Attribute(name=n, value=str(v))
                    for n, v in ann.attributes.items()
                ]

                points = []
                if ann.type in shapes:
                    points = []
                    if ann.type == dm.AnnotationType.cuboid_3d:
                        points = [*ann.position, *ann.rotation, *ann.scale, 0, 0, 0, 0, 0, 0, 0]
                    elif ann.type == dm.AnnotationType.mask:
                        istrue = np.argwhere(ann.image == 1).transpose()
                        top = int(istrue[0].min())
                        left = int(istrue[1].min())
                        bottom = int(istrue[0].max())
                        right = int(istrue[1].max())
                        points = ann.image[top:bottom + 1, left:right + 1]

                        def reduce_fn(acc, v):
                            if v == acc['val']:
                                acc['res'][-1] += 1
                            else:
                                acc['val'] = v
                                acc['res'].append(1)
                            return acc
                        points = reduce(reduce_fn, points.reshape(np.prod(points.shape)), { 'res': [0], 'val': False })['res']
                        points.extend([int(left), int(top), int(right), int(bottom)])
                    elif ann.type != dm.AnnotationType.skeleton:
                        points = ann.points

                    rotation = ann.attributes.pop('rotation', 0.0)
                    # Use safe casting to bool instead of plain reading
                    # because in some formats return type can be different
                    # from bool / None
                    # https://github.com/openvinotoolkit/datumaro/issues/719
                    occluded = dm.util.cast(ann.attributes.pop('occluded', None), to_bool) is True
                    keyframe = dm.util.cast(ann.attributes.get('keyframe', None), to_bool) is True
                    outside = dm.util.cast(ann.attributes.pop('outside', None), to_bool) is True

                    track_id = ann.attributes.pop('track_id', None)
                    source = ann.attributes.pop('source').lower() \
                        if ann.attributes.get('source', '').lower() in {'auto', 'semi-auto', 'manual', 'file'} else 'manual'

                    shape_type = shapes[ann.type]
                    if track_id is None or 'keyframe' not in ann.attributes or dm_dataset.format not in track_formats:
                        elements = []
                        if ann.type == dm.AnnotationType.skeleton:
                            for element in ann.elements:
                                element_attributes = [
                                    instance_data.Attribute(name=n, value=str(v))
                                    for n, v in element.attributes.items()
                                ]
                                element_occluded = element.visibility[0] == dm.Points.Visibility.hidden
                                element_outside = element.visibility[0] == dm.Points.Visibility.absent
                                element_source = element.attributes.pop('source').lower() \
                                    if element.attributes.get('source', '').lower() in {'auto', 'semi-auto', 'manual', 'file'} else 'manual'
                                elements.append(instance_data.LabeledShape(
                                    type=shapes[element.type],
                                    frame=frame_number,
                                    points=element.points,
                                    label=label_cat.items[element.label].name,
                                    occluded=element_occluded,
                                    z_order=ann.z_order,
                                    group=group_map.get(ann.group, 0),
                                    source=element_source,
                                    attributes=element_attributes,
                                    elements=[],
                                    outside=element_outside,
                                ))
                        instance_data.add_shape(instance_data.LabeledShape(
                            type=shape_type,
                            frame=frame_number,
                            points=points,
                            label=label_cat.items[ann.label].name,
                            occluded=occluded,
                            z_order=ann.z_order if ann.type != dm.AnnotationType.cuboid_3d else 0,
                            group=group_map.get(ann.group, 0),
                            source=source,
                            rotation=rotation,
                            attributes=attributes,
                            elements=elements,
                        ))
                        continue

                    if dm_dataset.format in track_formats:
                        if track_id not in tracks:
                            tracks[track_id] = {
                                'label': label_cat.items[ann.label].name,
                                'group': group_map.get(ann.group, 0),
                                'source': source,
                                'shapes': [],
                                'elements':{},
                            }

                        track = instance_data.TrackedShape(
                            type=shapes[ann.type],
                            frame=frame_number,
                            occluded=occluded,
                            outside=outside,
                            keyframe=keyframe,
                            points=points,
                            z_order=ann.z_order if ann.type != dm.AnnotationType.cuboid_3d else 0,
                            source=source,
                            rotation=rotation,
                            attributes=attributes,
                        )

                        tracks[track_id]['shapes'].append(track)

                        if ann.type == dm.AnnotationType.skeleton:
                            for element in ann.elements:
                                element_occluded = element.visibility[0] == dm.Points.Visibility.hidden
                                element_outside = element.visibility[0] == dm.Points.Visibility.absent

                                if element.label not in tracks[track_id]['elements']:
                                    tracks[track_id]['elements'][element.label] = instance_data.Track(
                                        label=label_cat.items[element.label].name,
                                        group=0,
                                        source=source,
                                        shapes=[],
                                    )

                                element_attributes = [
                                    instance_data.Attribute(name=n, value=str(v))
                                    for n, v in element.attributes.items()
                                ]
                                element_source = element.attributes.pop('source').lower() \
                                    if element.attributes.get('source', '').lower() in {'auto', 'semi-auto', 'manual', 'file'} else 'manual'

                                tracks[track_id]['elements'][element.label].shapes.append(instance_data.TrackedShape(
                                    type=shapes[element.type],
                                    frame=frame_number,
                                    occluded=element_occluded,
                                    outside=element_outside,
                                    keyframe=keyframe,
                                    points=element.points,
                                    z_order=element.z_order,
                                    source=element_source,
                                    attributes=element_attributes,
                                ))

                elif ann.type == dm.AnnotationType.label:
                    instance_data.add_tag(instance_data.Tag(
                        frame=frame_number,
                        label=label_cat.items[ann.label].name,
                        group=group_map.get(ann.group, 0),
                        source='manual',
                        attributes=attributes,
                    ))
            except Exception as e:
                raise CvatImportError("Image {}: can't import annotation "
                    "#{} ({}): {}".format(item.id, idx, ann.type.name, e)) from e

    def _validate_track_shapes(shapes):
        shapes = sorted(shapes, key=lambda t: t.frame)
        new_shapes = []
        prev_shape = None
        # infer the keyframe shapes and keep only them
        for shape in shapes:
            prev_is_visible = prev_shape and not prev_shape.outside
            cur_is_visible = shape and not shape.outside

            has_gap = False
            if prev_is_visible:
                has_gap = prev_shape.frame + instance_data.frame_step < shape.frame

            if has_gap:
                prev_shape = prev_shape._replace(outside=True, keyframe=True,
                    frame=prev_shape.frame + instance_data.frame_step)
                new_shapes.append(prev_shape)

            if prev_is_visible != cur_is_visible or cur_is_visible and (has_gap or shape.keyframe):
                shape = shape._replace(keyframe=True)
                new_shapes.append(shape)

            prev_shape = shape

        if prev_shape and not prev_shape.outside and (
            prev_shape.frame + instance_data.frame_step <= stop_frame
            # has a gap before the current instance segment end
        ):
            prev_shape = prev_shape._replace(outside=True, keyframe=True,
                frame=prev_shape.frame + instance_data.frame_step)
            new_shapes.append(prev_shape)

        return new_shapes

    stop_frame = int(instance_data.meta[instance_data.META_FIELD]['stop_frame'])
    for track_id, track in tracks.items():
        track['shapes'] = _validate_track_shapes(track['shapes'])

        if ann.type == dm.AnnotationType.skeleton:
            new_elements = {}
            for element_id, element in track['elements'].items():
                new_element_shapes = _validate_track_shapes(element.shapes)
                new_elements[element_id] = element._replace(shapes=new_element_shapes)
            track['elements'] = new_elements

        if track['shapes'] or track['elements']:
            track['elements'] = list(track['elements'].values())
            instance_data.add_track(instance_data.Track(**track))

def import_labels_to_project(project_annotation, dataset: dm.Dataset):
    labels = []
    label_colors = []
    for label in dataset.categories()[dm.AnnotationType.label].items:
        db_label = Label(
            name=label.name,
            color=get_label_color(label.name, label_colors),
            type="any"
        )
        labels.append(db_label)
        label_colors.append(db_label.color)
    project_annotation.add_labels(labels)

def load_dataset_data(project_annotation, dataset: dm.Dataset, project_data):
    if not project_annotation.db_project.label_set.count():
        import_labels_to_project(project_annotation, dataset)
    else:
        for label in dataset.categories()[dm.AnnotationType.label].items:
            if not project_annotation.db_project.label_set.filter(name=label.name).exists():
                if label.name == "background":
                    dataset.transform("remap_labels", mapping={"background": ""}, default="keep")
                    continue
                raise CvatImportError(f'Target project does not have label with name "{label.name}"')
    for subset_id, subset in enumerate(dataset.subsets().values()):
        job = rq.get_current_job()
        job.meta['status'] = 'Task from dataset is being created...'
        job.meta['progress'] = (subset_id + job.meta.get('task_progress', 0.)) / len(dataset.subsets().keys())
        job.save_meta()

        task_fields = {
            'project': project_annotation.db_project,
            'name': subset.name,
            'owner': project_annotation.db_project.owner,
            'subset': subset.name,
            'organization': project_annotation.db_project.organization,
        }

        subset_dataset = subset.as_dataset()

        dataset_files = {
            'media': [],
            'data_root': dataset.data_path + osp.sep,
        }

        root_paths = set()
        for dataset_item in subset_dataset:
            if dataset_item.image and dataset_item.image.has_data:
                dataset_files['media'].append(dataset_item.image.path)
                data_root = dataset_item.image.path.rsplit(dataset_item.id, 1)
                if len(data_root) == 2:
                    root_paths.add(data_root[0])
            elif dataset_item.point_cloud:
                dataset_files['media'].append(dataset_item.point_cloud)
                data_root = dataset_item.point_cloud.rsplit(dataset_item.id, 1)
                if len(data_root) == 2:
                    root_paths.add(data_root[0])

            if isinstance(dataset_item.related_images, list):
                dataset_files['media'] += \
                    list(map(lambda ri: ri.path, dataset_item.related_images))

        if len(root_paths):
            dataset_files['data_root'] = osp.commonpath(root_paths) + osp.sep

        project_annotation.add_task(task_fields, dataset_files, project_data)

def detect_dataset(dataset_dir: str, format_name: str, importer: Importer) -> None:
    not_found_error_instance = CvatDatasetNotFoundError()

    def not_found_error(_, reason, human_message):
        not_found_error_instance.format_name = format_name
        not_found_error_instance.reason = reason
        not_found_error_instance.message = human_message

    detection_env = Environment()
    detection_env.importers.items.clear()
    detection_env.importers.register(format_name, importer)
    detected = detection_env.detect_dataset(dataset_dir, depth=4, rejection_callback=not_found_error)

    if not detected and not_found_error_instance.reason != RejectionReason.detection_unsupported:
        raise not_found_error_instance
