
# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
import sys
from collections import namedtuple
from functools import reduce
from pathlib import Path
from types import SimpleNamespace
from typing import (Any, Callable, DefaultDict, Dict, List, Literal, Mapping,
                    NamedTuple, OrderedDict, Set, Tuple, Union)

import datumaro as dm
import defusedxml.ElementTree as ET
import numpy as np
import rq
from attr import attrib, attrs
from datumaro.components.media import PointCloud
from django.utils import timezone

from cvat.apps.dataset_manager.formats.utils import get_label_color
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import AttributeSpec, AttributeType, DimensionType
from cvat.apps.engine.models import Image as Img
from cvat.apps.engine.models import Label, LabelType, Project, ShapeType, Task

from .annotation import AnnotationIR, AnnotationManager, TrackManager
from .formats.transformations import CVATRleToCOCORle, EllipsesToMasks

CVAT_INTERNAL_ATTRIBUTES = {'occluded', 'outside', 'keyframe', 'track_id', 'rotation'}

class InstanceLabelData:
    Attribute = NamedTuple('Attribute', [('name', str), ('value', Any)])

    def __init__(self, instance: Union[Task, Project]) -> None:
        instance = instance.project if isinstance(instance, Task) and instance.project_id is not None else instance

        db_labels = instance.label_set.all().prefetch_related('attributespec_set').order_by('pk')

        # If this flag is set to true, create attribute within anntations import
        self._soft_attribute_import = False
        self._label_mapping = OrderedDict[int, Label](
            ((db_label.id, db_label) for db_label in db_labels),
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
                    if isinstance(value, str):
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
        'LabeledShape', 'type, frame, label, points, occluded, attributes, source, rotation, group, z_order, elements, outside')
    LabeledShape.__new__.__defaults__ = (0, 0, 0, [], False)
    TrackedShape = namedtuple(
        'TrackedShape', 'type, frame, points, occluded, outside, keyframe, attributes, rotation, source, group, z_order, label, track_id, elements')
    TrackedShape.__new__.__defaults__ = (0, 'manual', 0, 0, None, 0, [])
    Track = namedtuple('Track', 'label, group, source, shapes, elements')
    Track.__new__.__defaults__ = ([], )
    Tag = namedtuple('Tag', 'frame, label, attributes, source, group')
    Tag.__new__.__defaults__ = (0, )
    Frame = namedtuple(
        'Frame', 'idx, id, frame, name, width, height, labeled_shapes, tags, shapes, labels')
    Labels = namedtuple('Label', 'id, name, color, type')

    def __init__(self, annotation_ir, db_task, host='', create_callback=None) -> None:
        self._dimension = annotation_ir.dimension
        self._annotation_ir = annotation_ir
        self._host = host
        self._create_callback = create_callback
        self._MAX_ANNO_SIZE = 30000
        self._frame_info = {}
        self._frame_mapping = {}
        self._frame_step = db_task.data.get_frame_step()
        self._db_data = db_task.data

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
            tracked_shape["track_id"] = idx
            tracked_shape["group"] = track["group"]
            tracked_shape["source"] = track["source"]
            tracked_shape["label_id"] = track["label_id"]

        return CommonData.Track(
            label=self._get_label_name(track["label_id"]),
            group=track["group"],
            source=track["source"],
            shapes=[self._export_tracked_shape(shape)
                for shape in tracked_shapes if not self._is_frame_deleted(shape["frame"])],
            elements=[self._export_track(element, i) for i, element in enumerate(track.get("elements", []))]
        )

    @staticmethod
    def _export_label(label):
        return CommonData.Labels(
            id=label.id,
            name=label.name,
            color=label.color,
            type=label.type
        )

    def group_by_frame(self, include_empty=False):
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

        if include_empty:
            for idx in self._frame_info:
                if not self._is_frame_deleted(idx):
                    get_frame(idx)

        anno_manager = AnnotationManager(self._annotation_ir)
        for shape in sorted(anno_manager.to_shapes(self.stop, self._annotation_ir.dimension),
                key=lambda shape: shape.get("z_order", 0)):
            shape_data = ''
            if shape['frame'] not in self._frame_info or self._is_frame_deleted(shape['frame']):
                # After interpolation there can be a finishing frame
                # outside of the task boundaries. Filter it out to avoid errors.
                # https://github.com/openvinotoolkit/cvat/issues/2827
                # Also we skipped deleted frames here
                continue
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
            if tag['frame'] not in self._frame_info or tag['frame'] in self._deleted_frames:
                continue
            get_frame(tag['frame']).tags.append(self._export_tag(tag))

        return iter(frames.values())

    @property
    def shapes(self):
        for shape in self._annotation_ir.shapes:
            if not self._is_frame_deleted(shape["frame"]):
                yield self._export_labeled_shape(shape)

    def _is_frame_deleted(self, frame):
        return frame in self._deleted_frames

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
    def _get_filename(path):
        return osp.splitext(path)[0]

    def match_frame(self, path, root_hint=None, path_has_ext=True):
        if path_has_ext:
            path = self._get_filename(path)
        match = self._frame_mapping.get(path)
        if not match and root_hint and not path.startswith(root_hint):
            path = osp.join(root_hint, path)
            match = self._frame_mapping.get(path)
        return match

    def match_frame_fuzzy(self, path):
        # Preconditions:
        # - The input dataset is full, i.e. all items present. Partial dataset
        # matching can't be correct for all input cases.
        # - path is the longest path of input dataset in terms of path parts

        path = Path(self._get_filename(path)).parts
        for p, v in self._frame_mapping.items():
            if Path(p).parts[-len(path):] == path: # endswith() for paths
                return v
        return None

