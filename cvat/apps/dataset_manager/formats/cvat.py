# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
import zipfile
from collections import OrderedDict
from glob import glob
from tempfile import TemporaryDirectory

from cvat.apps.dataset_manager.bindings import match_dm_item
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.frame_provider import FrameProvider
from datumaro.components.extractor import DatasetItem
from datumaro.util.image import save_image

from .registry import exporter, importer


def pairwise(iterable):
    a = iter(iterable)
    return zip(a, a)

def create_xml_dumper(file_object):
    from xml.sax.saxutils import XMLGenerator
    class XmlAnnotationWriter:
        def __init__(self, file):
            self.version = "1.1"
            self.file = file
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
                elif isinstance(v, list):
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

        def open_cuboid(self, cuboid):
            self._indent()
            self.xmlgen.startElement("cuboid", cuboid)
            self._level += 1

        def open_tag(self, tag):
            self._indent()
            self.xmlgen.startElement("tag", tag)
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

        def close_cuboid(self):
            self._level -= 1
            self._indent()
            self.xmlgen.endElement("cuboid")

        def close_tag(self):
            self._level -= 1
            self._indent()
            self.xmlgen.endElement("tag")

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

    return XmlAnnotationWriter(file_object)

def dump_as_cvat_annotation(file_object, annotations):
    dumper = create_xml_dumper(file_object)
    dumper.open_root()
    dumper.add_meta(annotations.meta)

    for frame_annotation in annotations.group_by_frame(include_empty=True):
        frame_id = frame_annotation.frame
        dumper.open_image(OrderedDict([
            ("id", str(frame_id)),
            ("name", frame_annotation.name),
            ("width", str(frame_annotation.width)),
            ("height", str(frame_annotation.height))
        ]))

        for shape in frame_annotation.labeled_shapes:
            dump_data = OrderedDict([
                ("label", shape.label),
                ("occluded", str(int(shape.occluded))),
                ("source", shape.source),
            ])

            if shape.type == "rectangle":
                dump_data.update(OrderedDict([
                    ("xtl", "{:.2f}".format(shape.points[0])),
                    ("ytl", "{:.2f}".format(shape.points[1])),
                    ("xbr", "{:.2f}".format(shape.points[2])),
                    ("ybr", "{:.2f}".format(shape.points[3]))
                ]))
            elif shape.type == "cuboid":
                dump_data.update(OrderedDict([
                    ("xtl1", "{:.2f}".format(shape.points[0])),
                    ("ytl1", "{:.2f}".format(shape.points[1])),
                    ("xbl1", "{:.2f}".format(shape.points[2])),
                    ("ybl1", "{:.2f}".format(shape.points[3])),
                    ("xtr1", "{:.2f}".format(shape.points[4])),
                    ("ytr1", "{:.2f}".format(shape.points[5])),
                    ("xbr1", "{:.2f}".format(shape.points[6])),
                    ("ybr1", "{:.2f}".format(shape.points[7])),
                    ("xtl2", "{:.2f}".format(shape.points[8])),
                    ("ytl2", "{:.2f}".format(shape.points[9])),
                    ("xbl2", "{:.2f}".format(shape.points[10])),
                    ("ybl2", "{:.2f}".format(shape.points[11])),
                    ("xtr2", "{:.2f}".format(shape.points[12])),
                    ("ytr2", "{:.2f}".format(shape.points[13])),
                    ("xbr2", "{:.2f}".format(shape.points[14])),
                    ("ybr2", "{:.2f}".format(shape.points[15]))
                ]))
            else:
                dump_data.update(OrderedDict([
                    ("points", ';'.join((
                        ','.join((
                            "{:.2f}".format(x),
                            "{:.2f}".format(y)
                        )) for x, y in pairwise(shape.points))
                    )),
                ]))

            if annotations.meta["task"]["z_order"] != "False":
                dump_data['z_order'] = str(shape.z_order)
            if shape.group:
                dump_data['group_id'] = str(shape.group)


            if shape.type == "rectangle":
                dumper.open_box(dump_data)
            elif shape.type == "polygon":
                dumper.open_polygon(dump_data)
            elif shape.type == "polyline":
                dumper.open_polyline(dump_data)
            elif shape.type == "points":
                dumper.open_points(dump_data)
            elif shape.type == "cuboid":
                dumper.open_cuboid(dump_data)
            else:
                raise NotImplementedError("unknown shape type")

            for attr in shape.attributes:
                dumper.add_attribute(OrderedDict([
                    ("name", attr.name),
                    ("value", attr.value)
                ]))

            if shape.type == "rectangle":
                dumper.close_box()
            elif shape.type == "polygon":
                dumper.close_polygon()
            elif shape.type == "polyline":
                dumper.close_polyline()
            elif shape.type == "points":
                dumper.close_points()
            elif shape.type == "cuboid":
                dumper.close_cuboid()
            else:
                raise NotImplementedError("unknown shape type")

        for tag in frame_annotation.tags:
            tag_data = OrderedDict([
                ("label", tag.label),
                ("source", tag.source),
            ])
            if tag.group:
                tag_data["group_id"] = str(tag.group)
            dumper.open_tag(tag_data)

            for attr in tag.attributes:
                dumper.add_attribute(OrderedDict([
                    ("name", attr.name),
                    ("value", attr.value)
                ]))

            dumper.close_tag()

        dumper.close_image()
    dumper.close_root()

