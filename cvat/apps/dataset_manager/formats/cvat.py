# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
import zipfile
from collections import OrderedDict
from glob import glob
from io import BufferedWriter
from typing import Callable, Union

from datumaro.components.annotation import (
    AnnotationType,
    Bbox,
    Label,
    LabelCategories,
    Points,
    Polygon,
    PolyLine,
    Skeleton,
)
from datumaro.components.dataset import Dataset, DatasetItem
from datumaro.components.dataset_base import DEFAULT_SUBSET_NAME, DatasetBase
from datumaro.components.importer import Importer
from datumaro.components.media import Image
from datumaro.plugins.data_formats.cvat.base import CvatImporter as _CvatImporter
from defusedxml import ElementTree

from cvat.apps.dataset_manager.bindings import (
    JobData,
    NoMediaInAnnotationFileError,
    ProjectData,
    TaskData,
    detect_dataset,
    get_defaulted_subset,
    import_dm_annotations,
    match_dm_item,
)
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.frame_provider import FrameOutputType, FrameQuality, make_frame_provider

from .registry import dm_env, exporter, importer


class CvatPath:
    IMAGES_DIR = "images"

    MEDIA_EXTS = (".jpg", ".jpeg", ".png")

    BUILTIN_ATTRS = {"occluded", "outside", "keyframe", "track_id"}