class JobData(CommonData):
    META_FIELD = "job"
    def __init__(self, annotation_ir, db_job, host='', create_callback=None):
        self._db_job = db_job
        self._db_task = db_job.segment.task

        super().__init__(annotation_ir, self._db_task, host, create_callback)

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

    def __len__(self):
        segment = self._db_job.segment
        return segment.stop_frame - segment.start_frame + 1

    def _get_queryset(self):
        return self._db_data.images.filter(frame__in=self.abs_range)

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
    def __init__(self, annotation_ir, db_task, host='', create_callback=None):
        self._db_task = db_task
        super().__init__(annotation_ir, db_task, host, create_callback)

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
                        host, db_segment.job_set.all()[0].id))]
                )) for db_segment in db_segments
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

    def __init__(self, annotation_irs: Mapping[str, AnnotationIR], db_project: Project, host: str = '', task_annotations: Mapping[int, Any] = None, project_annotation=None):
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
            ((db_task.id, db_task) for db_task in self._db_project.tasks.order_by("subset","id").all())
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
            tracked_shape["track_id"] = idx
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
            for ident in self._frame_info:
                if ident not in self._deleted_frames:
                    get_frame(*ident)

        for task in self._db_tasks.values():
            anno_manager = AnnotationManager(self._annotation_irs[task.id])
            for shape in sorted(anno_manager.to_shapes(task.data.size, self._annotation_irs[task.id].dimension),
                    key=lambda shape: shape.get("z_order", 0)):
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

    def match_frame(self, path: str, subset: str=dm.DEFAULT_SUBSET_NAME, root_hint: str=None, path_has_ext: bool=True):
        if path_has_ext:
            path = self._get_filename(path)
        match_task, match_frame = self._frame_mapping.get((subset, path), (None, None))
        if not match_frame and root_hint and not path.startswith(root_hint):
            path = osp.join(root_hint, path)
            match_task, match_frame = self._frame_mapping.get((subset, path), (None, None))
        return match_task, match_frame

    def match_frame_fuzzy(self, path):
        path = Path(self._get_filename(path)).parts
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

class CVATDataExtractorMixin:
    def __init__(self, media_type=dm.Image):
        super().__init__()

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

        return convert_cvat_anno_to_dm(cvat_frame_anno, label_attrs, map_label)


