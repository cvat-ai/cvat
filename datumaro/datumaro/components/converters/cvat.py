
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import os
import os.path as osp
from xml.sax.saxutils import XMLGenerator

from datumaro.components.converter import Converter
from datumaro.components.extractor import DEFAULT_SUBSET_NAME, AnnotationType
from datumaro.components.formats.cvat import CvatPath
from datumaro.util.image import save_image


def pairwise(iterable):
    a = iter(iterable)
    return zip(a, a)

class XmlAnnotationWriter:
    VERSION = '1.1'

    def __init__(self, f):
        self.xmlgen = XMLGenerator(f, 'utf-8')
        self._level = 0

    def _indent(self, newline = True):
        if newline:
            self.xmlgen.ignorableWhitespace('\n')
        self.xmlgen.ignorableWhitespace('  ' * self._level)

    def _add_version(self):
        self._indent()
        self.xmlgen.startElement('version', {})
        self.xmlgen.characters(self.VERSION)
        self.xmlgen.endElement('version')

    def open_root(self):
        self.xmlgen.startDocument()
        self.xmlgen.startElement('annotations', {})
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

    def write_meta(self, meta):
        self._indent()
        self.xmlgen.startElement('meta', {})
        self._add_meta(meta)
        self._indent()
        self.xmlgen.endElement('meta')

    def open_track(self, track):
        self._indent()
        self.xmlgen.startElement('track', track)
        self._level += 1

    def open_image(self, image):
        self._indent()
        self.xmlgen.startElement('image', image)
        self._level += 1

    def open_box(self, box):
        self._indent()
        self.xmlgen.startElement('box', box)
        self._level += 1

    def open_polygon(self, polygon):
        self._indent()
        self.xmlgen.startElement('polygon', polygon)
        self._level += 1

    def open_polyline(self, polyline):
        self._indent()
        self.xmlgen.startElement('polyline', polyline)
        self._level += 1

    def open_points(self, points):
        self._indent()
        self.xmlgen.startElement('points', points)
        self._level += 1

    def add_attribute(self, attribute):
        self._indent()
        self.xmlgen.startElement('attribute', {'name': attribute['name']})
        self.xmlgen.characters(attribute['value'])
        self.xmlgen.endElement('attribute')

    def _close_element(self, element):
        self._level -= 1
        self._indent()
        self.xmlgen.endElement(element)

    def close_box(self):
        self._close_element('box')

    def close_polygon(self):
        self._close_element('polygon')

    def close_polyline(self):
        self._close_element('polyline')

    def close_points(self):
        self._close_element('points')

    def close_image(self):
        self._close_element('image')

    def close_track(self):
        self._close_element('track')

    def close_root(self):
        self._close_element('annotations')
        self.xmlgen.endDocument()

