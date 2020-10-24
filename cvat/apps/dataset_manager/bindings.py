
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from collections import OrderedDict, namedtuple
from pathlib import Path

from django.utils import timezone

import datumaro.components.extractor as datumaro
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import AttributeType, ShapeType
from datumaro.util import cast
from datumaro.util.image import ByteImage, Image

from .annotation import AnnotationManager, TrackManager


class TaskData:
    Attribute = namedtuple('Attribute', 'name, value')
    LabeledShape = namedtuple(
        'LabeledShape', 'type, frame, label, points, occluded, attributes, source, group, z_order')
    LabeledShape.__new__.__defaults__ = (0, 0)
    TrackedShape = namedtuple(
        'TrackedShape', 'type, frame, points, occluded, outside, keyframe, attributes, source, group, z_order, label, track_id')
    TrackedShape.__new__.__defaults__ = ('manual', 0, 0, None, 0)
    Track = namedtuple('Track', 'label, group, source, shapes')
    Tag = namedtuple('Tag', 'frame, label, attributes, source, group')
    Tag.__new__.__defaults__ = (0, )
    Frame = namedtuple(
        'Frame', 'idx, frame, name, width, height, labeled_shapes, tags')

    def __init__(self, annotation_ir, db_task, host='', create_callback=None):
        self._annotation_ir = annotation_ir
        self._db_task = db_task
        self._host = host
        self._create_callback = create_callback
        self._MAX_ANNO_SIZE = 30000
        self._frame_info = {}
        self._frame_mapping = {}
        self._frame_step = db_task.data.get_frame_step()

        db_labels = self._db_task.label_set.all().prefetch_related(
            'attributespec_set').order_by('pk')

        self._label_mapping = OrderedDict(
            (db_label.id, db_label) for db_label in db_labels)

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

        self._init_frame_info()
        self._init_meta()

    def _get_label_id(self, label_name):
        for db_label in self._label_mapping.values():
            if label_name == db_label.name:
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

    def abs_frame_id(self, relative_id):
        if relative_id not in range(0, self._db_task.data.size):
            raise ValueError("Unknown internal frame id %s" % relative_id)
        return relative_id * self._frame_step + self._db_task.data.start_frame

    def rel_frame_id(self, absolute_id):
        d, m = divmod(
            absolute_id - self._db_task.data.start_frame, self._frame_step)
        if m or d not in range(0, self._db_task.data.size):
            raise ValueError("Unknown frame %s" % absolute_id)
        return d

    def _init_frame_info(self):
        if hasattr(self._db_task.data, 'video'):
            self._frame_info = {frame: {
                "path": "frame_{:06d}".format(self.abs_frame_id(frame)),
                "width": self._db_task.data.video.width,
                "height": self._db_task.data.video.height,
            } for frame in range(self._db_task.data.size)}
        else:
            self._frame_info = {self.rel_frame_id(db_image.frame): {
                "path": db_image.path,
                "width": db_image.width,
                "height": db_image.height,
            } for db_image in self._db_task.data.images.all()}

        self._frame_mapping = {
            self._get_filename(info["path"]): frame_number
            for frame_number, info in self._frame_info.items()
        }

    def _init_meta(self):
        db_segments = self._db_task.segment_set.all().prefetch_related('job_set')
        self._meta = OrderedDict([
            ("task", OrderedDict([
                ("id", str(self._db_task.id)),
                ("name", self._db_task.name),
                ("size", str(self._db_task.data.size)),
                ("mode", self._db_task.mode),
                ("overlap", str(self._db_task.overlap)),
                ("bugtracker", self._db_task.bug_tracker),
                ("created", str(timezone.localtime(self._db_task.created_date))),
                ("updated", str(timezone.localtime(self._db_task.updated_date))),
                ("start_frame", str(self._db_task.data.start_frame)),
                ("stop_frame", str(self._db_task.data.stop_frame)),
                ("frame_filter", self._db_task.data.frame_filter),

                ("labels", [
                    ("label", OrderedDict([
                        ("name", db_label.name),
                        ("color", db_label.color),
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
                        ("url", "{}/?id={}".format(
                            self._host, db_segment.job_set.all()[0].id))]
                    )) for db_segment in db_segments
                ]),

                ("owner", OrderedDict([
                    ("username", self._db_task.owner.username),
                    ("email", self._db_task.owner.email)
                ]) if self._db_task.owner else ""),

                ("assignee", OrderedDict([
                    ("username", self._db_task.assignee.username),
                    ("email", self._db_task.assignee.email)
                ]) if self._db_task.assignee else ""),
            ])),
            ("dumped", str(timezone.localtime(timezone.now())))
        ])

        if hasattr(self._db_task.data, "video"):
            self._meta["task"]["original_size"] = OrderedDict([
                ("width", str(self._db_task.data.video.width)),
                ("height", str(self._db_task.data.video.height))
            ])
            # Add source to dumped file
            self._meta["source"] = str(
                osp.basename(self._db_task.data.video.path))

    def _export_attributes(self, attributes):
        exported_attributes = []
        for attr in attributes:
            attribute_name = self._get_attribute_name(attr["spec_id"])
            exported_attributes.append(TaskData.Attribute(
                name=attribute_name,
                value=attr["value"],
            ))
        return exported_attributes

    def _export_tracked_shape(self, shape):
        return TaskData.TrackedShape(
            type=shape["type"],
            frame=self.abs_frame_id(shape["frame"]),
            label=self._get_label_name(shape["label_id"]),
            points=shape["points"],
            occluded=shape["occluded"],
            z_order=shape.get("z_order", 0),
            group=shape.get("group", 0),
            outside=shape.get("outside", False),
            keyframe=shape.get("keyframe", True),
            track_id=shape["track_id"],
            source=shape.get("source", "manual"),
            attributes=self._export_attributes(shape["attributes"]),
        )

    def _export_labeled_shape(self, shape):
        return TaskData.LabeledShape(
            type=shape["type"],
            label=self._get_label_name(shape["label_id"]),
            frame=self.abs_frame_id(shape["frame"]),
            points=shape["points"],
            occluded=shape["occluded"],
            z_order=shape.get("z_order", 0),
            group=shape.get("group", 0),
            source=shape["source"],
            attributes=self._export_attributes(shape["attributes"]),
        )

    def _export_tag(self, tag):
        return TaskData.Tag(
            frame=self.abs_frame_id(tag["frame"]),
            label=self._get_label_name(tag["label_id"]),
            group=tag.get("group", 0),
            source=tag["source"],
            attributes=self._export_attributes(tag["attributes"]),
        )

    def group_by_frame(self, include_empty=False):
        frames = {}
        def get_frame(idx):
            frame_info = self._frame_info[idx]
            frame = self.abs_frame_id(idx)
            if frame not in frames:
                frames[frame] = TaskData.Frame(
                    idx=idx,
                    frame=frame,
                    name=frame_info['path'],
                    height=frame_info["height"],
                    width=frame_info["width"],
                    labeled_shapes=[],
                    tags=[],
                )
            return frames[frame]

        if include_empty:
            for idx in self._frame_info:
                get_frame(idx)

        anno_manager = AnnotationManager(self._annotation_ir)
        for shape in sorted(anno_manager.to_shapes(self._db_task.data.size),
                key=lambda shape: shape.get("z_order", 0)):
            if 'track_id' in shape:
                if shape['outside']:
                    continue
                exported_shape = self._export_tracked_shape(shape)
            else:
                exported_shape = self._export_labeled_shape(shape)
            get_frame(shape['frame']).labeled_shapes.append(
                exported_shape)

        for tag in self._annotation_ir.tags:
            get_frame(tag['frame']).tags.append(self._export_tag(tag))

        return iter(frames.values())

    @property
    def shapes(self):
        for shape in self._annotation_ir.shapes:
            yield self._export_labeled_shape(shape)

    @property
    def tracks(self):
        for idx, track in enumerate(self._annotation_ir.tracks):
            tracked_shapes = TrackManager.get_interpolated_shapes(
                track, 0, self._db_task.data.size)
            for tracked_shape in tracked_shapes:
                tracked_shape["attributes"] += track["attributes"]
                tracked_shape["track_id"] = idx
                tracked_shape["group"] = track["group"]
                tracked_shape["source"] = track["source"]
                tracked_shape["label_id"] = track["label_id"]

            yield TaskData.Track(
                label=self._get_label_name(track["label_id"]),
                group=track["group"],
                source=track["source"],
                shapes=[self._export_tracked_shape(shape)
                    for shape in tracked_shapes],
            )

    @property
    def tags(self):
        for tag in self._annotation_ir.tags:
            yield self._export_tag(tag)

    @property
    def meta(self):
        return self._meta

    def _import_tag(self, tag):
        _tag = tag._asdict()
        label_id = self._get_label_id(_tag.pop('label'))
        _tag['frame'] = self.rel_frame_id(int(_tag['frame']))
        _tag['label_id'] = label_id
        _tag['attributes'] = [self._import_attribute(label_id, attrib)
            for attrib in _tag['attributes']
            if self._get_attribute_id(label_id, attrib.name)]
        return _tag

    def _import_attribute(self, label_id, attribute):
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

        return { 'spec_id': spec_id, 'value': value }

    def _import_shape(self, shape):
        _shape = shape._asdict()
        label_id = self._get_label_id(_shape.pop('label'))
        _shape['frame'] = self.rel_frame_id(int(_shape['frame']))
        _shape['label_id'] = label_id
        _shape['attributes'] = [self._import_attribute(label_id, attrib)
            for attrib in _shape['attributes']
            if self._get_attribute_id(label_id, attrib.name)]
        _shape['points'] = list(map(float, _shape['points']))
        return _shape

    def _import_track(self, track):
        _track = track._asdict()
        label_id = self._get_label_id(_track.pop('label'))
        _track['frame'] = self.rel_frame_id(
            min(int(shape.frame) for shape in _track['shapes']))
        _track['label_id'] = label_id
        _track['attributes'] = []
        _track['shapes'] = [shape._asdict() for shape in _track['shapes']]
        for shape in _track['shapes']:
            shape['frame'] = self.rel_frame_id(int(shape['frame']))
            _track['attributes'] = [self._import_attribute(label_id, attrib)
                for attrib in shape['attributes']
                if self._get_immutable_attribute_id(label_id, attrib.name)]
            shape['attributes'] = [self._import_attribute(label_id, attrib)
                for attrib in shape['attributes']
                if self._get_mutable_attribute_id(label_id, attrib.name)]
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
    def frame_step(self):
        return self._frame_step

    @property
    def db_task(self):
        return self._db_task

    @staticmethod
    def _get_filename(path):
        return osp.splitext(path)[0]

    def match_frame(self, path, root_hint=None):
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