class CvatTaskOrJobDataExtractor(dm.SourceExtractor, CVATDataExtractorMixin):
    def __init__(self, instance_data: CommonData, include_images=False, format_type=None, dimension=DimensionType.DIM_2D):
        super().__init__(media_type=dm.Image if dimension == DimensionType.DIM_2D else PointCloud)
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

        if dimension == DimensionType.DIM_3D:
            def _make_image(image_id, **kwargs):
                loader = osp.join(
                    instance_data.db_data.get_upload_dirname(), kwargs['path'])
                related_images = []
                image = Img.objects.get(id=image_id)
                for i in image.related_files.all():
                    path = osp.realpath(str(i.path))
                    if osp.isfile(path):
                        related_images.append(path)
                return loader, related_images

        elif include_images:
            frame_provider = FrameProvider(instance_data.db_data)
            if is_video:
                # optimization for videos: use numpy arrays instead of bytes
                # some formats or transforms can require image data
                def _make_image(i, **kwargs):
                    loader = lambda _: frame_provider.get_frame(i,
                        quality=frame_provider.Quality.ORIGINAL,
                        out_type=frame_provider.Type.NUMPY_ARRAY)[0]
                    return dm.Image(data=loader, **kwargs)
            else:
                # for images use encoded data to avoid recoding
                def _make_image(i, **kwargs):
                    loader = lambda _: frame_provider.get_frame(i,
                        quality=frame_provider.Quality.ORIGINAL,
                        out_type=frame_provider.Type.BUFFER)[0].getvalue()
                    return dm.ByteImage(data=loader, **kwargs)

        for frame_data in instance_data.group_by_frame(include_empty=True):
            image_args = {
                'path': frame_data.name + ext,
                'size': (frame_data.height, frame_data.width),
            }

            if dimension == DimensionType.DIM_3D:
                dm_image = _make_image(frame_data.id, **image_args)
            elif include_images:
                dm_image = _make_image(frame_data.idx, **image_args)
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

        return convert_cvat_anno_to_dm(cvat_frame_anno, label_attrs, map_label, self._format_type, self._dimension)

class CVATProjectDataExtractor(dm.Extractor, CVATDataExtractorMixin):
    def __init__(self, project_data: ProjectData, include_images: bool = False, format_type: str = None, dimension: DimensionType = DimensionType.DIM_2D):
        super().__init__(media_type=dm.Image if dimension == DimensionType.DIM_2D else PointCloud)
        self._categories = self._load_categories(project_data.meta[project_data.META_FIELD]['labels'])
        self._user = self._load_user_info(project_data.meta[project_data.META_FIELD]) if dimension == DimensionType.DIM_3D else {}
        self._dimension = dimension
        self._format_type = format_type

        dm_items: List[dm.DatasetItem] = []

        ext_per_task: Dict[int, str] = {}
        image_maker_per_task: Dict[int, Callable] = {}

        for task in project_data.tasks:
            is_video = task.mode == 'interpolation'
            ext_per_task[task.id] = FrameProvider.VIDEO_FRAME_EXT if is_video else ''
            if self._dimension == DimensionType.DIM_3D:
                def image_maker_factory(task):
                    images_query = task.data.images.prefetch_related()
                    def _make_image(i, **kwargs):
                        loader = osp.join(
                            task.data.get_upload_dirname(), kwargs['path'],
                        )
                        related_images = []
                        image = images_query.get(id=i)
                        for i in image.related_files.all():
                            path = osp.realpath(str(i.path))
                            if osp.isfile(path):
                                related_images.append(path)
                        return loader, related_images
                    return _make_image
                image_maker_per_task[task.id] = image_maker_factory(task)
            elif include_images:
                if is_video:
                    # optimization for videos: use numpy arrays instead of bytes
                    # some formats or transforms can require image data
                    def image_maker_factory(task):
                        frame_provider = FrameProvider(task.data)
                        def _make_image(i, **kwargs):
                            loader = lambda _: frame_provider.get_frame(i,
                                quality=frame_provider.Quality.ORIGINAL,
                                out_type=frame_provider.Type.NUMPY_ARRAY)[0]
                            return dm.Image(data=loader, **kwargs)
                        return _make_image
                else:
                    # for images use encoded data to avoid recoding
                    def image_maker_factory(task):
                        frame_provider = FrameProvider(task.data)
                        def _make_image(i, **kwargs):
                            loader = lambda _: frame_provider.get_frame(i,
                                quality=frame_provider.Quality.ORIGINAL,
                                out_type=frame_provider.Type.BUFFER)[0].getvalue()
                            return dm.ByteImage(data=loader, **kwargs)
                        return _make_image
                image_maker_per_task[task.id] = image_maker_factory(task)

        for frame_data in project_data.group_by_frame(include_empty=True):
            image_args = {
                'path': frame_data.name + ext_per_task[frame_data.task_id],
                'size': (frame_data.height, frame_data.width),
            }
            if self._dimension == DimensionType.DIM_3D:
                dm_image = image_maker_per_task[frame_data.task_id](frame_data.id, **image_args)
            elif include_images:
                dm_image = image_maker_per_task[frame_data.task_id](frame_data.idx, **image_args)
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
):
    if isinstance(instance_data, ProjectData):
        return CVATProjectDataExtractor(instance_data, include_images, format_type, dimension)
    else:
        return CvatTaskOrJobDataExtractor(instance_data, include_images, format_type, dimension)

