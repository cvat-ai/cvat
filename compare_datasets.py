# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import itertools
import json
import os.path as osp
import sys
from collections import OrderedDict
from enum import Enum
from glob import glob
from typing import Any, Callable, Dict, List, Optional, cast

import datumaro as dm
import numpy as np
from attrs import asdict, define
from datumaro.components.annotation import (AnnotationType, Bbox, Label,
                                            LabelCategories, Points, Polygon,
                                            PolyLine, Skeleton)
from datumaro.components.dataset import DatasetItem
from datumaro.components.extractor import (DEFAULT_SUBSET_NAME, Extractor,
                                           Importer)
from datumaro.util.image import Image
from defusedxml import ElementTree


class CvatPath:
    IMAGES_DIR = "images"

    MEDIA_EXTS = (".jpg", ".jpeg", ".png")

    BUILTIN_ATTRS = {"occluded", "outside", "keyframe", "track_id"}


class CvatExtractor(Extractor):
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
        assert subset in self._subsets, "{} not in {}".format(
            subset, ", ".join(self._subsets)
        )
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
                        image=Image(path=file),
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

                if (
                    el.tag == "attribute"
                    and attributes is not None
                    and shape_element is None
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
                        frame_desc = items.get(
                            (subset, shape["frame"]), {"annotations": []}
                        )
                        frame_desc["annotations"].append(
                            cls._parse_shape_ann(shape, categories)
                        )
                        items[(subset, shape["frame"])] = frame_desc

                    shape = None

                elif el.tag == "tag":
                    frame_desc = items.get((subset, tag["frame"]), {"annotations": []})
                    frame_desc["annotations"].append(
                        cls._parse_tag_ann(tag, categories)
                    )
                    items[(subset, tag["frame"])] = frame_desc
                    tag = None
                elif el.tag == "track":
                    for track_shape in track_shapes.values():
                        frame_desc = items.get(
                            (subset, track_shape["frame"]), {"annotations": []}
                        )
                        frame_desc["annotations"].append(
                            cls._parse_shape_ann(track_shape, categories)
                        )
                        items[(subset, track_shape["frame"])] = frame_desc
                    track = None
                elif el.tag == "image":
                    frame_desc = items.get(
                        (subset, image["frame"]), {"annotations": []}
                    )
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
                    label = {"name": None, "attributes": [], "parent": None}
                elif accepted("label", "name", next_state="label_name"):
                    pass
                elif accepted("label", "attributes"):
                    pass
                elif accepted("label", "parent", next_state="label_parent"):
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
                    labels[label["name"]] = {
                        "attributes": label["attributes"],
                        "parent": label["parent"],
                    }
                    label = None
                elif consumed("label_parent", "parent"):
                    label["parent"] = el.text
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
        for label, params in labels.items():
            attrs = {v["name"]: v for v in params["attributes"]}
            parent = params["parent"]
            if parent and parent not in labels:
                raise ValueError(
                    f"Label's '{label}' parent label '{parent}' is not found"
                )

            label_cat.add(label, attributes=set(attrs), parent=parent)
            for attr_name, attr_params in attrs.items():
                attribute_types[attr_name] = attr_params["input_type"]

        categories[AnnotationType.label] = label_cat
        return categories, tasks_info, attribute_types

    @classmethod
    def _parse_shape_ann(cls, ann, categories, *, parent_label: str = None):
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
        label_id = categories[AnnotationType.label].find(
            label, parent=parent_label or ""
        )[0]
        if label_id is None:
            raise ValueError(
                f"Annotation id {ann_id} ({ann_type}): "
                f"unknown label {label} (parent {parent_label})"
            )

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
                elements.append(
                    cls._parse_shape_ann(
                        element, categories, parent_label=ann.get("label")
                    )
                )

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
                (subset, osp.splitext(name)[0]),
                DatasetItem(
                    id=name,
                    annotations=[],
                ),
            )
            di.subset = subset or DEFAULT_SUBSET_NAME
            di.annotations = item_desc.get("annotations")
            di.attributes = {"frame": int(frame_id)}
            di.media = image if isinstance(image, Image) else di.media
            image_items[(subset, osp.splitext(name)[0])] = di
        return image_items