class CvatExtractor(DatasetBase):
    _SUPPORTED_SHAPES = ("box", "polygon", "polyline", "points", "skeleton")

    def __init__(self, path, subsets=None):
        assert osp.isfile(path), path
        rootpath = osp.dirname(path)
        images_dir = ""
        if osp.isdir(osp.join(rootpath, CvatPath.IMAGES_DIR)):
            images_dir = osp.join(rootpath, CvatPath.IMAGES_DIR)
        self._images_dir = images_dir
        self._path = path

        if not subsets:
            subsets = self._get_subsets_from_anno(path)
        self._subsets = subsets
        super().__init__(subsets=self._subsets)

        image_items = self._parse_images(images_dir, self._subsets)
        items, categories = self._parse(path)
        self._items = list(self._load_items(items, image_items).values())
        self._categories = categories

    def categories(self):
        return self._categories

    def __iter__(self):
        yield from self._items

    def __len__(self):
        return len(self._items)

    def get(self, _id, subset=DEFAULT_SUBSET_NAME):
        assert subset in self._subsets, "{} not in {}".format(subset, ", ".join(self._subsets))
        return super().get(_id, subset)

    @staticmethod
    def _get_subsets_from_anno(path):
        context = ElementTree.iterparse(path, events=("start", "end"))
        context = iter(context)

        for ev, el in context:
            if ev == "start":
                if el.tag == "subsets":
                    if el.text is not None:
                        subsets = el.text.split("\n")
                        return subsets
            if ev == "end":
                if el.tag == "meta":
                    return [DEFAULT_SUBSET_NAME]
                el.clear()
        return [DEFAULT_SUBSET_NAME]

    @staticmethod
    def _parse_images(image_dir, subsets):
        items = OrderedDict()

        def parse_image_dir(image_dir, subset):
            for file in sorted(glob(image_dir), key=osp.basename):
                name, ext = osp.splitext(osp.basename(file))
                if ext.lower() in CvatPath.MEDIA_EXTS:
                    items[(subset, name)] = DatasetItem(
                        id=name,
                        annotations=[],
                        media=Image(path=file),
                        subset=subset or DEFAULT_SUBSET_NAME,
                    )

        if subsets == [DEFAULT_SUBSET_NAME] and not osp.isdir(
            osp.join(image_dir, DEFAULT_SUBSET_NAME)
        ):
            parse_image_dir(osp.join(image_dir, "*.*"), None)
        else:
            for subset in subsets:
                parse_image_dir(osp.join(image_dir, subset, "*.*"), subset)
        return items

    @classmethod
    def _parse(cls, path):
        context = ElementTree.iterparse(path, events=("start", "end"))
        context = iter(context)

        categories, tasks_info, attribute_types = cls._parse_meta(context)

        items = OrderedDict()

        track = None
        track_shapes = None
        track_elements = None
        shape = None
        shape_element = None
        tag = None
        attributes = None
        element_attributes = None
        image = None
        subset = None
        for ev, el in context:
            if ev == "start":
                if el.tag == "track":
                    frame_size = (
                        tasks_info[int(el.attrib.get("task_id"))]["frame_size"]
                        if el.attrib.get("task_id")
                        else tuple(tasks_info.values())[0]["frame_size"]
                    )
                    track = {
                        "id": el.attrib["id"],
                        "label": el.attrib.get("label"),
                        "group": int(el.attrib.get("group_id", 0)),
                        "height": frame_size[0],
                        "width": frame_size[1],
                    }
                    subset = el.attrib.get("subset")
                    track_shapes = {}
                elif el.tag == "image":
                    image = {
                        "name": el.attrib.get("name"),
                        "frame": el.attrib["id"],
                        "width": el.attrib.get("width"),
                        "height": el.attrib.get("height"),
                    }
                    subset = el.attrib.get("subset")
                elif el.tag in cls._SUPPORTED_SHAPES and (track or image):
                    if shape and shape["type"] == "skeleton":
                        element_attributes = {}
                        shape_element = {
                            "type": "rectangle" if el.tag == "box" else el.tag,
                            "attributes": element_attributes,
                        }
                        if track:
                            shape_element.update(track)
                        else:
                            shape_element.update(image)
                    else:
                        attributes = {}
                        shape = {
                            "type": "rectangle" if el.tag == "box" else el.tag,
                            "attributes": attributes,
                        }
                        shape["elements"] = []
                        if track:
                            shape.update(track)
                            shape["track_id"] = int(track["id"])
                            shape["frame"] = el.attrib["frame"]
                            track_elements = []
                        if image:
                            shape.update(image)
                elif el.tag == "tag" and image:
                    attributes = {}
                    tag = {
                        "frame": image["frame"],
                        "attributes": attributes,
                        "group": int(el.attrib.get("group_id", 0)),
                        "label": el.attrib["label"],
                    }
                    subset = el.attrib.get("subset")
            elif ev == "end":
                if (
                    el.tag == "attribute"
                    and element_attributes is not None
                    and shape_element is not None
                ):
                    attr_value = el.text or ""
                    attr_type = attribute_types.get(el.attrib["name"])
                    if el.text in ["true", "false"]:
                        attr_value = attr_value == "true"
                    elif attr_type is not None and attr_type != "text":
                        try:
                            attr_value = float(attr_value)
                        except ValueError:
                            pass
                    element_attributes[el.attrib["name"]] = attr_value

                if el.tag == "attribute" and attributes is not None and shape_element is None:
                    attr_value = el.text or ""
                    attr_type = attribute_types.get(el.attrib["name"])
                    if el.text in ["true", "false"]:
                        attr_value = attr_value == "true"
                    elif attr_type is not None and attr_type != "text":
                        try:
                            attr_value = float(attr_value)
                        except ValueError:
                            pass
                    attributes[el.attrib["name"]] = attr_value

                elif (
                    el.tag in cls._SUPPORTED_SHAPES
                    and shape["type"] == "skeleton"
                    and el.tag != "skeleton"
                ):
                    shape_element["label"] = el.attrib.get("label")
                    shape_element["group"] = int(el.attrib.get("group_id", 0))

                    shape_element["type"] = el.tag
                    shape_element["z_order"] = int(el.attrib.get("z_order", 0))

                    if el.tag == "box":
                        shape_element["points"] = list(
                            map(
                                float,
                                [
                                    el.attrib["xtl"],
                                    el.attrib["ytl"],
                                    el.attrib["xbr"],
                                    el.attrib["ybr"],
                                ],
                            )
                        )
                    else:
                        shape_element["points"] = []
                        for pair in el.attrib["points"].split(";"):
                            shape_element["points"].extend(map(float, pair.split(",")))

                    if el.tag == "points" and el.attrib.get("occluded") == "1":
                        shape_element["visibility"] = [Points.Visibility.hidden] * (
                            len(shape_element["points"]) // 2
                        )
                    else:
                        shape_element["occluded"] = el.attrib.get("occluded") == "1"

                    if el.tag == "points" and el.attrib.get("outside") == "1":
                        shape_element["visibility"] = [Points.Visibility.absent] * (
                            len(shape_element["points"]) // 2
                        )
                    else:
                        shape_element["outside"] = el.attrib.get("outside") == "1"

                    if track:
                        shape_element["keyframe"] = el.attrib.get("keyframe") == "1"
                        if shape_element["keyframe"]:
                            track_elements.append(shape_element)
                    else:
                        shape["elements"].append(shape_element)
                    shape_element = None

                elif el.tag in cls._SUPPORTED_SHAPES:
                    if track is not None:
                        shape["frame"] = el.attrib["frame"]
                        shape["outside"] = el.attrib.get("outside") == "1"
                        shape["keyframe"] = el.attrib.get("keyframe") == "1"
                    if image is not None:
                        shape["label"] = el.attrib.get("label")
                        shape["group"] = int(el.attrib.get("group_id", 0))

                    shape["type"] = el.tag
                    shape["occluded"] = el.attrib.get("occluded") == "1"
                    shape["z_order"] = int(el.attrib.get("z_order", 0))
                    shape["rotation"] = float(el.attrib.get("rotation", 0))

                    if el.tag == "box":
                        shape["points"] = list(
                            map(
                                float,
                                [
                                    el.attrib["xtl"],
                                    el.attrib["ytl"],
                                    el.attrib["xbr"],
                                    el.attrib["ybr"],
                                ],
                            )
                        )
                    elif el.tag == "skeleton":
                        shape["points"] = []
                    else:
                        shape["points"] = []
                        for pair in el.attrib["points"].split(";"):
                            shape["points"].extend(map(float, pair.split(",")))

                    if track:
                        if shape["type"] == "skeleton" and track_elements:
                            shape["keyframe"] = True
                            track_shapes[shape["frame"]] = shape
                            track_shapes[shape["frame"]]["elements"] = track_elements
                            track_elements = None
                        elif shape["type"] != "skeleton":
                            track_shapes[shape["frame"]] = shape
                    else:
                        frame_desc = items.get((subset, shape["frame"]), {"annotations": []})
                        frame_desc["annotations"].append(cls._parse_shape_ann(shape, categories))
                        items[(subset, shape["frame"])] = frame_desc

                    shape = None

                elif el.tag == "tag":
                    frame_desc = items.get((subset, tag["frame"]), {"annotations": []})
                    frame_desc["annotations"].append(cls._parse_tag_ann(tag, categories))
                    items[(subset, tag["frame"])] = frame_desc
                    tag = None
                elif el.tag == "track":
                    for track_shape in track_shapes.values():
                        frame_desc = items.get((subset, track_shape["frame"]), {"annotations": []})
                        frame_desc["annotations"].append(
                            cls._parse_shape_ann(track_shape, categories)
                        )
                        items[(subset, track_shape["frame"])] = frame_desc
                    track = None
                elif el.tag == "image":
                    frame_desc = items.get((subset, image["frame"]), {"annotations": []})
                    frame_desc.update(
                        {
                            "name": image.get("name"),
                            "height": image.get("height"),
                            "width": image.get("width"),
                            "subset": subset,
                        }
                    )
                    items[(subset, image["frame"])] = frame_desc
                    image = None
                el.clear()

        return items, categories

    @staticmethod
    def _parse_meta(context):
        ev, el = next(context)
        if not (ev == "start" and el.tag == "annotations"):
            raise Exception("Unexpected token ")

        categories = {}

        tasks_info = {}
        frame_size = [None, None]
        task_id = None
        mode = None
        labels = OrderedDict()
        label = None

        # Recursive descent parser
        el = None
        states = ["annotations"]

        def accepted(expected_state, tag, next_state=None):
            state = states[-1]
            if state == expected_state and el is not None and el.tag == tag:
                if not next_state:
                    next_state = tag
                states.append(next_state)
                return True
            return False

        def consumed(expected_state, tag):
            state = states[-1]
            if state == expected_state and el is not None and el.tag == tag:
                states.pop()
                return True
            return False

        for ev, el in context:
            if ev == "start":
                if accepted("annotations", "meta"):
                    pass
                elif accepted("meta", "task"):
                    pass
                elif accepted("meta", "project"):
                    pass
                elif accepted("project", "tasks"):
                    pass
                elif accepted("tasks", "task"):
                    pass
                elif accepted("task", "id", next_state="task_id"):
                    pass
                elif accepted("task", "segment"):
                    pass
                elif accepted("task", "mode"):
                    pass
                elif accepted("task", "original_size"):
                    pass
                elif accepted("original_size", "height", next_state="frame_height"):
                    pass
                elif accepted("original_size", "width", next_state="frame_width"):
                    pass
                elif accepted("task", "labels"):
                    pass
                elif accepted("project", "labels"):
                    pass
                elif accepted("labels", "label"):
                    label = {"name": None, "attributes": []}
                elif accepted("label", "name", next_state="label_name"):
                    pass
                elif accepted("label", "attributes"):
                    pass
                elif accepted("attributes", "attribute"):
                    pass
                elif accepted("attribute", "name", next_state="attr_name"):
                    pass
                elif accepted("attribute", "input_type", next_state="attr_type"):
                    pass
                elif (
                    accepted("annotations", "image")
                    or accepted("annotations", "track")
                    or accepted("annotations", "tag")
                ):
                    break
                else:
                    pass
            elif ev == "end":
                if consumed("meta", "meta"):
                    break
                elif consumed("project", "project"):
                    pass
                elif consumed("tasks", "tasks"):
                    pass
                elif consumed("task", "task"):
                    tasks_info[task_id] = {
                        "frame_size": frame_size,
                        "mode": mode,
                    }
                    frame_size = [None, None]
                    mode = None
                elif consumed("task_id", "id"):
                    task_id = int(el.text)
                elif consumed("segment", "segment"):
                    pass
                elif consumed("mode", "mode"):
                    mode = el.text
                elif consumed("original_size", "original_size"):
                    pass
                elif consumed("frame_height", "height"):
                    frame_size[0] = int(el.text)
                elif consumed("frame_width", "width"):
                    frame_size[1] = int(el.text)
                elif consumed("label_name", "name"):
                    label["name"] = el.text
                elif consumed("attr_name", "name"):
                    label["attributes"].append({"name": el.text})
                elif consumed("attr_type", "input_type"):
                    label["attributes"][-1]["input_type"] = el.text
                elif consumed("attribute", "attribute"):
                    pass
                elif consumed("attributes", "attributes"):
                    pass
                elif consumed("label", "label"):
                    labels[label["name"]] = label["attributes"]
                    label = None
                elif consumed("labels", "labels"):
                    pass
                else:
                    pass

        assert len(states) == 1 and states[0] == "annotations", (
            "Expected 'meta' section in the annotation file, path: %s" % states
        )

        common_attrs = ["occluded"]
        if "interpolation" in map(lambda t: t["mode"], tasks_info.values()):
            common_attrs.append("keyframe")
            common_attrs.append("outside")
            common_attrs.append("track_id")

        label_cat = LabelCategories(attributes=common_attrs)
        attribute_types = {}
        for label, attrs in labels.items():
            attr_names = {v["name"] for v in attrs}
            label_cat.add(label, attributes=attr_names)
            for attr in attrs:
                attribute_types[attr["name"]] = attr["input_type"]

        categories[AnnotationType.label] = label_cat
        return categories, tasks_info, attribute_types

    @classmethod
    def _parse_shape_ann(cls, ann, categories):
        ann_id = ann.get("id", 0)
        ann_type = ann["type"]

        attributes = ann.get("attributes") or {}
        if "occluded" in categories[AnnotationType.label].attributes:
            attributes["occluded"] = ann.get("occluded", False)
        if "outside" in ann:
            attributes["outside"] = ann["outside"]
        if "keyframe" in ann:
            attributes["keyframe"] = ann["keyframe"]
        if "track_id" in ann:
            attributes["track_id"] = ann["track_id"]
        if "rotation" in ann:
            attributes["rotation"] = ann["rotation"]

        group = ann.get("group")

        label = ann.get("label")
        label_id = categories[AnnotationType.label].find(label)[0]

        z_order = ann.get("z_order", 0)
        points = ann.get("points", [])

        if ann_type == "polyline":
            return PolyLine(
                points,
                label=label_id,
                z_order=z_order,
                id=ann_id,
                attributes=attributes,
                group=group,
            )

        elif ann_type == "polygon":
            return Polygon(
                points,
                label=label_id,
                z_order=z_order,
                id=ann_id,
                attributes=attributes,
                group=group,
            )

        elif ann_type == "points":
            visibility = ann.get("visibility", None)
            return Points(
                points,
                visibility,
                label=label_id,
                z_order=z_order,
                id=ann_id,
                attributes=attributes,
                group=group,
            )

        elif ann_type == "box":
            x, y = points[0], points[1]
            w, h = points[2] - x, points[3] - y
            return Bbox(
                x,
                y,
                w,
                h,
                label=label_id,
                z_order=z_order,
                id=ann_id,
                attributes=attributes,
                group=group,
            )

        elif ann_type == "skeleton":
            elements = []
            for element in ann.get("elements", []):
                elements.append(cls._parse_shape_ann(element, categories))

            return Skeleton(
                elements,
                label=label_id,
                z_order=z_order,
                id=ann_id,
                attributes=attributes,
                group=group,
            )

        else:
            raise NotImplementedError("Unknown annotation type '%s'" % ann_type)

    @classmethod
    def _parse_tag_ann(cls, ann, categories):
        label = ann.get("label")
        label_id = categories[AnnotationType.label].find(label)[0]
        group = ann.get("group")
        attributes = ann.get("attributes")
        return Label(label_id, attributes=attributes, group=group)

    def _load_items(self, parsed, image_items):
        for (subset, frame_id), item_desc in parsed.items():
            name = item_desc.get("name", "frame_%06d.PNG" % int(frame_id))
            image = (
                osp.join(self._images_dir, subset, name)
                if subset
                else osp.join(self._images_dir, name)
            )
            image_size = (item_desc.get("height"), item_desc.get("width"))
            if all(image_size):
                image = Image(path=image, size=tuple(map(int, image_size)))
            di = image_items.get(
                (subset, osp.splitext(name)[0]), DatasetItem(id=name, annotations=[])
            )
            di.subset = subset or DEFAULT_SUBSET_NAME
            di.annotations = item_desc.get("annotations")
            di.attributes = {"frame": int(frame_id)}
            di.media = image if isinstance(image, Image) else di.media
            image_items[(subset, osp.splitext(name)[0])] = di
        return image_items