def dump_as_cvat_interpolation(file_object, annotations):
    dumper = create_xml_dumper(file_object)
    dumper.open_root()
    dumper.add_meta(annotations.meta)
    def dump_track(idx, track):
        track_id = idx
        dump_data = OrderedDict([
            ("id", str(track_id)),
            ("label", track.label),
            ("source", track.source),
        ])

        if track.group:
            dump_data['group_id'] = str(track.group)
        dumper.open_track(dump_data)

        for shape in track.shapes:
            dump_data = OrderedDict([
                ("frame", str(shape.frame)),
                ("outside", str(int(shape.outside))),
                ("occluded", str(int(shape.occluded))),
                ("keyframe", str(int(shape.keyframe))),
            ])

            if shape.type == "rectangle":
                dump_data.update(OrderedDict([
                    ("xtl", "{:.2f}".format(shape.points[0])),
                    ("ytl", "{:.2f}".format(shape.points[1])),
                    ("xbr", "{:.2f}".format(shape.points[2])),
                    ("ybr", "{:.2f}".format(shape.points[3])),
                ]))
            elif shape.type == "cuboid":
                dump_data.update(OrderedDict([
                    ("xtl1", "{:.2f}".format(shape.points[0])),
                    ("ytl1", "{:.2f}".format(shape.points[1])),
                    ("xbl1", "{:.2f}".format(shape.points[2])),
                    ("ybl1", "{:.2f}".format(shape.points[3])),
                    ("xtr1", "{:.2f}".format(shape.points[4])),
                    ("ytr1", "{:.2f}".format(shape.points[5])),
                    ("xbr1", "{:.2f}".format(shape.points[6])),
                    ("ybr1", "{:.2f}".format(shape.points[7])),
                    ("xtl2", "{:.2f}".format(shape.points[8])),
                    ("ytl2", "{:.2f}".format(shape.points[9])),
                    ("xbl2", "{:.2f}".format(shape.points[10])),
                    ("ybl2", "{:.2f}".format(shape.points[11])),
                    ("xtr2", "{:.2f}".format(shape.points[12])),
                    ("ytr2", "{:.2f}".format(shape.points[13])),
                    ("xbr2", "{:.2f}".format(shape.points[14])),
                    ("ybr2", "{:.2f}".format(shape.points[15]))
                ]))
            else:
                dump_data.update(OrderedDict([
                    ("points", ';'.join(['{:.2f},{:.2f}'.format(x, y)
                        for x,y in pairwise(shape.points)]))
                ]))

            if annotations.meta["task"]["z_order"] != "False":
                dump_data["z_order"] = str(shape.z_order)

            if shape.type == "rectangle":
                dumper.open_box(dump_data)
            elif shape.type == "polygon":
                dumper.open_polygon(dump_data)
            elif shape.type == "polyline":
                dumper.open_polyline(dump_data)
            elif shape.type == "points":
                dumper.open_points(dump_data)
            elif shape.type == "cuboid":
                dumper.open_cuboid(dump_data)
            else:
                raise NotImplementedError("unknown shape type")

            for attr in shape.attributes:
                dumper.add_attribute(OrderedDict([
                    ("name", attr.name),
                    ("value", attr.value)
                ]))

            if shape.type == "rectangle":
                dumper.close_box()
            elif shape.type == "polygon":
                dumper.close_polygon()
            elif shape.type == "polyline":
                dumper.close_polyline()
            elif shape.type == "points":
                dumper.close_points()
            elif shape.type == "cuboid":
                dumper.close_cuboid()
            else:
                raise NotImplementedError("unknown shape type")
        dumper.close_track()

    counter = 0
    for track in annotations.tracks:
        dump_track(counter, track)
        counter += 1

    for shape in annotations.shapes:
        dump_track(counter, annotations.Track(
            label=shape.label,
            group=shape.group,
            source=shape.source,
            shapes=[annotations.TrackedShape(
                type=shape.type,
                points=shape.points,
                occluded=shape.occluded,
                outside=False,
                keyframe=True,
                z_order=shape.z_order,
                frame=shape.frame,
                attributes=shape.attributes,
            )] +
            ( # add a finishing frame if it does not hop over the last frame
            [annotations.TrackedShape(
                type=shape.type,
                points=shape.points,
                occluded=shape.occluded,
                outside=True,
                keyframe=True,
                z_order=shape.z_order,
                frame=shape.frame + annotations.frame_step,
                attributes=shape.attributes,
            )] if shape.frame + annotations.frame_step < \
                    int(annotations.meta['task']['stop_frame']) \
               else []
            ),
        ))
        counter += 1

    dumper.close_root()