dm_env = dm.Environment()
dm_env.extractors.register("cvat", CvatExtractor)


class CvatImporter(Importer):
    @classmethod
    def find_sources(cls, path):
        return cls._find_sources_recursive(path, ".xml", "cvat")


dm_env.importers.register("cvat", CvatImporter)


class AnnotationConflictType(str, Enum):
    MISSING_ANNOTATION = "missing_annotation"
    EXTRA_ANNOTATION = "extra_annotation"
    MISMATCHING_ANNOTATION = "mismatching_annotation"

    def __str__(self) -> str:
        return self.value


class MismatchingAnnotationKind(str, Enum):
    ATTRIBUTE = "attribute"
    LABEL = "label"

    def __str__(self) -> str:
        return self.value


@define(kw_only=True)
class AnnotationId:
    # TODO: think if uuids can be provided
    source: str
    id: int
    type: str

    def to_dict(self) -> dict:
        return asdict(self)


@define(kw_only=True)
class AnnotationConflict:
    frame_id: int
    type: AnnotationConflictType
    data: Dict[str, Any]

    def to_dict(self) -> dict:
        return asdict(self)


@define(kw_only=True)
class AnnotationConflictsReport:
    included_annotation_types: List[str]
    ignored_attributes: List[str]
    mean_accuracy: float
    mean_annotation_accuracy: float
    mean_attribute_accuracy: float
    error_count: int
    annotation_errors_count: int
    attribute_errors_count: int
    mean_error_count: float
    estimated_dataset_error_count: int
    estimated_dataset_invalid_annotations_count: int
    estimated_dataset_invalid_attributes_count: int
    ds_comparable_annotations_count: int
    ds_annotations_count: int
    ds_total_annotations_count: int
    ds_attributes_count: int
    intersection_gt_annotations_count: int
    intersection_frame_count: int
    intersection_frame_share: float
    intersection_frames: List[str]
    frame_results: Dict[str, Any]

    def to_dict(self) -> dict:
        return asdict(self)


def OKS(a, b, sigma=None, bbox=None, scale=None, visibility=None):
    """
    Object Keypoint Similarity metric.
    https://cocodataset.org/#keypoints-eval
    """

    p1 = np.array(a.points).reshape((-1, 2))
    p2 = np.array(b.points).reshape((-1, 2))
    if len(p1) != len(p2):
        return 0

    if visibility is None:
        visibility = np.ones(len(p1))
    else:
        visibility = np.asarray(visibility, dtype=float)

    if not sigma:
        sigma = 0.1
    else:
        assert len(sigma) == len(p1)

    if not scale:
        if bbox is None:
            bbox = dm.ops.mean_bbox([a, b])
        scale = bbox[2] * bbox[3]

    dists = np.linalg.norm(p1 - p2, axis=1)
    return np.sum(
        visibility * np.exp(-(dists**2) / (2 * scale * (2 * sigma) ** 2))
    ) / np.sum(visibility)


@define(kw_only=True)
class _PointsMatcher(dm.ops.PointsMatcher):
    def distance(self, a, b):
        a_bbox = self.instance_map[id(a)][1]
        b_bbox = self.instance_map[id(b)][1]
        if dm.ops.bbox_iou(a_bbox, b_bbox) <= 0:
            return 0
        bbox = dm.ops.mean_bbox([a_bbox, b_bbox])
        return OKS(
            a,
            b,
            sigma=self.sigma,
            bbox=bbox,
            visibility=[v == dm.Points.Visibility.visible for v in a.visibility],
        )


