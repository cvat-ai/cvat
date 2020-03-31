
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import osp as osp
from collections import OrderedDict, namedtuple
from copy import deepcopy

from django.db import transaction
from django.utils import timezone

import datumaro.components.extractor as datumaro
from cvat.apps.engine.annotation import TaskAnnotation
from cvat.apps.engine.annotation_manager import AnnotationManager, TrackManager
from cvat.apps.engine.models import AttributeType, ShapeType
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.serializers import LabeledDataSerializer
from datumaro.util.image import Image


class AnnotationIR:
    def __init__(self, data=None):
        self.reset()
        if data:
            self._tags = getattr(data, 'tags', []) or data['tags']
            self._shapes = getattr(data, 'shapes', []) or data['shapes']
            self._tracks = getattr(data, 'tracks', []) or data['tracks']

    def add_tag(self, tag):
        self._tags.append(tag)

    def add_shape(self, shape):
        self._shapes.append(shape)

    def add_track(self, track):
        self._tracks.append(track)

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

    def __getitem__(self, key):
        return getattr(self, key)

    @property
    def data(self):
        return {
            'version': self.version,
            'tags': self.tags,
            'shapes': self.shapes,
            'tracks': self.tracks,
        }

    def serialize(self):
        serializer = LabeledDataSerializer(data=self.data)
        if serializer.is_valid(raise_exception=True):
            return serializer.data

    # makes a data copy from specified frame interval
    def slice(self, start, stop):
        def is_frame_inside(x): return (start <= int(x['frame']) <= stop)
        splitted_data = AnnotationIR()
        splitted_data.tags = deepcopy(list(filter(is_frame_inside, self.tags)))
        splitted_data.shapes = deepcopy(
            list(filter(is_frame_inside, self.shapes)))
        splitted_data.tracks = deepcopy(list(filter(lambda y: len(
            list(filter(is_frame_inside, y['shapes']))), self.tracks)))

        return splitted_data

    @data.setter
    def data(self, data):
        self.version = data['version']
        self.tags = data['tags']
        self.shapes = data['shapes']
        self.tracks = data['tracks']

    def reset(self):
        self._version = 0
        self._tags = []
        self._shapes = []
        self._tracks = []