class _SubsetWriter:
    def __init__(self, file, name, extractor, context):
        self._writer = XmlAnnotationWriter(file)
        self._name = name
        self._extractor = extractor
        self._context = context

    def write(self):
        self._writer.open_root()
        self._write_meta()

        for item in self._extractor:
            if self._context._save_images:
                self._save_image(item)
            self._write_item(item)

        self._writer.close_root()

    def _save_image(self, item):
        image = item.image
        if image is None:
            return

        image_path = osp.join(self._context._images_dir,
            str(item.id) + CvatPath.IMAGE_EXT)
        save_image(image_path, image)

    def _write_item(self, item):
        h, w = 0, 0
        if item.has_image:
            h, w = item.image.shape[:2]
        self._writer.open_image(OrderedDict([
            ("id", str(item.id)),
            ("name", str(item.id)),
            ("width", str(w)),
            ("height", str(h))
        ]))

        for ann in item.annotations:
            if ann.type in {AnnotationType.points, AnnotationType.polyline,
                    AnnotationType.polygon, AnnotationType.bbox}:
                self._write_shape(ann)
            else:
                continue

        self._writer.close_image()

    def _write_meta(self):
        label_cat = self._extractor.categories()[AnnotationType.label]
        meta = OrderedDict([
            ("task", OrderedDict([
                ("id", ""),
                ("name", self._name),
                ("size", str(len(self._extractor))),
                ("mode", "annotation"),
                ("overlap", ""),
                ("start_frame", "0"),
                ("stop_frame", str(len(self._extractor))),
                ("frame_filter", ""),
                ("z_order", "True"),

                ("labels", [
                    ("label", OrderedDict([
                        ("name", label.name),
                        ("attributes", [
                            ("attribute", OrderedDict([
                                ("name", attr),
                                ("mutable", "True"),
                                ("input_type", "text"),
                                ("default_value", ""),
                                ("values", ""),
                            ])) for attr in label.attributes
                        ])
                    ])) for label in label_cat.items
                ]),
            ])),
        ])
        self._writer.write_meta(meta)

    def _get_label(self, label_id):
        label_cat = self._extractor.categories()[AnnotationType.label]
        return label_cat.items[label_id]

    def _write_shape(self, shape):
        if shape.label is None:
            return

        shape_data = OrderedDict([
            ("label", self._get_label(shape.label).name),
            ("occluded", str(int(shape.attributes.get('occluded', False)))),
        ])

        points = shape.get_points()
        if shape.type == AnnotationType.bbox:
            shape_data.update(OrderedDict([
                ("xtl", "{:.2f}".format(points[0])),
                ("ytl", "{:.2f}".format(points[1])),
                ("xbr", "{:.2f}".format(points[2])),
                ("ybr", "{:.2f}".format(points[3]))
            ]))
        else:
            shape_data.update(OrderedDict([
                ("points", ';'.join((
                    ','.join((
                        "{:.2f}".format(x),
                        "{:.2f}".format(y)
                    )) for x, y in pairwise(points))
                )),
            ]))

        shape_data['z_order'] = str(int(shape.attributes.get('z_order', 0)))
        if shape.group is not None:
            shape_data['group_id'] = str(shape.group)

        if shape.type == AnnotationType.bbox:
            self._writer.open_box(shape_data)
        elif shape.type == AnnotationType.polygon:
            self._writer.open_polygon(shape_data)
        elif shape.type == AnnotationType.polyline:
            self._writer.open_polyline(shape_data)
        elif shape.type == AnnotationType.points:
            self._writer.open_points(shape_data)
        else:
            raise NotImplementedError("unknown shape type")

        for attr_name, attr_value in shape.attributes.items():
            if attr_name in self._get_label(shape.label).attributes:
                self._writer.add_attribute(OrderedDict([
                    ("name", str(attr_name)),
                    ("value", str(attr_value)),
                ]))

        if shape.type == AnnotationType.bbox:
            self._writer.close_box()
        elif shape.type == AnnotationType.polygon:
            self._writer.close_polygon()
        elif shape.type == AnnotationType.polyline:
            self._writer.close_polyline()
        elif shape.type == AnnotationType.points:
            self._writer.close_points()
        else:
            raise NotImplementedError("unknown shape type")

class _Converter:
    def __init__(self, extractor, save_dir, save_images=False):
        self._extractor = extractor
        self._save_dir = save_dir
        self._save_images = save_images

    def convert(self):
        os.makedirs(self._save_dir, exist_ok=True)

        images_dir = osp.join(self._save_dir, CvatPath.IMAGES_DIR)
        os.makedirs(images_dir, exist_ok=True)
        self._images_dir = images_dir

        annotations_dir = osp.join(self._save_dir, CvatPath.ANNOTATIONS_DIR)
        os.makedirs(annotations_dir, exist_ok=True)
        self._annotations_dir = annotations_dir

        subsets = self._extractor.subsets()
        if len(subsets) == 0:
            subsets = [ None ]

        for subset_name in subsets:
            if subset_name:
                subset = self._extractor.get_subset(subset_name)
            else:
                subset_name = DEFAULT_SUBSET_NAME
                subset = self._extractor

            with open(osp.join(annotations_dir, '%s.xml' % subset_name), 'w') as f:
                writer = _SubsetWriter(f, subset_name, subset, self)
                writer.write()

class CvatConverter(Converter):
    def __init__(self, save_images=False, cmdline_args=None):
        super().__init__()

        self._options = {
            'save_images': save_images,
        }

        if cmdline_args is not None:
            self._options.update(self._parse_cmdline(cmdline_args))

    @classmethod
    def build_cmdline_parser(cls, parser=None):
        import argparse
        if not parser:
            parser = argparse.ArgumentParser()

        parser.add_argument('--save-images', action='store_true',
            help="Save images (default: %(default)s)")

        return parser

    def __call__(self, extractor, save_dir):
        converter = _Converter(extractor, save_dir, **self._options)
        converter.convert()