class CvatImportError(Exception):
    pass

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


def convert_cvat_anno_to_dm(cvat_frame_anno, label_attrs, map_label, format_name=None, dimension=DimensionType.DIM_2D):
    item_anno = []

    def convert_attrs(label, cvat_attrs):
        cvat_attrs = {a.name: a.value for a in cvat_attrs}
        dm_attr = dict()
        for _, a_desc in label_attrs[label]:
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

    for tag_obj in cvat_frame_anno.tags:
        anno_group = tag_obj.group or 0
        anno_label = map_label(tag_obj.label)
        anno_attr = convert_attrs(tag_obj.label, tag_obj.attributes)

        anno = dm.Label(label=anno_label,
            attributes=anno_attr, group=anno_group)
        item_anno.append(anno)

    num_of_tracks = reduce(lambda a, x: a + (1 if getattr(x, 'track_id', None) is not None else 0), cvat_frame_anno.labeled_shapes, 0)
    for index, shape_obj in enumerate(cvat_frame_anno.labeled_shapes):
        anno_group = shape_obj.group or 0
        anno_label = map_label(shape_obj.label)
        anno_attr = convert_attrs(shape_obj.label, shape_obj.attributes)
        anno_attr['occluded'] = shape_obj.occluded
        if shape_obj.type == ShapeType.RECTANGLE:
            anno_attr['rotation'] = shape_obj.rotation

        if hasattr(shape_obj, 'track_id'):
            anno_attr['track_id'] = shape_obj.track_id
            anno_attr['keyframe'] = shape_obj.keyframe

        anno_points = shape_obj.points
        if shape_obj.type == ShapeType.POINTS:
            anno = dm.Points(anno_points,
                label=anno_label, attributes=anno_attr, group=anno_group,
                z_order=shape_obj.z_order)
        elif shape_obj.type == ShapeType.ELLIPSE:
            # TODO: for now Datumaro does not support ellipses
            # so, we convert an ellipse to RLE mask here
            # instead of applying transformation in directly in formats
            anno = EllipsesToMasks.convert_ellipse(SimpleNamespace(**{
                "points": shape_obj.points,
                "label": anno_label,
                "z_order": shape_obj.z_order,
                "rotation": shape_obj.rotation,
                "group": anno_group,
                "attributes": anno_attr,
            }), cvat_frame_anno.height, cvat_frame_anno.width)
        elif shape_obj.type == ShapeType.MASK:
            anno = CVATRleToCOCORle.convert_mask(SimpleNamespace(**{
                "points": shape_obj.points,
                "label": anno_label,
                "z_order": shape_obj.z_order,
                "rotation": shape_obj.rotation,
                "group": anno_group,
                "attributes": anno_attr,
            }), cvat_frame_anno.height, cvat_frame_anno.width)
        elif shape_obj.type == ShapeType.POLYLINE:
            anno = dm.PolyLine(anno_points,
                label=anno_label, attributes=anno_attr, group=anno_group,
                z_order=shape_obj.z_order)
        elif shape_obj.type == ShapeType.POLYGON:
            anno = dm.Polygon(anno_points,
                label=anno_label, attributes=anno_attr, group=anno_group,
                z_order=shape_obj.z_order)
        elif shape_obj.type == ShapeType.RECTANGLE:
            x0, y0, x1, y1 = anno_points
            anno = dm.Bbox(x0, y0, x1 - x0, y1 - y0,
                label=anno_label, attributes=anno_attr, group=anno_group,
                z_order=shape_obj.z_order)
        elif shape_obj.type == ShapeType.CUBOID:
            if dimension == DimensionType.DIM_3D:
                anno_id = getattr(shape_obj, 'track_id', None)
                if anno_id is None:
                    anno_id = num_of_tracks + index
                position, rotation, scale = anno_points[0:3], anno_points[3:6], anno_points[6:9]
                anno = dm.Cuboid3d(
                    id=anno_id, position=position, rotation=rotation, scale=scale,
                    label=anno_label, attributes=anno_attr, group=anno_group
                )
            else:
                continue
        elif shape_obj.type == ShapeType.SKELETON:
            elements = []
            for element in shape_obj.elements:
                element_attr = convert_attrs(shape_obj.label + element.label, element.attributes)

                if hasattr(element, 'track_id'):
                    element_attr['track_id'] = element.track_id
                    element_attr['keyframe'] = element.keyframe
                element_vis = dm.Points.Visibility.visible
                if element.outside:
                    element_vis = dm.Points.Visibility.absent
                elif element.occluded:
                    element_vis = dm.Points.Visibility.hidden
                elements.append(dm.Points(element.points, [element_vis],
                    label=map_label(element.label, shape_obj.label), attributes=element_attr))

            anno = dm.Skeleton(elements, label=anno_label,
                attributes=anno_attr, group=anno_group, z_order=shape_obj.z_order)
        else:
            raise Exception("Unknown shape type '%s'" % shape_obj.type)

        item_anno.append(anno)

    return item_anno