class Annotation:
    Attribute = namedtuple('Attribute', 'name, value')
    LabeledShape = namedtuple(
        'LabeledShape', 'type, frame, label, points, occluded, attributes, group, z_order')
    LabeledShape.__new__.__defaults__ = (0, 0)
    TrackedShape = namedtuple(
        'TrackedShape', 'type, frame, points, occluded, outside, keyframe, attributes, group, z_order, label, track_id')
    TrackedShape.__new__.__defaults__ = (0, 0, None, 0)
    Track = namedtuple('Track', 'label, group, shapes')
    Tag = namedtuple('Tag', 'frame, label, attributes, group')
    Tag.__new__.__defaults__ = (0, )
    Frame = namedtuple(
        'Frame', 'frame, name, width, height, labeled_shapes, tags')

    def __init__(self, annotation_ir, db_task, scheme='', host='', create_callback=None):
        self._annotation_ir = annotation_ir
        self._db_task = db_task
        self._scheme = scheme
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
            'mutable': {}, 'immutable': {}} for db_label in db_labels}

        for db_label in db_labels:
            for db_attribute in db_label.attributespec_set.all():
                if db_attribute.mutable:
                    self._attribute_mapping[db_label.id]['mutable'][db_attribute.id] = db_attribute.name
                else:
                    self._attribute_mapping[db_label.id]['immutable'][db_attribute.id] = db_attribute.name

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
        return None

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

    def _init_frame_info(self):
        if hasattr(self._db_task.data, 'video'):
            self._frame_info = {
                frame: {
                    "path": "frame_{:06d}".format(frame),
                    "width": self._db_task.data.video.width,
                    "height": self._db_task.data.video.height,
                } for frame in range(self._db_task.data.size)
            }
        else:
            self._frame_info = {db_image.frame: {
                "path": db_image.path,
                "width": db_image.width,
                "height": db_image.height,
            } for db_image in self._db_task.data.images.all()}

        self._frame_mapping = {
            self._get_filename(info["path"]): frame
            for frame, info in self._frame_info.items()
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
                ("z_order", str(self._db_task.z_order)),

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
            exported_attributes.append(Annotation.Attribute(
                name=attribute_name,
                value=attr["value"],
            ))
        return exported_attributes

    def _export_tracked_shape(self, shape):
        return Annotation.TrackedShape(
            type=shape["type"],
            frame=self._db_task.data.start_frame +
            shape["frame"] * self._frame_step,
            label=self._get_label_name(shape["label_id"]),
            points=shape["points"],
            occluded=shape["occluded"],
            z_order=shape.get("z_order", 0),
            group=shape.get("group", 0),
            outside=shape.get("outside", False),
            keyframe=shape.get("keyframe", True),
            track_id=shape["track_id"],
            attributes=self._export_attributes(shape["attributes"]),
        )

    def _export_labeled_shape(self, shape):
        return Annotation.LabeledShape(
            type=shape["type"],
            label=self._get_label_name(shape["label_id"]),
            frame=self._db_task.data.start_frame +
            shape["frame"] * self._frame_step,
            points=shape["points"],
            occluded=shape["occluded"],
            z_order=shape.get("z_order", 0),
            group=shape.get("group", 0),
            attributes=self._export_attributes(shape["attributes"]),
        )

    def _export_tag(self, tag):
        return Annotation.Tag(
            frame=self._db_task.data.start_frame +
            tag["frame"] * self._frame_step,
            label=self._get_label_name(tag["label_id"]),
            group=tag.get("group", 0),
            attributes=self._export_attributes(tag["attributes"]),
        )

    def group_by_frame(self):
        def _get_frame(annotations, shape):
            db_image = self._frame_info[shape["frame"]]
            frame = self._db_task.data.start_frame + \
                shape["frame"] * self._frame_step
            if frame not in annotations:
                annotations[frame] = Annotation.Frame(
                    frame=frame,
                    name=db_image['path'],
                    height=db_image["height"],
                    width=db_image["width"],
                    labeled_shapes=[],
                    tags=[],
                )
            return annotations[frame]

        annotations = {}
        annotation_manager = AnnotationManager(self._annotation_ir)
        for shape in sorted(annotation_manager.to_shapes(self._db_task.data.size), key=lambda shape: shape.get("z_order", 0)):
            if 'track_id' in shape:
                exported_shape = self._export_tracked_shape(shape)
            else:
                exported_shape = self._export_labeled_shape(shape)
            _get_frame(annotations, shape).labeled_shapes.append(
                exported_shape)

        for tag in self._annotation_ir.tags:
            _get_frame(annotations, tag).tags.append(self._export_tag(tag))

        return iter(annotations.values())

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
                tracked_shape["label_id"] = track["label_id"]

            yield Annotation.Track(
                label=self._get_label_name(track["label_id"]),
                group=track["group"],
                shapes=[self._export_tracked_shape(
                    shape) for shape in tracked_shapes],
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
        _tag['frame'] = (int(_tag['frame']) -
            self._db_task.data.start_frame) // self._frame_step
        _tag['label_id'] = label_id
        _tag['attributes'] = [self._import_attribute(label_id, attrib)
            for attrib in _tag['attributes']
            if self._get_attribute_id(label_id, attrib.name)]
        return _tag

    def _import_attribute(self, label_id, attribute):
        return {
            'spec_id': self._get_attribute_id(label_id, attribute.name),
            'value': attribute.value,
        }

    def _import_shape(self, shape):
        _shape = shape._asdict()
        label_id = self._get_label_id(_shape.pop('label'))
        _shape['frame'] = (int(_shape['frame']) -
            self._db_task.data.start_frame) // self._frame_step
        _shape['label_id'] = label_id
        _shape['attributes'] = [self._import_attribute(label_id, attrib)
            for attrib in _shape['attributes']
            if self._get_attribute_id(label_id, attrib.name)]
        return _shape

    def _import_track(self, track):
        _track = track._asdict()
        label_id = self._get_label_id(_track.pop('label'))
        _track['frame'] = (min(int(shape.frame) for shape in _track['shapes']) -
            self._db_task.data.start_frame) // self._frame_step
        _track['label_id'] = label_id
        _track['attributes'] = []
        _track['shapes'] = [shape._asdict() for shape in _track['shapes']]
        for shape in _track['shapes']:
            shape['frame'] = (int(shape['frame']) - \
                self._db_task.data.start_frame) // self._frame_step
            _track['attributes'] = [self._import_attribute(label_id, attrib)
                for attrib in shape['attributes']
                if self._get_immutable_attribute_id(label_id, attrib.name)]
            shape['attributes'] = [self._import_attribute(label_id, attrib)
                for attrib in shape['attributes']
                if self._get_mutable_attribute_id(label_id, attrib.name)]

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

    @staticmethod
    def _get_filename(path):
        return osp.splitext(osp.basename(path))[0]

    def match_frame(self, filename):
        # try to match by filename
        _filename = self._get_filename(filename)
        if _filename in self._frame_mapping:
            return self._frame_mapping[_filename]

        raise Exception(
            "Cannot match filename or determinate framenumber for {} filename".format(filename))


class CvatTaskExtractor(datumaro.Extractor):
    def __init__(self, url, db_task, user, scheme=None, host=None):
        cvat_annotations = TaskAnnotation(db_task.id, user)
        with transaction.atomic():
            cvat_annotations.init_from_db()
        cvat_annotations = Annotation(cvat_annotations.ir_data, db_task,
            scheme=scheme, host=host)
        frame_provider = FrameProvider(db_task.data)

        self._categories = self._load_categories(cvat_annotations)

        dm_annotations = []

        frame_provider.get_frames(
            self._frame_provider.Quality.ORIGINAL,
            self._frame_provider.Type.NUMPY_ARRAY)

        for cvat_frame_anno in cvat_annotations.group_by_frame():
            dm_anno = self._read_cvat_anno(cvat_frame_anno, cvat_annotations)
            dm_image = Image(path=cvat_frame_anno.name, size=(
                cvat_frame_anno.height, cvat_frame_anno.width)
            )
            dm_item = datumaro.DatasetItem(id=cvat_frame_anno.frame,
                annotations=dm_anno, image=dm_image)
            dm_annotations.append((dm_item.id, dm_item))

        dm_annotations = sorted(dm_annotations, key=lambda e: int(e[0]))
        self._items = OrderedDict(dm_annotations)

    def __iter__(self):
        for item in self._items.values():
            yield item

    def __len__(self):
        return len(self._items)

    def categories(self):
        return self._categories

    @staticmethod
    def _load_categories(cvat_anno):
        categories = {}

        label_categories = datumaro.LabelCategories(
            attributes=['occluded', 'z_order'])

        for _, label in cvat_anno.meta['task']['labels']:
            label_categories.add(label['name'])
            for _, attr in label['attributes']:
                label_categories.attributes.add(attr['name'])

        categories[datumaro.AnnotationType.label] = label_categories

        return categories

    def _read_cvat_anno(self, cvat_frame_anno, cvat_task_anno):
        item_anno = []

        categories = self.categories()
        label_cat = categories[datumaro.AnnotationType.label]
        def map_label(name): return label_cat.find(name)[0]
        label_attrs = {
            label['name']: label['attributes']
            for _, label in cvat_task_anno.meta['task']['labels']
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
            anno_group = tag_obj.group
            anno_label = map_label(tag_obj.label)
            anno_attr = convert_attrs(tag_obj.label, tag_obj.attributes)

            anno = datumaro.Label(label=anno_label,
                attributes=anno_attr, group=anno_group)
            item_anno.append(anno)

        for shape_obj in cvat_frame_anno.labeled_shapes:
            anno_group = shape_obj.group
            anno_label = map_label(shape_obj.label)
            anno_attr = convert_attrs(shape_obj.label, shape_obj.attributes)
            anno_attr['occluded'] = shape_obj.occluded
            anno_attr['z_order'] = shape_obj.z_order

            if hasattr(shape_obj, 'track_id'):
                anno_attr['track_id'] = shape_obj.track_id
                anno_attr['keyframe'] = shape_obj.keyframe

            anno_points = shape_obj.points
            if shape_obj.type == ShapeType.POINTS:
                anno = datumaro.Points(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            elif shape_obj.type == ShapeType.POLYLINE:
                anno = datumaro.PolyLine(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            elif shape_obj.type == ShapeType.POLYGON:
                anno = datumaro.Polygon(anno_points,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            elif shape_obj.type == ShapeType.RECTANGLE:
                x0, y0, x1, y1 = anno_points
                anno = datumaro.Bbox(x0, y0, x1 - x0, y1 - y0,
                    label=anno_label, attributes=anno_attr, group=anno_group)
            else:
                raise Exception("Unknown shape type '%s'" % shape_obj.type)

            item_anno.append(anno)

        return item_anno


def match_frame(item, cvat_task_anno):
    is_video = cvat_task_anno.meta['task']['mode'] == 'interpolation'

    frame_number = None
    if frame_number is None:
        try:
            frame_number = cvat_task_anno.match_frame(item.id)
        except Exception:
            pass
    if frame_number is None and item.has_image:
        try:
            frame_number = cvat_task_anno.match_frame(item.image.filename)
        except Exception:
            pass
    if frame_number is None:
        try:
            frame_number = int(item.id)
        except Exception:
            pass
    if frame_number is None and is_video and item.id.startswith('frame_'):
        frame_number = int(item.id[len('frame_'):])
    if not frame_number in cvat_task_anno.frame_info:
        raise Exception("Could not match item id: '%s' with any task frame" %
                        item.id)
    return frame_number


def import_dm_annotations(dm_dataset, cvat_task_anno):
    shapes = {
        datumaro.AnnotationType.bbox: ShapeType.RECTANGLE,
        datumaro.AnnotationType.polygon: ShapeType.POLYGON,
        datumaro.AnnotationType.polyline: ShapeType.POLYLINE,
        datumaro.AnnotationType.points: ShapeType.POINTS,
    }

    label_cat = dm_dataset.categories()[datumaro.AnnotationType.label]

    for item in dm_dataset:
        frame_number = match_frame(item, cvat_task_anno)

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
                cvat_task_anno.add_shape(cvat_task_anno.LabeledShape(
                    type=shapes[ann.type],
                    frame=frame_number,
                    label=label_cat.items[ann.label].name,
                    points=ann.points,
                    occluded=ann.attributes.get('occluded') == True,
                    group=group_map.get(ann.group, 0),
                    attributes=[cvat_task_anno.Attribute(name=n, value=str(v))
                        for n, v in ann.attributes.items()],
                ))
            elif ann.type == datumaro.AnnotationType.label:
                cvat_task_anno.add_tag(cvat_task_anno.Tag(
                    frame=frame_number,
                    label=label_cat.items[ann.label].name,
                    group=group_map.get(ann.group, 0),
                    attributes=[cvat_task_anno.Attribute(name=n, value=str(v))
                        for n, v in ann.attributes.items()],
                ))