def load(file_object, annotations):
    from defusedxml import ElementTree
    context = ElementTree.iterparse(file_object, events=("start", "end"))
    context = iter(context)
    ev, _ = next(context)

    supported_shapes = ('box', 'polygon', 'polyline', 'points', 'cuboid')

    track = None
    shape = None
    tag = None
    image_is_opened = False
    attributes = None
    for ev, el in context:
        if ev == 'start':
            if el.tag == 'track':
                track = annotations.Track(
                    label=el.attrib['label'],
                    group=int(el.attrib.get('group_id', 0)),
                    source=el.attrib.get('source', 'manual'),
                    shapes=[],
                )
            elif el.tag == 'image':
                image_is_opened = True
                frame_id = annotations.abs_frame_id(match_dm_item(
                    DatasetItem(id=el.attrib['id'], image=el.attrib['name']),
                    annotations))
            elif el.tag in supported_shapes and (track is not None or image_is_opened):
                attributes = []
                shape = {
                    'attributes': attributes,
                    'points': [],
                }
            elif el.tag == 'tag' and image_is_opened:
                attributes = []
                tag = {
                    'frame': frame_id,
                    'label': el.attrib['label'],
                    'group': int(el.attrib.get('group_id', 0)),
                    'attributes': attributes,
                    'source': str(el.attrib.get('source', 'manual'))
                }
        elif ev == 'end':
            if el.tag == 'attribute' and attributes is not None:
                attributes.append(annotations.Attribute(
                    name=el.attrib['name'],
                    value=el.text or "",
                ))
            if el.tag in supported_shapes:
                if track is not None:
                    shape['frame'] = el.attrib['frame']
                    shape['outside'] = el.attrib['outside'] == "1"
                    shape['keyframe'] = el.attrib['keyframe'] == "1"
                else:
                    shape['frame'] = frame_id
                    shape['label'] = el.attrib['label']
                    shape['group'] = int(el.attrib.get('group_id', 0))
                    shape['source'] = str(el.attrib.get('source', 'manual'))

                shape['type'] = 'rectangle' if el.tag == 'box' else el.tag
                shape['occluded'] = el.attrib['occluded'] == '1'
                shape['z_order'] = int(el.attrib.get('z_order', 0))

                if el.tag == 'box':
                    shape['points'].append(el.attrib['xtl'])
                    shape['points'].append(el.attrib['ytl'])
                    shape['points'].append(el.attrib['xbr'])
                    shape['points'].append(el.attrib['ybr'])
                elif el.tag == 'cuboid':
                    shape['points'].append(el.attrib['xtl1'])
                    shape['points'].append(el.attrib['ytl1'])
                    shape['points'].append(el.attrib['xbl1'])
                    shape['points'].append(el.attrib['ybl1'])
                    shape['points'].append(el.attrib['xtr1'])
                    shape['points'].append(el.attrib['ytr1'])
                    shape['points'].append(el.attrib['xbr1'])
                    shape['points'].append(el.attrib['ybr1'])

                    shape['points'].append(el.attrib['xtl2'])
                    shape['points'].append(el.attrib['ytl2'])
                    shape['points'].append(el.attrib['xbl2'])
                    shape['points'].append(el.attrib['ybl2'])
                    shape['points'].append(el.attrib['xtr2'])
                    shape['points'].append(el.attrib['ytr2'])
                    shape['points'].append(el.attrib['xbr2'])
                    shape['points'].append(el.attrib['ybr2'])
                else:
                    for pair in el.attrib['points'].split(';'):
                        shape['points'].extend(map(float, pair.split(',')))

                if track is not None:
                    if shape["keyframe"]:
                        track.shapes.append(annotations.TrackedShape(**shape))
                else:
                    annotations.add_shape(annotations.LabeledShape(**shape))
                shape = None

            elif el.tag == 'track':
                annotations.add_track(track)
                track = None
            elif el.tag == 'image':
                image_is_opened = False
            elif el.tag == 'tag':
                annotations.add_tag(annotations.Tag(**tag))
                tag = None
            el.clear()