class CvatTaskDataExtractor(datumaro.SourceExtractor):
    def __init__(self, task_data, include_images=False):
        super().__init__()
        self._categories = self._load_categories(task_data)

        dm_items = []

        is_video = task_data.meta['task']['mode'] == 'interpolation'
        ext = ''
        if is_video:
            ext = FrameProvider.VIDEO_FRAME_EXT
        if include_images:
            frame_provider = FrameProvider(task_data.db_task.data)
            if is_video:
                # optimization for videos: use numpy arrays instead of bytes
                # some formats or transforms can require image data
                def _make_image(i, **kwargs):
                    loader = lambda _: frame_provider.get_frame(i,
                        quality=frame_provider.Quality.ORIGINAL,
                        out_type=frame_provider.Type.NUMPY_ARRAY)[0]
                    return Image(loader=loader, **kwargs)
            else:
                # for images use encoded data to avoid recoding
                def _make_image(i, **kwargs):
                    loader = lambda _: frame_provider.get_frame(i,
                        quality=frame_provider.Quality.ORIGINAL,
                        out_type=frame_provider.Type.BUFFER)[0].getvalue()
                    return ByteImage(data=loader, **kwargs)

        for frame_data in task_data.group_by_frame(include_empty=True):
            image_args = {
                'path': frame_data.name + ext,
                'size': (frame_data.height, frame_data.width),
            }
            if include_images:
                dm_image = _make_image(frame_data.idx, **image_args)
            else:
                dm_image = Image(**image_args)
            dm_anno = self._read_cvat_anno(frame_data, task_data)
            dm_item = datumaro.DatasetItem(id=osp.splitext(frame_data.name)[0],
                annotations=dm_anno, image=dm_image,
                attributes={'frame': frame_data.frame})
            dm_items.append(dm_item)

        self._items = dm_items

    def __iter__(self):
        for item in self._items:
            yield item

    def __len__(self):
        return len(self._items)

    def categories(self):
        return self._categories

    @staticmethod
    def _load_categories(cvat_anno):
        categories = {}

        label_categories = datumaro.LabelCategories(attributes=['occluded'])

        for _, label in cvat_anno.meta['task']['labels']:
            label_categories.add(label['name'])
            for _, attr in label['attributes']:
                label_categories.attributes.add(attr['name'])

        categories[datumaro.AnnotationType.label] = label_categories

        return categories

    def _read_cvat_anno(self, cvat_frame_anno, task_data):
        item_anno = []

        categories = self.categories()
        label_cat = categories[datumaro.AnnotationType.label]
        def map_label(name): return label_cat.find(name)[0]
        label_attrs = {
            label['name']: label['attributes']
            for _, label in task_data.meta['task']['labels']
        }

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

            anno = datumaro.Label(label=anno_label,
                attributes=anno_attr, group=anno_group)
            item_anno.append(anno)

        for shape_obj in cvat_frame_anno.labeled_shapes:
            anno_group = shape_obj.group or 0
            anno_label = map_label(shape_obj.label)
            anno_attr = convert_attrs(shape_obj.label, shape_obj.attributes)
            anno_attr['occluded'] = shape_obj.occluded

            if hasattr(shape_obj, 'track_id'):
                anno_attr['track_id'] = shape_obj.track_id
                anno_attr['keyframe'] = shape_obj.keyframe

            anno_points = shape_obj.points
            if shape_obj.type == ShapeType.POINTS:
                anno = datumaro.Points(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group,
                    z_order=shape_obj.z_order)
            elif shape_obj.type == ShapeType.POLYLINE:
                anno = datumaro.PolyLine(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group,
                    z_order=shape_obj.z_order)
            elif shape_obj.type == ShapeType.POLYGON:
                anno = datumaro.Polygon(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group,
                    z_order=shape_obj.z_order)
            elif shape_obj.type == ShapeType.RECTANGLE:
                x0, y0, x1, y1 = anno_points
                anno = datumaro.Bbox(x0, y0, x1 - x0, y1 - y0,
                    label=anno_label, attributes=anno_attr, group=anno_group,
                    z_order=shape_obj.z_order)
            elif shape_obj.type == ShapeType.CUBOID:
                continue # Datumaro does not support cuboids
            else:
                raise Exception("Unknown shape type '%s'" % shape_obj.type)

            item_anno.append(anno)

        return item_anno