dm_env.extractors.register("cvat", CvatExtractor)


class CvatImporter(Importer):
    @classmethod
    def find_sources(cls, path):
        return cls._find_sources_recursive(path, ".xml", "cvat")


dm_env.importers.register("cvat", CvatImporter)


def pairwise(iterable):
    a = iter(iterable)
    return zip(a, a)


def create_xml_dumper(file_object):
    from xml.sax.saxutils import XMLGenerator

    class XmlAnnotationWriter:
        def __init__(self, file):
            self.version = "1.1"
            self.file = file
            self.xmlgen = XMLGenerator(self.file, "utf-8")
            self._level = 0

        def _indent(self, newline=True):
            if newline:
                self.xmlgen.ignorableWhitespace("\n")
            self.xmlgen.ignorableWhitespace("  " * self._level)

        def _add_version(self):
            self._indent()
            self.xmlgen.startElement("version", {})
            self.xmlgen.characters(self.version)
            self.xmlgen.endElement("version")

        def open_document(self):
            self.xmlgen.startDocument()

        def open_root(self):
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

        def open_ellipse(self, ellipse):
            self._indent()
            self.xmlgen.startElement("ellipse", ellipse)
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

        def open_mask(self, points):
            self._indent()
            self.xmlgen.startElement("mask", points)
            self._level += 1

        def open_cuboid(self, cuboid):
            self._indent()
            self.xmlgen.startElement("cuboid", cuboid)
            self._level += 1

        def open_tag(self, tag):
            self._indent()
            self.xmlgen.startElement("tag", tag)
            self._level += 1

        def open_skeleton(self, skeleton):
            self._indent()
            self.xmlgen.startElement("skeleton", skeleton)
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

        def close_ellipse(self):
            self._level -= 1
            self._indent()
            self.xmlgen.endElement("ellipse")

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

        def close_mask(self):
            self._level -= 1
            self._indent()
            self.xmlgen.endElement("mask")

        def close_cuboid(self):
            self._level -= 1
            self._indent()
            self.xmlgen.endElement("cuboid")

        def close_tag(self):
            self._level -= 1
            self._indent()
            self.xmlgen.endElement("tag")

        def close_skeleton(self):
            self._level -= 1
            self._indent()
            self.xmlgen.endElement("skeleton")

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
            self._indent()

        def close_document(self):
            self.xmlgen.endDocument()

    return XmlAnnotationWriter(file_object)