def _export(dst_file, task_data, anno_callback, save_images=False):
    with TemporaryDirectory() as temp_dir:
        with open(osp.join(temp_dir, 'annotations.xml'), 'wb') as f:
            anno_callback(f, task_data)

        if save_images:
            img_dir = osp.join(temp_dir, 'images')
            frame_provider = FrameProvider(task_data.db_task.data)
            frames = frame_provider.get_frames(
                frame_provider.Quality.ORIGINAL,
                frame_provider.Type.BUFFER)
            for frame_id, (frame_data, _) in enumerate(frames):
                frame_name = task_data.frame_info[frame_id]['path']
                ext = ''
                if not '.' in osp.basename(frame_name):
                    ext = '.png'
                img_path = osp.join(img_dir, frame_name + ext)
                os.makedirs(osp.dirname(img_path), exist_ok=True)
                with open(img_path, 'wb') as f:
                    f.write(frame_data.getvalue())

        make_zip_archive(temp_dir, dst_file)

@exporter(name='CVAT for video', ext='ZIP', version='1.1')
def _export_video(dst_file, task_data, save_images=False):
    _export(dst_file, task_data,
        anno_callback=dump_as_cvat_interpolation, save_images=save_images)

@exporter(name='CVAT for images', ext='ZIP', version='1.1')
def _export_images(dst_file, task_data, save_images=False):
    _export(dst_file, task_data,
        anno_callback=dump_as_cvat_annotation, save_images=save_images)

@importer(name='CVAT', ext='XML, ZIP', version='1.1')
def _import(src_file, task_data):
    is_zip = zipfile.is_zipfile(src_file)
    src_file.seek(0)
    if is_zip:
        with TemporaryDirectory() as tmp_dir:
            zipfile.ZipFile(src_file).extractall(tmp_dir)

            anno_paths = glob(osp.join(tmp_dir, '**', '*.xml'), recursive=True)
            for p in anno_paths:
                load(p, task_data)
    else:
        load(src_file, task_data)
