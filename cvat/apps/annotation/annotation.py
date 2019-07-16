# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import copy
from collections import OrderedDict

from django.utils import timezone

from cvat.apps.engine.data_manager import DataManager
from . import serializers

class AnnotationIR:
    def __init__(self):
        self.reset()

    def add_tag(self, tag):
        raise NotImplementedError

    def add_shape(self, shape):
        serializer = serializers.LabeledShapeSerializer(data=shape, many=False)
        if serializer.is_valid(raise_exception=True):
            self._shapes.append(serializer.data)

    def add_track(self, track):
        serializer = serializers.LabeledTrackSerializer(data=track, many=False)
        if serializer.is_valid(raise_exception=True):
            self._tracks.append(serializer.data)

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
        if key == 'tags':
            return self.tags
        elif key == 'shapes':
            return self.shapes
        elif key == 'tracks':
            return self.tracks
        raise KeyError('annotation IR has no \'{}\' key'.format(key))

    @property
    def data(self):
        return {
            'version': self.version,
            'tags': self.tags,
            'shapes': self.shapes,
            'tracks': self.tracks,
        }

    #makes a data copy from specified frame interval
    def slice(self, start, stop):
        is_frame_inside = lambda x: (start <= int(x['frame']) <= stop)
        splitted_data = AnnotationIR()
        splitted_data.tags = copy.deepcopy(list(filter(is_frame_inside, self.tags)))
        splitted_data.shapes = copy.deepcopy(list(filter(is_frame_inside, self.shapes)))
        splitted_data.tracks = copy.deepcopy(list(filter(lambda y: len(list(filter(is_frame_inside, y['shapes']))), self.tracks)))

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
            self._frame_info = {db_image.frame: {
                "path": db_image.path,
                "width": db_image.width,
                "height": db_image.height,
            } for db_image in self._db_task.image_set.all()}

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

    @property
    def shapes(self):
        if self._frame_info == None or self._meta == None or self._label_mapping == None or self._attribute_mapping == None:
            raise Exception("Annotation exporter is not initialized properly")

        annotations = {}
        data_manager = DataManager(self._annotation_ir)
        for shape in data_manager.to_shapes(int(self._db_task.size)):
            frame = self._db_task.start_frame + shape["frame"] * self._db_task.get_frame_step()
            db_image = self._frame_info[frame]
            rpath = db_image['path'].split(os.path.sep)
            if len(rpath) != 1:
                rpath = os.path.sep.join(rpath[rpath.index(".upload")+1:])
            else:
                rpath = rpath[0]
            if frame not in annotations:
                annotations[frame] = {
                "frame": frame,
                "height": db_image["height"],
                "width": db_image["width"],
                "name": rpath,
                "shapes": [],
            }

            annotations[frame]["shapes"].append(self._export_shape(shape))
        return list(annotations.values())

    @property
    def meta(self):
        return self._meta

class AnnotationImporter:
    def __init__(self, db_task, annotation_IR):
        self._anno_ir = annotation_IR

        db_labels = db_task.label_set.all().prefetch_related('attributespec_set')
        self._label_mapping = {db_label.name: db_label.id for db_label in db_labels}

        self._attribute_mapping = {
            'mutable': {},
            'immutable': {},
        }
        for db_label in db_labels:
            for db_attribute in db_label.attributespec_set.all():
                if db_attribute.mutable:
                    self._attribute_mapping['mutable'][db_attribute.name] = db_attribute.id
                else:
                    self._attribute_mapping['immutable'][db_attribute.name] = db_attribute.id
        self._attribute_mapping_merged = {
            **self._attribute_mapping['mutable'],
            **self._attribute_mapping['immutable'],
            }

    def _process_tag(self, tag):
        raise NotImplementedError

    def _process_attribute(self, attribute):
        attribute['spec_id'] = self._attribute_mapping_merged[attribute.pop('name')]

    def _process_shape(self, shape):
        shape['label_id'] = self._label_mapping[shape.pop('label')]
        for attribute in shape['attributes']:
            self._process_attribute(attribute)
        return shape

    def _process_track(self, track):
        track['label_id'] = self._label_mapping[track.pop('label')]
        track['attributes'] = []
        for shape in track['shapes']:
            track['attributes'] = [attrib for attrib in shape['attributes'] if attrib['name'] in self._attribute_mapping['immutable']]
            shape['attributes'] = [attrib for attrib in shape['attributes'] if attrib['name'] in self._attribute_mapping['mutable']]
            for attribute in shape['attributes']:
                self._process_attribute(attribute)

        for attribute in track['attributes']:
            self._process_attribute(attribute)
        return track

    def add_tag(self, tag):
        raise NotImplementedError

    def add_shape(self, shape):
        self._anno_ir.add_shape(self._process_shape(shape))

    def add_track(self, track):
        self._anno_ir.add_track(self._process_track(track))

    @property
    def data(self):
        return self._anno_ir