def dump_as_cvat_annotation(dumper, annotations):
    dumper.open_root()
    dumper.add_meta(annotations.meta)

    for frame_annotation in annotations.group_by_frame(include_empty=True):
        frame_id = frame_annotation.frame
        image_attrs = OrderedDict([("id", str(frame_id)), ("name", frame_annotation.name)])
        if isinstance(annotations, ProjectData):
            image_attrs.update(
                OrderedDict(
                    [
                        ("subset", frame_annotation.subset),
                        ("task_id", str(frame_annotation.task_id)),
                    ]
                )
            )
        image_attrs.update(
            OrderedDict(
                [("width", str(frame_annotation.width)), ("height", str(frame_annotation.height))]
            )
        )
        dumper.open_image(image_attrs)

        def dump_labeled_shapes(shapes, is_skeleton=False):
            for shape in shapes:
                dump_data = OrderedDict([("label", shape.label), ("source", shape.source)])
                if is_skeleton:
                    dump_data.update(OrderedDict([("outside", str(int(shape.outside)))]))

                if shape.type != "skeleton":
                    dump_data.update(OrderedDict([("occluded", str(int(shape.occluded)))]))

                if shape.type == "rectangle":
                    dump_data.update(
                        OrderedDict(
                            [
                                ("xtl", "{:.2f}".format(shape.points[0])),
                                ("ytl", "{:.2f}".format(shape.points[1])),
                                ("xbr", "{:.2f}".format(shape.points[2])),
                                ("ybr", "{:.2f}".format(shape.points[3])),
                            ]
                        )
                    )

                    if shape.rotation:
                        dump_data.update(
                            OrderedDict([("rotation", "{:.2f}".format(shape.rotation))])
                        )
                elif shape.type == "ellipse":
                    dump_data.update(
                        OrderedDict(
                            [
                                ("cx", "{:.2f}".format(shape.points[0])),
                                ("cy", "{:.2f}".format(shape.points[1])),
                                ("rx", "{:.2f}".format(shape.points[2] - shape.points[0])),
                                ("ry", "{:.2f}".format(shape.points[1] - shape.points[3])),
                            ]
                        )
                    )

                    if shape.rotation:
                        dump_data.update(
                            OrderedDict([("rotation", "{:.2f}".format(shape.rotation))])
                        )
                elif shape.type == "cuboid":
                    dump_data.update(
                        OrderedDict(
                            [
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
                                ("ybr2", "{:.2f}".format(shape.points[15])),
                            ]
                        )
                    )
                elif shape.type == "mask":
                    dump_data.update(
                        OrderedDict(
                            [
                                ("rle", f"{list(int (v) for v in shape.points[:-4])}"[1:-1]),
                                ("left", f"{int(shape.points[-4])}"),
                                ("top", f"{int(shape.points[-3])}"),
                                ("width", f"{int(shape.points[-2] - shape.points[-4]) + 1}"),
                                ("height", f"{int(shape.points[-1] - shape.points[-3]) + 1}"),
                            ]
                        )
                    )
                elif shape.type != "skeleton":
                    dump_data.update(
                        OrderedDict(
                            [
                                (
                                    "points",
                                    ";".join(
                                        (
                                            ",".join(("{:.2f}".format(x), "{:.2f}".format(y)))
                                            for x, y in pairwise(shape.points)
                                        )
                                    ),
                                ),
                            ]
                        )
                    )

                if not is_skeleton:
                    dump_data["z_order"] = str(shape.z_order)
                if shape.group:
                    dump_data["group_id"] = str(shape.group)

                if shape.type == "rectangle":
                    dumper.open_box(dump_data)
                elif shape.type == "ellipse":
                    dumper.open_ellipse(dump_data)
                elif shape.type == "polygon":
                    dumper.open_polygon(dump_data)
                elif shape.type == "polyline":
                    dumper.open_polyline(dump_data)
                elif shape.type == "points":
                    dumper.open_points(dump_data)
                elif shape.type == "mask":
                    dumper.open_mask(dump_data)
                elif shape.type == "cuboid":
                    dumper.open_cuboid(dump_data)
                elif shape.type == "skeleton":
                    dumper.open_skeleton(dump_data)
                    dump_labeled_shapes(shape.elements, is_skeleton=True)
                else:
                    raise NotImplementedError("unknown shape type")

                for attr in shape.attributes:
                    dumper.add_attribute(OrderedDict([("name", attr.name), ("value", attr.value)]))

                if shape.type == "rectangle":
                    dumper.close_box()
                elif shape.type == "ellipse":
                    dumper.close_ellipse()
                elif shape.type == "polygon":
                    dumper.close_polygon()
                elif shape.type == "polyline":
                    dumper.close_polyline()
                elif shape.type == "points":
                    dumper.close_points()
                elif shape.type == "cuboid":
                    dumper.close_cuboid()
                elif shape.type == "mask":
                    dumper.close_mask()
                elif shape.type == "skeleton":
                    dumper.close_skeleton()
                else:
                    raise NotImplementedError("unknown shape type")

        dump_labeled_shapes(frame_annotation.labeled_shapes)

        for tag in frame_annotation.tags:
            tag_data = OrderedDict([("label", tag.label), ("source", tag.source)])
            if tag.group:
                tag_data["group_id"] = str(tag.group)
            dumper.open_tag(tag_data)

            for attr in tag.attributes:
                dumper.add_attribute(OrderedDict([("name", attr.name), ("value", attr.value)]))

            dumper.close_tag()

        dumper.close_image()
    dumper.close_root()