def match_dm_item(item, instance_data, root_hint=None):
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

def find_dataset_root(dm_dataset, instance_data: Union[ProjectData, CommonData]):
    longest_path = max(dm_dataset, key=lambda x: len(Path(x.id).parts),
        default=None)
    if longest_path is None:
        return None
    longest_path = longest_path.id

    longest_match = instance_data.match_frame_fuzzy(longest_path)
    if longest_match is None:
        return None
    longest_match = osp.dirname(instance_data.frame_info[longest_match]['path'])
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

    label_cat = dm_dataset.categories()[dm.AnnotationType.label]

    root_hint = find_dataset_root(dm_dataset, instance_data)

    tracks = {}

    for item in dm_dataset:
        frame_number = instance_data.abs_frame_id(
            match_dm_item(item, instance_data, root_hint=root_hint))

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
                    occluded = dm.util.cast(ann.attributes.pop('occluded', None), bool) is True
                    keyframe = dm.util.cast(ann.attributes.get('keyframe', None), bool) is True
                    outside = dm.util.cast(ann.attributes.pop('outside', None), bool) is True

                    track_id = ann.attributes.pop('track_id', None)
                    source = ann.attributes.pop('source').lower() \
                        if ann.attributes.get('source', '').lower() in {'auto', 'manual'} else 'manual'

                    shape_type = shapes[ann.type]
                    if track_id is None or 'keyframe' not in ann.attributes or dm_dataset.format not in ['cvat', 'datumaro', 'sly_pointcloud']:
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
                                    if element.attributes.get('source', '').lower() in {'auto', 'manual'} else 'manual'
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

                    if keyframe or outside:
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
                                element_keyframe = dm.util.cast(element.attributes.get('keyframe', None), bool) is True
                                element_occluded = element.visibility[0] == dm.Points.Visibility.hidden
                                element_outside = element.visibility[0] == dm.Points.Visibility.absent
                                if not element_keyframe and not element_outside:
                                    continue

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
                                    if element.attributes.get('source', '').lower() in {'auto', 'manual'} else 'manual'
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

    for track in tracks.values():
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