def match_dm_item(item, task_data, root_hint=None):
    is_video = task_data.meta['task']['mode'] == 'interpolation'

    frame_number = None
    if frame_number is None and item.has_image:
        frame_number = task_data.match_frame(item.image.path, root_hint)
    if frame_number is None:
        frame_number = task_data.match_frame(item.id, root_hint)
    if frame_number is None:
        frame_number = cast(item.attributes.get('frame', item.id), int)
    if frame_number is None and is_video:
        frame_number = cast(osp.basename(item.id)[len('frame_'):], int)

    if not frame_number in task_data.frame_info:
        raise Exception("Could not match item id: '%s' with any task frame" %
            item.id)
    return frame_number

def find_dataset_root(dm_dataset, task_data):
    longest_path = max(dm_dataset, key=lambda x: len(Path(x.id).parts)).id
    longest_match = task_data.match_frame_fuzzy(longest_path)
    if longest_match is None:
        return None

    longest_match = osp.dirname(task_data.frame_info[longest_match]['path'])
    prefix = longest_match[:-len(osp.dirname(longest_path)) or None]
    if prefix.endswith('/'):
        prefix = prefix[:-1]
    return prefix


def import_dm_annotations(dm_dataset, task_data):
    shapes = {
        datumaro.AnnotationType.bbox: ShapeType.RECTANGLE,
        datumaro.AnnotationType.polygon: ShapeType.POLYGON,
        datumaro.AnnotationType.polyline: ShapeType.POLYLINE,
        datumaro.AnnotationType.points: ShapeType.POINTS,
    }

    if len(dm_dataset) == 0:
        return

    label_cat = dm_dataset.categories()[datumaro.AnnotationType.label]

    root_hint = find_dataset_root(dm_dataset, task_data)

    for item in dm_dataset:
        frame_number = task_data.abs_frame_id(
            match_dm_item(item, task_data, root_hint=root_hint))

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

        for ann in item.annotations:
            if ann.type in shapes:
                task_data.add_shape(task_data.LabeledShape(
                    type=shapes[ann.type],
                    frame=frame_number,
                    label=label_cat.items[ann.label].name,
                    points=ann.points,
                    occluded=ann.attributes.get('occluded') == True,
                    z_order=ann.z_order,
                    group=group_map.get(ann.group, 0),
                    source='manual',
                    attributes=[task_data.Attribute(name=n, value=str(v))
                        for n, v in ann.attributes.items()],
                ))
            elif ann.type == datumaro.AnnotationType.label:
                task_data.add_tag(task_data.Tag(
                    frame=frame_number,
                    label=label_cat.items[ann.label].name,
                    group=group_map.get(ann.group, 0),
                    source='manual',
                    attributes=[task_data.Attribute(name=n, value=str(v))
                        for n, v in ann.attributes.items()],
                ))