def dump_as_cvat_interpolation(dumper, annotations):
    dumper.open_root()
    dumper.add_meta(annotations.meta)

    def dump_shape(shape, element_shapes=None, label=None):
        dump_data = OrderedDict()
        if label is None:
            dump_data.update(OrderedDict([("frame", str(shape.frame))]))
        else:
            dump_data.update(OrderedDict([("label", label)]))
        dump_data.update(OrderedDict([("keyframe", str(int(shape.keyframe)))]))

        if shape.type != "skeleton":
            dump_data.update(
                OrderedDict(
                    [("outside", str(int(shape.outside))), ("occluded", str(int(shape.occluded)))]
                )
            )

        if shape.type == "rectangle":
            dump_data.update(
                OrderedDict(
                    [
                        ("xtl", "{:.2f}".format(shape.points[0])),
                        ("ytl", "{:.2f}".format(shape.points[1])),
                        ("xbr", "{:.2f}".format(shape.points[2])),
                        ("ybr", "{:.2f}".format(shape.points[3])),
                    ]
                )
            )

            if shape.rotation:
                dump_data.update(OrderedDict([("rotation", "{:.2f}".format(shape.rotation))]))
        elif shape.type == "ellipse":
            dump_data.update(
                OrderedDict(
                    [
                        ("cx", "{:.2f}".format(shape.points[0])),
                        ("cy", "{:.2f}".format(shape.points[1])),
                        ("rx", "{:.2f}".format(shape.points[2] - shape.points[0])),
                        ("ry", "{:.2f}".format(shape.points[1] - shape.points[3])),
                    ]
                )
            )

            if shape.rotation:
                dump_data.update(OrderedDict([("rotation", "{:.2f}".format(shape.rotation))]))
        elif shape.type == "mask":
            dump_data.update(
                OrderedDict(
                    [
                        ("rle", f"{list(int (v) for v in shape.points[:-4])}"[1:-1]),
                        ("left", f"{int(shape.points[-4])}"),
                        ("top", f"{int(shape.points[-3])}"),
                        ("width", f"{int(shape.points[-2] - shape.points[-4]) + 1}"),
                        ("height", f"{int(shape.points[-1] - shape.points[-3]) + 1}"),
                    ]
                )
            )
        elif shape.type == "cuboid":
            dump_data.update(
                OrderedDict(
                    [
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
                        ("ybr2", "{:.2f}".format(shape.points[15])),
                    ]
                )
            )
        elif shape.type != "skeleton":
            dump_data.update(
                OrderedDict(
                    [
                        (
                            "points",
                            ";".join(
                                ["{:.2f},{:.2f}".format(x, y) for x, y in pairwise(shape.points)]
                            ),
                        )
                    ]
                )
            )

        if label is None:
            dump_data["z_order"] = str(shape.z_order)

        if shape.type == "rectangle":
            dumper.open_box(dump_data)
        elif shape.type == "ellipse":
            dumper.open_ellipse(dump_data)
        elif shape.type == "polygon":
            dumper.open_polygon(dump_data)
        elif shape.type == "polyline":
            dumper.open_polyline(dump_data)
        elif shape.type == "points":
            dumper.open_points(dump_data)
        elif shape.type == "mask":
            dumper.open_mask(dump_data)
        elif shape.type == "cuboid":
            dumper.open_cuboid(dump_data)
        elif shape.type == "skeleton":
            if element_shapes and element_shapes.get(shape.frame):
                dumper.open_skeleton(dump_data)
                for element_shape, label in element_shapes.get(shape.frame, []):
                    dump_shape(element_shape, label=label)
        else:
            raise NotImplementedError("unknown shape type")

        if (
            shape.type == "skeleton"
            and element_shapes
            and element_shapes.get(shape.frame)
            or shape.type != "skeleton"
        ):
            for attr in shape.attributes:
                dumper.add_attribute(OrderedDict([("name", attr.name), ("value", attr.value)]))

        if shape.type == "rectangle":
            dumper.close_box()
        elif shape.type == "ellipse":
            dumper.close_ellipse()
        elif shape.type == "polygon":
            dumper.close_polygon()
        elif shape.type == "polyline":
            dumper.close_polyline()
        elif shape.type == "points":
            dumper.close_points()
        elif shape.type == "mask":
            dumper.close_mask()
        elif shape.type == "cuboid":
            dumper.close_cuboid()
        elif shape.type == "skeleton":
            if element_shapes and element_shapes.get(shape.frame):
                dumper.close_skeleton()
        else:
            raise NotImplementedError("unknown shape type")

    def dump_track(idx, track):
        track_id = idx
        dump_data = OrderedDict(
            [("id", str(track_id)), ("label", track.label), ("source", track.source)]
        )

        if hasattr(track, "task_id"):
            (task,) = filter(lambda task: task.id == track.task_id, annotations.tasks)
            dump_data.update(
                OrderedDict(
                    [
                        ("task_id", str(track.task_id)),
                        ("subset", get_defaulted_subset(task.subset, annotations.subsets)),
                    ]
                )
            )

        if track.group:
            dump_data["group_id"] = str(track.group)
        dumper.open_track(dump_data)

        element_shapes = {}
        for element_track in track.elements:
            for element_shape in element_track.shapes:
                if element_shape.frame not in element_shapes:
                    element_shapes[element_shape.frame] = []
                element_shapes[element_shape.frame].append((element_shape, element_track.label))

        for shape in track.shapes:
            dump_shape(shape, element_shapes)

        dumper.close_track()

    counter = 0
    for track in annotations.tracks:
        dump_track(counter, track)
        counter += 1

    for shape in annotations.shapes:
        frame_step = (
            annotations.frame_step
            if not isinstance(annotations, ProjectData)
            else annotations.frame_step[shape.task_id]
        )
        if not isinstance(annotations, ProjectData):
            stop_frame = int(annotations.meta[annotations.META_FIELD]["stop_frame"])
        else:
            task_meta = list(
                filter(
                    lambda task: int(task[1]["id"]) == shape.task_id,
                    annotations.meta[annotations.META_FIELD]["tasks"],
                )
            )[0][1]
            stop_frame = int(task_meta["stop_frame"])
        track = {
            "label": shape.label,
            "group": shape.group,
            "source": shape.source,
            "shapes": [
                annotations.TrackedShape(
                    type=shape.type,
                    points=shape.points,
                    rotation=shape.rotation,
                    occluded=shape.occluded,
                    outside=False,
                    keyframe=True,
                    z_order=shape.z_order,
                    frame=shape.frame,
                    attributes=shape.attributes,
                )
            ]
            + (  # add a finishing frame if it does not hop over the last frame
                [
                    annotations.TrackedShape(
                        type=shape.type,
                        points=shape.points,
                        rotation=shape.rotation,
                        occluded=shape.occluded,
                        outside=True,
                        keyframe=True,
                        z_order=shape.z_order,
                        frame=shape.frame + frame_step,
                        attributes=shape.attributes,
                    )
                ]
                if shape.frame + frame_step < stop_frame
                else []
            ),
            "elements": [
                annotations.Track(
                    label=element.label,
                    group=element.group,
                    source=element.source,
                    shapes=[
                        annotations.TrackedShape(
                            type=element.type,
                            points=element.points,
                            rotation=element.rotation,
                            occluded=element.occluded,
                            outside=element.outside,
                            keyframe=True,
                            z_order=element.z_order,
                            frame=element.frame,
                            attributes=element.attributes,
                        )
                    ]
                    + (  # add a finishing frame if it does not hop over the last frame
                        [
                            annotations.TrackedShape(
                                type=element.type,
                                points=element.points,
                                rotation=element.rotation,
                                occluded=element.occluded,
                                outside=True,
                                keyframe=True,
                                z_order=element.z_order,
                                frame=element.frame + frame_step,
                                attributes=element.attributes,
                            )
                        ]
                        if element.frame + frame_step < stop_frame
                        else []
                    ),
                    elements=[],
                )
                for element in shape.elements
            ],
        }
        if isinstance(annotations, ProjectData):
            track["task_id"] = shape.task_id
            for element in track["elements"]:
                element.task_id = shape.task_id
        dump_track(counter, annotations.Track(**track))
        counter += 1

    dumper.close_root()