class _DistanceComparator(dm.ops.DistanceComparator):
    def __init__(
        self,
        categories: dm.CategoriesInfo,
        *,
        included_ann_types: Optional[List[dm.AnnotationType]] = None,
        return_distances: bool = False,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.categories = categories
        self._skeleton_info = {}
        self.included_ann_types = included_ann_types
        self.return_distances = return_distances

    def _match_ann_type(self, t, *args):
        if t not in self.included_ann_types:
            return None

        # pylint: disable=no-value-for-parameter
        if t == dm.AnnotationType.label:
            return self.match_labels(*args)
        elif t == dm.AnnotationType.bbox:
            return self.match_boxes(*args)
        elif t == dm.AnnotationType.polygon:
            return self.match_polygons(*args)
        elif t == dm.AnnotationType.mask:
            return self.match_masks(*args)
        elif t == dm.AnnotationType.points:
            return self.match_points(*args)
        elif t == dm.AnnotationType.skeleton:
            return self.match_skeletons(*args)
        elif t == dm.AnnotationType.polyline:
            return self.match_lines(*args)
        # pylint: enable=no-value-for-parameter
        else:
            return None

    def _match_segments(self, t, item_a, item_b, *,
        distance: Callable = dm.ops.segment_iou
    ):
        a_objs = self._get_ann_type(t, item_a)
        b_objs = self._get_ann_type(t, item_b)
        if not a_objs and not b_objs:
            return [], [], [], []

        if self.return_distances:
            distance, distances = self._make_memoizing_distance(distance)

        returned_values = dm.ops.match_segments(a_objs, b_objs,
            distance=distance, dist_thresh=self.iou_threshold)

        if self.return_distances:
            returned_values = returned_values + (distances, )

        return returned_values

    def match_boxes(self, item_a, item_b):
        return self._match_segments(AnnotationType.bbox, item_a, item_b)

    def match_polygons(self, item_a, item_b):
        return self._match_segments(AnnotationType.polygon, item_a, item_b)

    def match_masks(self, item_a, item_b):
        return self._match_segments(AnnotationType.mask, item_a, item_b)

    def match_lines(self, item_a, item_b):
        matcher = dm.ops.LineMatcher()
        return self._match_segments(AnnotationType.polyline, item_a, item_b,
            distance=matcher.distance)

    def match_points(self, item_a, item_b):
        a_points = self._get_ann_type(AnnotationType.points, item_a)
        b_points = self._get_ann_type(AnnotationType.points, item_b)
        if not a_points and not b_points:
            return [], [], [], []

        instance_map = {}
        for s in [item_a.annotations, item_b.annotations]:
            s_instances = dm.ops.find_instances(s)
            for inst in s_instances:
                inst_bbox = dm.ops.max_bbox(inst)
                for ann in inst:
                    instance_map[id(ann)] = [inst, inst_bbox]
        matcher = _PointsMatcher(instance_map=instance_map)

        distance = matcher.distance

        if self.return_distances:
            distance, distances = self._make_memoizing_distance(distance)

        returned_values = dm.ops.match_segments(
            a_points,
            b_points,
            dist_thresh=self.iou_threshold,
            distance=distance,
        )

        if self.return_distances:
            returned_values = returned_values + (distances, )

        return returned_values

    def _get_skeleton_info(self, skeleton_label_id: int):
        label_cat = cast(dm.LabelCategories, self.categories[dm.AnnotationType.label])
        skeleton_info = self._skeleton_info.get(skeleton_label_id)

        if skeleton_info is None:
            skeleton_label_name = label_cat[skeleton_label_id].name

            # Build a sorted list of sublabels to arrange skeleton points during comparison
            skeleton_info = sorted(
                idx
                for idx, label in enumerate(label_cat)
                if label.parent == skeleton_label_name
            )
            self._skeleton_info[skeleton_label_id] = skeleton_info

        return skeleton_info

    def match_skeletons(self, item_a, item_b):
        a_skeletons = self._get_ann_type(dm.AnnotationType.skeleton, item_a)
        b_skeletons = self._get_ann_type(dm.AnnotationType.skeleton, item_b)
        if not a_skeletons and not b_skeletons:
            return [], [], [], []

        # Convert skeletons to point lists for comparison
        # This is required to compute correct per-instance distance
        # It is assumed that labels are the same in the datasets
        skeleton_infos = {}
        points_map = {}
        skeleton_map = {}
        a_points = []
        b_points = []
        for source, source_points in [(a_skeletons, a_points), (b_skeletons, b_points)]:
            for skeleton in source:
                skeleton_info = skeleton_infos.setdefault(
                    skeleton.label, self._get_skeleton_info(skeleton.label)
                )

                # Merge skeleton points into a single list
                # The list is ordered by skeleton_info
                skeleton_points = [
                    next((p for p in skeleton.elements if p.label == sublabel), None)
                    for sublabel in skeleton_info
                ]

                # Build a single Points object for further comparisons
                merged_points = dm.Points(
                    points=list(
                        itertools.chain.from_iterable(
                            p.points if p else [0, 0] for p in skeleton_points
                        )
                    ),
                    visibility=list(
                        itertools.chain.from_iterable(
                            p.visibility if p else [dm.Points.Visibility.absent]
                            for p in skeleton_points
                        )
                    ),
                    label=skeleton.label
                    # no per-point attributes currently in CVAT
                )

                points_map[id(merged_points)] = skeleton
                skeleton_map[id(skeleton)] = merged_points
                source_points.append(merged_points)

        instance_map = {}
        for source in [item_a.annotations, item_b.annotations]:
            for instance_group in dm.ops.find_instances(source):
                instance_bbox = dm.ops.max_bbox(
                    a.get_bbox() if isinstance(a, dm.Skeleton) else a
                    for a in instance_group
                )

                instance_group = [
                    skeleton_map[id(a)] if isinstance(a, dm.Skeleton) else a
                    for a in instance_group
                ]
                for ann in instance_group:
                    instance_map[id(ann)] = [instance_group, instance_bbox]

        matcher = _PointsMatcher(instance_map=instance_map)

        distance = matcher.distance

        if self.return_distances:
            distance, distances = self._make_memoizing_distance(distance)

        matched, mismatched, a_extra, b_extra = dm.ops.match_segments(
            a_points,
            b_points,
            dist_thresh=self.iou_threshold,
            distance=distance,
        )

        matched = [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in matched]
        mismatched = [
            (points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in mismatched
        ]
        a_extra = [points_map[id(p_a)] for p_a in a_extra]
        b_extra = [points_map[id(p_b)] for p_b in b_extra]

        # Map points back to skeletons
        if self.return_distances:
            for (p_a_id, p_b_id) in list(distances.keys()):
                dist = distances.pop((p_a_id, p_b_id))
                distances[(
                    id(points_map[p_a_id]),
                    id(points_map[p_b_id])
                )] = dist

        returned_values = (matched, mismatched, a_extra, b_extra)

        if self.return_distances:
            returned_values = returned_values + (distances, )

        return returned_values

    @classmethod
    def _make_memoizing_distance(cls, distance_function):
        distances = {}
        notfound = object()

        def memoizing_distance(a, b):
            key = (id(a), id(b))
            dist = distances.get(key, notfound)

            if dist is notfound:
                dist = distance_function(a, b)
                distances[key] = dist

            return dist

        return memoizing_distance, distances


class _Comparator:
    def __init__(self, categories: dm.CategoriesInfo):
        self.ignored_attrs = [
            "track_id",  # changes from task to task, can't be defined manually with the same name
            "keyframe",  # indicates the way annotation obtained, meaningless to compare
            "z_order",  # TODO: compare relative or 'visible' z_order
            "group",  # TODO: changes from task to task. But must be compared for existence
        ]
        self.included_ann_types = [
            dm.AnnotationType.bbox,
            dm.AnnotationType.mask,
            dm.AnnotationType.points,
            dm.AnnotationType.polygon,
            dm.AnnotationType.polyline,
            dm.AnnotationType.skeleton,
        ]
        self._annotation_comparator = _DistanceComparator(
            categories, included_ann_types=self.included_ann_types, return_distances=True,
        )

    def match_attrs(self, ann_a: dm.Annotation, ann_b: dm.Annotation):
        a_attrs = ann_a.attributes
        b_attrs = ann_b.attributes

        keys_to_match = (a_attrs.keys() | b_attrs.keys()).difference(self.ignored_attrs)

        matches = []
        mismatches = []
        a_extra = []
        b_extra = []

        notfound = object()

        for k in keys_to_match:
            a_attr = a_attrs.get(k, notfound)
            b_attr = b_attrs.get(k, notfound)

            if a_attr is notfound:
                b_extra.append(k)
            elif b_attr is notfound:
                a_extra.append(k)
            elif a_attr == b_attr:
                matches.append(k)
            else:
                mismatches.append(k)

        return matches, mismatches, a_extra, b_extra

    def match_annotations(self, item_a, item_b):
        return self._annotation_comparator.match_annotations(item_a, item_b)


class DatasetComparator:
    def __init__(self, ds_dataset: dm.Dataset, gt_dataset: dm.Dataset) -> None:
        self._ds_dataset = ds_dataset
        self._gt_dataset = gt_dataset
        self._comparator = _Comparator(gt_dataset.categories())

        self._frame_results = {}
        self._common_results = {"ds_annotations_count": 0}

    def _dm_ann_to_ann_id(
        self, ann: dm.Annotation, item: dm.DatasetItem, dataset: dm.Dataset
    ):
        if dataset is self._ds_dataset:
            source = "ds"
        else:
            source = "gt"

        ann_idx = item.annotations.index(ann)

        return AnnotationId(source=source, id=ann_idx, type=ann.type.name)

    def _find_gt_conflicts(self) -> List[AnnotationConflict]:
        ds_job_dataset = self._ds_dataset
        gt_job_dataset = self._gt_dataset

        for gt_item in gt_job_dataset:
            ds_item = ds_job_dataset.get(gt_item.id)
            if not ds_item:
                continue  # we need to compare only intersecting frames

            self._process_frame(ds_item, gt_item)

    def _process_frame(self, ds_item, gt_item):
        frame_id = ds_item.id
        frame_results = self._comparator.match_annotations(gt_item, ds_item)
        self._frame_results.setdefault(frame_id, {})

        self._generate_frame_annotation_conflicts(
            frame_id, frame_results, ds_item, gt_item
        )

    def _generate_frame_annotation_conflicts(
        self,
        frame_id,
        frame_results,
        ds_item: dm.DatasetItem,
        gt_item: dm.DatasetItem,
    ) -> List[AnnotationConflict]:
        conflicts = []

        merged_results = [[], [], [], [], {}]
        for shape_type in self._comparator.included_ann_types:
            for merged_field, field in zip(merged_results, frame_results[shape_type][:-1]):
                merged_field.extend(field)

            merged_results[-1].update(frame_results[shape_type][-1])

        matches, mismatches, gt_unmatched, ds_unmatched, pairwise_distances = merged_results

        def _distance(gt_obj, ds_obj):
            return pairwise_distances.get((id(gt_obj), id(ds_obj)))

        _matched_shapes = set(
            id(shape)
            for shape_pair in itertools.chain(matches, mismatches)
            for shape in shape_pair
        )
        def _find_best_unmatched_distance(shape):
            this_shape_id = id(shape)

            this_shape_distances = []

            for (gt_shape_id, ds_shape_id), dist in pairwise_distances.items():
                if gt_shape_id == this_shape_id:
                    other_shape_id = ds_shape_id
                elif ds_shape_id == this_shape_id:
                    other_shape_id = gt_shape_id
                else:
                    continue

                this_shape_distances.append((other_shape_id, dist))

            matched_ann, distance = max(this_shape_distances, key=lambda v: v[1], default=(None, 0))
            return matched_ann, distance

        for unmatched_ann in gt_unmatched:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISSING_ANNOTATION,
                    data={
                        "annotation_ids": [
                            self._dm_ann_to_ann_id(
                                unmatched_ann, gt_item, self._gt_dataset
                            )
                        ]
                    },
                )
            )

        for unmatched_ann in ds_unmatched:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.EXTRA_ANNOTATION,
                    data={
                        "annotation_ids": [
                            self._dm_ann_to_ann_id(
                                unmatched_ann, ds_item, self._ds_dataset
                            )
                        ]
                    },
                )
            )

        for gt_ann, matched_ann_id in mismatches:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                    data={
                        "annotation_ids": [
                            self._dm_ann_to_ann_id(
                                matched_ann_id, ds_item, self._ds_dataset
                            ),
                            self._dm_ann_to_ann_id(gt_ann, gt_item, self._gt_dataset),
                        ],
                        "kind": MismatchingAnnotationKind.LABEL,
                        "expected": gt_ann.label,
                        "actual": matched_ann_id.label,
                    },
                )
            )

        resulting_distances = [
            _distance(gt_ann, ds_ann)
            for gt_ann, ds_ann in itertools.chain(matches, mismatches)
        ]

        for unmatched_ann in itertools.chain(gt_unmatched, ds_unmatched):
            matched_ann_id, distance = _find_best_unmatched_distance(unmatched_ann)
            if matched_ann_id is not None:
                _matched_shapes.add(matched_ann_id)
            resulting_distances.append(distance)

        mean_iou = np.mean(resulting_distances)

        valid_shapes_count = len(matches) + len(mismatches)
        missing_shapes_count = len(gt_unmatched)
        extra_shapes_count = len(ds_unmatched)
        total_shapes_count = len(matches) + len(mismatches) + len(gt_unmatched) + len(ds_unmatched)
        ds_shapes_count = len(matches) + len(mismatches) + len(ds_unmatched)
        gt_shapes_count = len(matches) + len(mismatches) + len(gt_unmatched)

        valid_labels_count = len(matches)
        invalid_labels_count = len(mismatches)
        total_labels_count = valid_labels_count + invalid_labels_count

        valid_attributes_count = 0
        invalid_attributes_count = 0
        missing_attributes_count = 0
        extra_attributes_count = 0
        total_attributes_count = 0
        ds_attributes_count = 0
        gt_attributes_count = 0
        for gt_ann, matched_ann_id in matches:
            # Datumaro wont match attributes
            (
                attr_matches,
                attr_mismatches,
                attr_gt_extra,
                attr_ds_extra,
            ) = self._comparator.match_attrs(gt_ann, matched_ann_id)

            for mismatched_attr in attr_mismatches:
                conflicts.append(
                    AnnotationConflict(
                        frame_id=frame_id,
                        type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                        data={
                            "annotation_ids": [
                                self._dm_ann_to_ann_id(
                                    matched_ann_id, ds_item, self._ds_dataset
                                ),
                                self._dm_ann_to_ann_id(
                                    gt_ann, gt_item, self._gt_dataset
                                ),
                            ],
                            "kind": MismatchingAnnotationKind.ATTRIBUTE,
                            "attribute": mismatched_attr,
                            "expected": gt_ann.attributes[mismatched_attr],
                            "actual": matched_ann_id.attributes[mismatched_attr],
                        },
                    )
                )

            for extra_attr in attr_gt_extra:
                conflicts.append(
                    AnnotationConflict(
                        frame_id=frame_id,
                        type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                        data={
                            "annotation_ids": [
                                self._dm_ann_to_ann_id(
                                    matched_ann_id, ds_item, self._ds_dataset
                                ),
                                self._dm_ann_to_ann_id(
                                    gt_ann, gt_item, self._gt_dataset
                                ),
                            ],
                            "kind": MismatchingAnnotationKind.ATTRIBUTE,
                            "attribute": mismatched_attr,
                            "expected": gt_ann.attributes[extra_attr],
                            "actual": None,
                        },
                    )
                )

            for extra_attr in attr_ds_extra:
                conflicts.append(
                    AnnotationConflict(
                        frame_id=frame_id,
                        type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                        data={
                            "annotation_ids": [
                                self._dm_ann_to_ann_id(
                                    matched_ann_id, ds_item, self._ds_dataset
                                ),
                                self._dm_ann_to_ann_id(
                                    gt_ann, gt_item, self._gt_dataset
                                ),
                            ],
                            "kind": MismatchingAnnotationKind.ATTRIBUTE,
                            "attribute": mismatched_attr,
                            "expected": None,
                            "actual": matched_ann_id.attributes[extra_attr],
                        },
                    )
                )

            valid_attributes_count += len(attr_matches)
            invalid_attributes_count += len(attr_mismatches)
            missing_attributes_count += len(attr_gt_extra)
            extra_attributes_count += len(attr_ds_extra)
            total_attributes_count += (
                len(attr_matches)
                + len(attr_mismatches)
                + len(attr_gt_extra)
                + len(attr_ds_extra)
            )
            ds_attributes_count += len(attr_matches) + len(attr_mismatches) + len(attr_ds_extra)
            gt_attributes_count += len(attr_matches) + len(attr_mismatches) + len(attr_gt_extra)

        self._frame_results.setdefault(frame_id, {}).update(
            {
                "annotation_kind": {
                    'shape': {
                        'valid_count': valid_shapes_count,
                        'missing_count': missing_shapes_count,
                        'extra_count': extra_shapes_count,
                        'total_count': total_shapes_count,
                        'ds_count': ds_shapes_count,
                        'gt_count': gt_shapes_count,
                        'mean_iou': mean_iou,
                        'accuracy': valid_shapes_count / (total_shapes_count or 1),
                    },
                    'label': {
                        'valid_count': valid_labels_count,
                        'invalid_count': invalid_labels_count,
                        'total_count': total_labels_count,
                        'accuracy': valid_labels_count / (total_labels_count or 1),
                    },
                    'attribute': {
                        'valid_count': valid_attributes_count,
                        'invalid_count': invalid_attributes_count,
                        'missing_count': missing_attributes_count,
                        'extra_count': extra_attributes_count,
                        'total_count': total_attributes_count,
                        'ds_count': ds_attributes_count,
                        'gt_count': gt_attributes_count,
                        'accuracy': valid_attributes_count / (total_attributes_count or 1),
                    },
                },
                "errors_count": len(
                    conflicts
                ),  # assuming no more than 1 error per annotation
                "errors": conflicts.copy(),
            }
        )

        return conflicts

    def prepare_report(self) -> AnnotationConflictsReport:
        self._find_gt_conflicts()

        def _get_nested_key(d, path):
            for k in path:
                d = d[k]
            return d

        def _set_nested_key(d, path, value):
            for k in path[:-1]:
                d = d.setdefault(k, {})
            d[path[-1]] = value
            return d

        full_ds_comparable_shapes_count = 0
        full_ds_comparable_attributes_count = 0
        for item in self._ds_dataset:
            for ann in item.annotations:
                if ann.type not in self._comparator.included_ann_types:
                    continue

                full_ds_comparable_attributes_count += len(
                    set(ann.attributes).difference(self._comparator.ignored_attrs)
                )
                full_ds_comparable_shapes_count += 1

        full_ds_comparable_labels_count = full_ds_comparable_shapes_count

        intersection_frames = []
        summary_stats = {}
        mean_ious = []
        for frame_id, frame_result in self._frame_results.items():
            intersection_frames.append(frame_id)

            for path in [
                ["annotation_kind", "shape", "valid_count"],
                ["annotation_kind", "shape", "missing_count"],
                ["annotation_kind", "shape", "extra_count"],
                ["annotation_kind", "shape", "total_count"],
                ["annotation_kind", "shape", "ds_count"],
                ["annotation_kind", "shape", "gt_count"],

                ["annotation_kind", "label", "valid_count"],
                ["annotation_kind", "label", "invalid_count"],
                ["annotation_kind", "label", "total_count"],

                ["annotation_kind", "attribute", "valid_count"],
                ["annotation_kind", "attribute", "invalid_count"],
                ["annotation_kind", "attribute", "missing_count"],
                ["annotation_kind", "attribute", "extra_count"],
                ["annotation_kind", "attribute", "total_count"],
                ["annotation_kind", "attribute", "ds_count"],
                ["annotation_kind", "attribute", "gt_count"],
                ["errors_count"],
            ]:
                frame_value = _get_nested_key(frame_result, path)
                try:
                    summary_value = _get_nested_key(summary_stats, path)
                    _set_nested_key(summary_stats, path, frame_value + summary_value)
                except KeyError:
                    _set_nested_key(summary_stats, path, frame_value)

            mean_ious.append(frame_result["annotation_kind"]["shape"]["mean_iou"])

        mean_shape_accuracy = _get_nested_key(summary_stats, ["annotation_kind", "shape", "valid_count"]) / (_get_nested_key(summary_stats, ["annotation_kind", "shape", "total_count"]) or 1)
        mean_label_accuracy = _get_nested_key(summary_stats, ["annotation_kind", "label", "valid_count"]) / (_get_nested_key(summary_stats, ["annotation_kind", "label", "total_count"]) or 1)
        mean_attribute_accuracy = _get_nested_key(summary_stats, ["annotation_kind", "attribute", "valid_count"]) / (_get_nested_key(summary_stats, ["annotation_kind", "attribute", "total_count"]) or 1)
        mean_error_count = summary_stats["errors_count"] / len(intersection_frames)

        estimated_ds_invalid_shapes_count = int(
            (1 - mean_shape_accuracy) * full_ds_comparable_shapes_count
        )
        estimated_ds_invalid_labels_count = int(
            (1 - mean_label_accuracy) * full_ds_comparable_labels_count
        )
        estimated_ds_invalid_attributes_count = int(
            (1 - mean_attribute_accuracy) * full_ds_comparable_attributes_count
        )

        return dict(
            included_annotation_types=[t.name for t in self._comparator.included_ann_types],
            ignored_attributes=self._comparator.ignored_attrs,

            intersection_results=dict(
                frame_count=len(intersection_frames),
                frame_share_percent=len(intersection_frames) / len(self._ds_dataset),
                frames=intersection_frames,

                error_count=summary_stats["errors_count"],
                mean_error_count=mean_error_count,
                annotation_kind={
                    'shape': {
                        'valid_count': _get_nested_key(summary_stats, ["annotation_kind", "shape", "valid_count"]),
                        'missing_count': _get_nested_key(summary_stats, ["annotation_kind", "shape", "missing_count"]),
                        'extra_count': _get_nested_key(summary_stats, ["annotation_kind", "shape", "extra_count"]),
                        'total_count': _get_nested_key(summary_stats, ["annotation_kind", "shape", "total_count"]),
                        'ds_count': _get_nested_key(summary_stats, ["annotation_kind", "shape", "ds_count"]),
                        'gt_count': _get_nested_key(summary_stats, ["annotation_kind", "shape", "gt_count"]),
                        'mean_iou': np.mean(mean_ious),
                        'accuracy': mean_shape_accuracy,
                    },
                    'label': {
                        'valid_count': _get_nested_key(summary_stats, ["annotation_kind", "label", "valid_count"]),
                        'invalid_count': _get_nested_key(summary_stats, ["annotation_kind", "label", "invalid_count"]),
                        'total_count': _get_nested_key(summary_stats, ["annotation_kind", "label", "total_count"]),
                        'accuracy': mean_label_accuracy,
                    },
                    'attribute': {
                        'valid_count': _get_nested_key(summary_stats, ["annotation_kind", "attribute", "valid_count"]),
                        'invalid_count': _get_nested_key(summary_stats, ["annotation_kind", "attribute", "invalid_count"]),
                        'missing_count': _get_nested_key(summary_stats, ["annotation_kind", "attribute", "missing_count"]),
                        'extra_count': _get_nested_key(summary_stats, ["annotation_kind", "attribute", "extra_count"]),
                        'total_count': _get_nested_key(summary_stats, ["annotation_kind", "attribute", "total_count"]),
                        'ds_count': _get_nested_key(summary_stats, ["annotation_kind", "attribute", "ds_count"]),
                        'gt_count': _get_nested_key(summary_stats, ["annotation_kind", "attribute", "gt_count"]),
                        'accuracy': mean_attribute_accuracy,
                    },
                },
            ),

            full_dataset=dict(
                frame_count=len(self._ds_dataset),
                shapes_count=full_ds_comparable_shapes_count,
                attributes_count=full_ds_comparable_attributes_count,

                estimated_invalid_shapes_count=estimated_ds_invalid_shapes_count,
                estimated_invalid_labels_count=estimated_ds_invalid_labels_count,
                estimated_invalid_attributes_count=estimated_ds_invalid_attributes_count,
            ),

            frame_results=self._frame_results,
        )


def main(args=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--gt")
    parser.add_argument("--gtf", default=None)
    parser.add_argument("--ds")
    parser.add_argument("--dsf", default=None)
    parser.add_argument("-o", default="report.json")
    args = parser.parse_args(args)

    gt_dataset = dm.Dataset.import_from(args.gt, format=args.gtf, env=dm_env)
    ds_dataset = dm.Dataset.import_from(args.ds, format=args.dsf, env=dm_env)

    comparator = DatasetComparator(ds_dataset, gt_dataset)
    # comparator._comparator.included_ann_types = [dm.AnnotationType.bbox]
    report = comparator.prepare_report()

    class JsonConverter(json.JSONEncoder):
        def default(self, o: Any):
            if isinstance(
                o, (AnnotationConflict, AnnotationConflictsReport, AnnotationId)
            ):
                return o.to_dict()
            else:
                return super().default(o)

    with open(args.o, "w") as f:
        json.dump(report, f, cls=JsonConverter, indent=2)

    return 0


if __name__ == "__main__":
    sys.exit(main())