def load_anno(file_object, annotations):
    supported_shapes = (
        "box",
        "ellipse",
        "polygon",
        "polyline",
        "points",
        "cuboid",
        "skeleton",
        "mask",
    )
    context = ElementTree.iterparse(file_object, events=("start", "end"))
    context = iter(context)
    next(context)

    track = None
    shape = None
    shape_element = None
    tag = None
    image_is_opened = False
    attributes = None
    elem_attributes = None
    track_elements = None
    for ev, el in context:
        if ev == "start":
            if el.tag == "track":
                track = annotations.Track(
                    label=el.attrib["label"],
                    group=int(el.attrib.get("group_id", 0)),
                    source="file",
                    shapes=[],
                    elements=[],
                )
            elif el.tag == "image":
                image_is_opened = True
                frame_id = annotations.abs_frame_id(
                    match_dm_item(
                        DatasetItem(
                            id=osp.splitext(el.attrib["name"])[0],
                            attributes={"frame": el.attrib["id"]},
                            media=Image(path=el.attrib["name"]),
                        ),
                        instance_data=annotations,
                    )
                )
            elif el.tag in supported_shapes and (track is not None or image_is_opened):
                if shape and shape["type"] == "skeleton":
                    elem_attributes = []
                    shape_element = {
                        "attributes": elem_attributes,
                        "points": [],
                        "type": "rectangle" if el.tag == "box" else el.tag,
                    }
                    if track is not None and el.attrib["label"] not in track_elements:
                        track_elements[el.attrib["label"]] = annotations.Track(
                            label=el.attrib["label"],
                            group=0,
                            source="file",
                            shapes=[],
                            elements=[],
                        )
                else:
                    attributes = []
                    shape = {
                        "attributes": attributes,
                        "points": [],
                        "type": "rectangle" if el.tag == "box" else el.tag,
                    }
                    if track is None:
                        shape["elements"] = []
                    elif shape["type"] == "skeleton":
                        shape["frame"] = el.attrib["frame"]
                        if track_elements is None:
                            track_elements = {}
            elif el.tag == "tag" and image_is_opened:
                attributes = []
                tag = {
                    "frame": frame_id,
                    "label": el.attrib["label"],
                    "group": int(el.attrib.get("group_id", 0)),
                    "attributes": attributes,
                    "source": "file",
                }
        elif ev == "end":
            if el.tag == "attribute" and elem_attributes is not None and shape_element is not None:
                elem_attributes.append(
                    annotations.Attribute(name=el.attrib["name"], value=el.text or "")
                )
            if el.tag == "attribute" and attributes is not None and shape_element is None:
                attributes.append(
                    annotations.Attribute(name=el.attrib["name"], value=el.text or "")
                )
            if el.tag in supported_shapes and shape["type"] == "skeleton" and el.tag != "skeleton":
                shape_element["label"] = el.attrib["label"]

                shape_element["occluded"] = el.attrib["occluded"] == "1"
                shape_element["outside"] = el.attrib["outside"] == "1"
                shape_element["elements"] = []

                if el.tag == "box":
                    shape_element["points"].append(float(el.attrib["xtl"]))
                    shape_element["points"].append(float(el.attrib["ytl"]))
                    shape_element["points"].append(float(el.attrib["xbr"]))
                    shape_element["points"].append(float(el.attrib["ybr"]))
                elif el.tag == "ellipse":
                    shape_element["points"].append(float(el.attrib["cx"]))
                    shape_element["points"].append(float(el.attrib["cy"]))
                    shape_element["points"].append(
                        float("{:.2f}".format(float(el.attrib["cx"]) + float(el.attrib["rx"])))
                    )
                    shape_element["points"].append(
                        float("{:.2f}".format(float(el.attrib["cy"]) - float(el.attrib["ry"])))
                    )
                elif el.tag == "cuboid":
                    shape_element["points"].append(float(el.attrib["xtl1"]))
                    shape_element["points"].append(float(el.attrib["ytl1"]))
                    shape_element["points"].append(float(el.attrib["xbl1"]))
                    shape_element["points"].append(float(el.attrib["ybl1"]))
                    shape_element["points"].append(float(el.attrib["xtr1"]))
                    shape_element["points"].append(float(el.attrib["ytr1"]))
                    shape_element["points"].append(float(el.attrib["xbr1"]))
                    shape_element["points"].append(float(el.attrib["ybr1"]))

                    shape_element["points"].append(float(el.attrib["xtl2"]))
                    shape_element["points"].append(float(el.attrib["ytl2"]))
                    shape_element["points"].append(float(el.attrib["xbl2"]))
                    shape_element["points"].append(float(el.attrib["ybl2"]))
                    shape_element["points"].append(float(el.attrib["xtr2"]))
                    shape_element["points"].append(float(el.attrib["ytr2"]))
                    shape_element["points"].append(float(el.attrib["xbr2"]))
                    shape_element["points"].append(float(el.attrib["ybr2"]))
                else:
                    for pair in el.attrib["points"].split(";"):
                        shape_element["points"].extend(map(float, pair.split(",")))

                if track is None:
                    shape_element["frame"] = frame_id
                    shape_element["source"] = "file"
                    shape["elements"].append(annotations.LabeledShape(**shape_element))
                else:
                    shape_element["frame"] = shape["frame"]
                    shape_element["keyframe"] = el.attrib["keyframe"] == "1"
                    if shape_element["keyframe"]:
                        track_elements[el.attrib["label"]].shapes.append(
                            annotations.TrackedShape(**shape_element)
                        )
                shape_element = None

            elif el.tag in supported_shapes:
                if track is not None:
                    shape["frame"] = el.attrib["frame"]
                    shape["outside"] = el.attrib.get("outside", "0") == "1"
                    shape["keyframe"] = el.attrib["keyframe"] == "1"
                else:
                    shape["frame"] = frame_id
                    shape["label"] = el.attrib["label"]
                    shape["group"] = int(el.attrib.get("group_id", 0))
                    shape["source"] = "file"
                    shape["outside"] = False

                shape["occluded"] = el.attrib.get("occluded", "0") == "1"
                shape["z_order"] = int(el.attrib.get("z_order", 0))
                shape["rotation"] = float(el.attrib.get("rotation", 0))

                if el.tag == "box":
                    shape["points"].append(float(el.attrib["xtl"]))
                    shape["points"].append(float(el.attrib["ytl"]))
                    shape["points"].append(float(el.attrib["xbr"]))
                    shape["points"].append(float(el.attrib["ybr"]))
                elif el.tag == "ellipse":
                    shape["points"].append(float(el.attrib["cx"]))
                    shape["points"].append(float(el.attrib["cy"]))
                    shape["points"].append(
                        float("{:.2f}".format(float(el.attrib["cx"]) + float(el.attrib["rx"])))
                    )
                    shape["points"].append(
                        float("{:.2f}".format(float(el.attrib["cy"]) - float(el.attrib["ry"])))
                    )
                elif el.tag == "mask":
                    shape["points"] = list(map(int, el.attrib["rle"].split(",")))
                    shape["points"].append(int(el.attrib["left"]))
                    shape["points"].append(int(el.attrib["top"]))
                    shape["points"].append(int(el.attrib["left"]) + int(el.attrib["width"]) - 1)
                    shape["points"].append(int(el.attrib["top"]) + int(el.attrib["height"]) - 1)
                elif el.tag == "cuboid":
                    shape["points"].append(float(el.attrib["xtl1"]))
                    shape["points"].append(float(el.attrib["ytl1"]))
                    shape["points"].append(float(el.attrib["xbl1"]))
                    shape["points"].append(float(el.attrib["ybl1"]))
                    shape["points"].append(float(el.attrib["xtr1"]))
                    shape["points"].append(float(el.attrib["ytr1"]))
                    shape["points"].append(float(el.attrib["xbr1"]))
                    shape["points"].append(float(el.attrib["ybr1"]))

                    shape["points"].append(float(el.attrib["xtl2"]))
                    shape["points"].append(float(el.attrib["ytl2"]))
                    shape["points"].append(float(el.attrib["xbl2"]))
                    shape["points"].append(float(el.attrib["ybl2"]))
                    shape["points"].append(float(el.attrib["xtr2"]))
                    shape["points"].append(float(el.attrib["ytr2"]))
                    shape["points"].append(float(el.attrib["xbr2"]))
                    shape["points"].append(float(el.attrib["ybr2"]))
                elif el.tag == "skeleton":
                    pass
                else:
                    for pair in el.attrib["points"].split(";"):
                        shape["points"].extend(map(float, pair.split(",")))

                if track is not None:
                    if shape["keyframe"]:
                        track.shapes.append(annotations.TrackedShape(**shape))
                else:
                    annotations.add_shape(annotations.LabeledShape(**shape))
                shape = None

            elif el.tag == "track":
                if track.shapes[0].type == "mask":
                    # convert mask tracks to shapes
                    # because mask track are not supported
                    annotations.add_shape(
                        annotations.LabeledShape(
                            **{
                                "attributes": track.shapes[0].attributes,
                                "points": track.shapes[0].points,
                                "type": track.shapes[0].type,
                                "occluded": track.shapes[0].occluded,
                                "frame": track.shapes[0].frame,
                                "source": track.shapes[0].source,
                                "rotation": track.shapes[0].rotation,
                                "z_order": track.shapes[0].z_order,
                                "group": track.shapes[0].group,
                                "label": track.label,
                            }
                        )
                    )
                else:
                    if track_elements is not None:
                        for element in track_elements.values():
                            track.elements.append(element)
                        track_elements = None
                    annotations.add_track(track)
                track = None
            elif el.tag == "image":
                image_is_opened = False
            elif el.tag == "tag":
                annotations.add_tag(annotations.Tag(**tag))
                tag = None
            el.clear()


def dump_task_or_job_anno(dst_file, instance_data, callback):
    dumper = create_xml_dumper(dst_file)
    dumper.open_document()
    callback(dumper, instance_data)
    dumper.close_document()


def dump_project_anno(dst_file: BufferedWriter, project_data: ProjectData, callback: Callable):
    dumper = create_xml_dumper(dst_file)
    dumper.open_document()
    callback(dumper, project_data)
    dumper.close_document()


def dump_media_files(
    instance_data: Union[TaskData, JobData], img_dir: str, project_data: ProjectData = None
):
    frame_provider = make_frame_provider(instance_data.db_instance)

    ext = ""
    if instance_data.meta[instance_data.META_FIELD]["mode"] == "interpolation":
        ext = frame_provider.VIDEO_FRAME_EXT

    frames = frame_provider.iterate_frames(
        start_frame=instance_data.start,
        stop_frame=instance_data.stop,
        quality=FrameQuality.ORIGINAL,
        out_type=FrameOutputType.BUFFER,
    )
    included_frames = instance_data.get_included_frames()

    for frame_id, frame in zip(instance_data.rel_range, frames):
        # exclude deleted frames and honeypots
        if frame_id not in included_frames:
            continue
        frame_name = (
            instance_data.frame_info[frame_id]["path"]
            if project_data is None
            else project_data.frame_info[(instance_data.db_instance.id, frame_id)]["path"]
        )
        img_path = osp.join(img_dir, frame_name + ext)
        os.makedirs(osp.dirname(img_path), exist_ok=True)
        with open(img_path, "wb") as f:
            f.write(frame.data.getvalue())


def _export_task_or_job(dst_file, temp_dir, instance_data, anno_callback, save_images=False):
    with open(osp.join(temp_dir, "annotations.xml"), "wb") as f:
        dump_task_or_job_anno(f, instance_data, anno_callback)

    if save_images:
        dump_media_files(instance_data, osp.join(temp_dir, "images"))

    make_zip_archive(temp_dir, dst_file)


def _export_project(
    dst_file: str,
    temp_dir: str,
    project_data: ProjectData,
    anno_callback: Callable,
    save_images: bool = False,
):
    with open(osp.join(temp_dir, "annotations.xml"), "wb") as f:
        dump_project_anno(f, project_data, anno_callback)

    if save_images:
        for task_data in project_data.task_data:
            subset = get_defaulted_subset(task_data.db_instance.subset, project_data.subsets)
            subset_dir = osp.join(temp_dir, "images", subset)
            os.makedirs(subset_dir, exist_ok=True)
            dump_media_files(task_data, subset_dir, project_data)

    make_zip_archive(temp_dir, dst_file)


@exporter(name="CVAT for video", ext="ZIP", version="1.1")
def _export_video(dst_file, temp_dir, instance_data, save_images=False):
    if isinstance(instance_data, ProjectData):
        _export_project(
            dst_file,
            temp_dir,
            instance_data,
            anno_callback=dump_as_cvat_interpolation,
            save_images=save_images,
        )
    else:
        _export_task_or_job(
            dst_file,
            temp_dir,
            instance_data,
            anno_callback=dump_as_cvat_interpolation,
            save_images=save_images,
        )


@exporter(name="CVAT for images", ext="ZIP", version="1.1")
def _export_images(dst_file, temp_dir, instance_data, save_images=False):
    if isinstance(instance_data, ProjectData):
        _export_project(
            dst_file,
            temp_dir,
            instance_data,
            anno_callback=dump_as_cvat_annotation,
            save_images=save_images,
        )
    else:
        _export_task_or_job(
            dst_file,
            temp_dir,
            instance_data,
            anno_callback=dump_as_cvat_annotation,
            save_images=save_images,
        )


@importer(name="CVAT", ext="XML, ZIP", version="1.1")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    is_zip = zipfile.is_zipfile(src_file)
    src_file.seek(0)
    if is_zip:
        zipfile.ZipFile(src_file).extractall(temp_dir)

        if isinstance(instance_data, ProjectData):
            detect_dataset(temp_dir, format_name="cvat", importer=_CvatImporter)
            dataset = Dataset.import_from(temp_dir, "cvat", env=dm_env)
            if load_data_callback is not None:
                load_data_callback(dataset, instance_data)
            import_dm_annotations(dataset, instance_data)
        else:
            anno_paths = glob(osp.join(temp_dir, "**", "*.xml"), recursive=True)
            for p in anno_paths:
                load_anno(p, instance_data)
    else:
        if load_data_callback:
            raise NoMediaInAnnotationFileError()

        load_anno(src_file, instance_data)
