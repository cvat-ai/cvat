# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "LabelMe",
    "dumpers": [
        {
            "display_name": "{name} {format} {version} for images",
            "format": "ZIP",
            "version": "3.0",
            "handler": "dump_as_labelme_annotation"
        }
    ],
    "loaders": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "3.0",
            "handler": "load",
        }
    ],
}


_DEFAULT_USERNAME = 'cvat'
_MASKS_DIR = 'Masks'


def dump_frame_anno(frame_annotation):
    from collections import defaultdict
    from lxml import etree as ET

    root_elem = ET.Element('annotation')

    ET.SubElement(root_elem, 'filename').text = frame_annotation.name
    ET.SubElement(root_elem, 'folder').text = ''

    source_elem = ET.SubElement(root_elem, 'source')
    ET.SubElement(source_elem, 'sourceImage').text = ''
    ET.SubElement(source_elem, 'sourceAnnotation').text = 'CVAT'

    image_elem = ET.SubElement(root_elem, 'imagesize')
    ET.SubElement(image_elem, 'nrows').text = str(frame_annotation.height)
    ET.SubElement(image_elem, 'ncols').text = str(frame_annotation.width)

    groups = defaultdict(list)

    for obj_id, shape in enumerate(frame_annotation.labeled_shapes):
        obj_elem = ET.SubElement(root_elem, 'object')
        ET.SubElement(obj_elem, 'name').text = str(shape.label)
        ET.SubElement(obj_elem, 'deleted').text = '0'
        ET.SubElement(obj_elem, 'verified').text = '0'
        ET.SubElement(obj_elem, 'occluded').text = \
            'yes' if shape.occluded else 'no'
        ET.SubElement(obj_elem, 'date').text = ''
        ET.SubElement(obj_elem, 'id').text = str(obj_id)

        parts_elem = ET.SubElement(obj_elem, 'parts')
        if shape.group:
            groups[shape.group].append((obj_id, parts_elem))
        else:
            ET.SubElement(parts_elem, 'hasparts').text = ''
            ET.SubElement(parts_elem, 'ispartof').text = ''

        if shape.type == 'rectangle':
            ET.SubElement(obj_elem, 'type').text = 'bounding_box'

            poly_elem = ET.SubElement(obj_elem, 'polygon')
            x0, y0, x1, y1 = shape.points
            points = [ (x0, y0), (x1, y0), (x1, y1), (x0, y1) ]
            for x, y in points:
                point_elem = ET.SubElement(poly_elem, 'pt')
                ET.SubElement(point_elem, 'x').text = '%.2f' % x
                ET.SubElement(point_elem, 'y').text = '%.2f' % y

            ET.SubElement(poly_elem, 'username').text = _DEFAULT_USERNAME
        elif shape.type == 'polygon':
            poly_elem = ET.SubElement(obj_elem, 'polygon')
            for x, y in zip(shape.points[::2], shape.points[1::2]):
                point_elem = ET.SubElement(poly_elem, 'pt')
                ET.SubElement(point_elem, 'x').text = '%.2f' % x
                ET.SubElement(point_elem, 'y').text = '%.2f' % y

            ET.SubElement(poly_elem, 'username').text = _DEFAULT_USERNAME
        elif shape.type == 'polyline':
            pass
        elif shape.type == 'points':
            pass
        else:
            raise NotImplementedError("Unknown shape type '%s'" % shape.type)

        attrs = ['%s=%s' % (a.name, a.value) for a in shape.attributes]
        ET.SubElement(obj_elem, 'attributes').text = ', '.join(attrs)

    for _, group in groups.items():
        leader_id, leader_parts_elem = group[0]
        leader_parts = [str(o_id) for o_id, _ in group[1:]]
        ET.SubElement(leader_parts_elem, 'hasparts').text = \
            ','.join(leader_parts)
        ET.SubElement(leader_parts_elem, 'ispartof').text = ''

        for obj_id, parts_elem in group[1:]:
            ET.SubElement(parts_elem, 'hasparts').text = ''
            ET.SubElement(parts_elem, 'ispartof').text = str(leader_id)

    return ET.tostring(root_elem, encoding='unicode', pretty_print=True)

def dump_as_labelme_annotation(file_object, annotations):
    import os.path as osp
    from zipfile import ZipFile, ZIP_DEFLATED

    with ZipFile(file_object, 'w', compression=ZIP_DEFLATED) as output_zip:
        for frame_annotation in annotations.group_by_frame():
            xml_data = dump_frame_anno(frame_annotation)
            filename = osp.splitext(frame_annotation.name)[0] + '.xml'
            output_zip.writestr(filename, xml_data)

def parse_xml_annotations(xml_data, annotations, input_zip):
    from datumaro.util.mask_tools import mask_to_polygons
    from io import BytesIO
    from lxml import etree as ET
    import numpy as np
    import os.path as osp
    from PIL import Image

    def parse_attributes(attributes_string):
        parsed = []
        if not attributes_string:
            return parsed

        read = attributes_string.split(',')
        read = [a.strip() for a in read if a.strip()]
        for attr in read:
            if '=' in attr:
                name, value = attr.split('=', maxsplit=1)
                parsed.append(annotations.Attribute(name, value))
            else:
                parsed.append(annotations.Attribute(attr, '1'))

        return parsed


    root_elem = ET.fromstring(xml_data)

    frame_number = annotations.match_frame(root_elem.find('filename').text)

    parsed_annotations = dict()
    group_assignments = dict()
    root_annotations = set()
    for obj_elem in root_elem.iter('object'):
        obj_id = int(obj_elem.find('id').text)

        ann_items = []

        attributes = []
        attributes_elem = obj_elem.find('attributes')
        if attributes_elem is not None and attributes_elem.text:
            attributes = parse_attributes(attributes_elem.text)

        occluded = False
        occluded_elem = obj_elem.find('occluded')
        if occluded_elem is not None and occluded_elem.text:
            occluded = (occluded_elem.text == 'yes')

        deleted = False
        deleted_elem = obj_elem.find('deleted')
        if deleted_elem is not None and deleted_elem.text:
            deleted = bool(int(deleted_elem.text))

        poly_elem = obj_elem.find('polygon')
        segm_elem = obj_elem.find('segm')
        type_elem = obj_elem.find('type') # the only value is 'bounding_box'
        if poly_elem is not None:
            points = []
            for point_elem in poly_elem.iter('pt'):
                x = float(point_elem.find('x').text)
                y = float(point_elem.find('y').text)
                points.append(x)
                points.append(y)
            label = obj_elem.find('name').text
            if label and attributes:
                label_id = annotations._get_label_id(label)
                if label_id:
                    attributes = [a for a in attributes
                        if annotations._get_attribute_id(label_id, a.name)
                    ]
                else:
                    attributes = []
            else:
                attributes = []

            if type_elem is not None and type_elem.text == 'bounding_box':
                xmin = min(points[::2])
                xmax = max(points[::2])
                ymin = min(points[1::2])
                ymax = max(points[1::2])
                ann_items.append(annotations.LabeledShape(
                    type='rectangle',
                    frame=frame_number,
                    label=label,
                    points=[xmin, ymin, xmax, ymax],
                    occluded=occluded,
                    attributes=attributes,
                ))
            else:
                ann_items.append(annotations.LabeledShape(
                    type='polygon',
                    frame=frame_number,
                    label=label,
                    points=points,
                    occluded=occluded,
                    attributes=attributes,
                ))
        elif segm_elem is not None:
            label = obj_elem.find('name').text
            if label and attributes:
                label_id = annotations._get_label_id(label)
                if label_id:
                    attributes = [a for a in attributes
                        if annotations._get_attribute_id(label_id, a.name)
                    ]
                else:
                    attributes = []
            else:
                attributes = []

            mask_file = segm_elem.find('mask').text
            mask = input_zip.read(osp.join(_MASKS_DIR, mask_file))
            mask = np.asarray(Image.open(BytesIO(mask)).convert('L'))
            mask = (mask != 0)
            polygons = mask_to_polygons(mask)

            for polygon in polygons:
                ann_items.append(annotations.LabeledShape(
                    type='polygon',
                    frame=frame_number,
                    label=label,
                    points=polygon,
                    occluded=occluded,
                    attributes=attributes,
                ))

        if not deleted:
            parsed_annotations[obj_id] = ann_items

        parts_elem = obj_elem.find('parts')
        if parts_elem is not None:
            children_ids = []
            hasparts_elem = parts_elem.find('hasparts')
            if hasparts_elem is not None and hasparts_elem.text:
                children_ids = [int(c) for c in hasparts_elem.text.split(',')]

            parent_ids = []
            ispartof_elem = parts_elem.find('ispartof')
            if ispartof_elem is not None and ispartof_elem.text:
                parent_ids = [int(c) for c in ispartof_elem.text.split(',')]

            if children_ids and not parent_ids and hasparts_elem.text:
                root_annotations.add(obj_id)
            group_assignments[obj_id] = [None, children_ids]

    # assign a single group to the whole subtree
    current_group_id = 0
    annotations_to_visit = list(root_annotations)
    while annotations_to_visit:
        ann_id = annotations_to_visit.pop()
        ann_assignment = group_assignments[ann_id]
        group_id, children_ids = ann_assignment
        if group_id:
            continue

        if ann_id in root_annotations:
            current_group_id += 1 # start a new group

        group_id = current_group_id
        ann_assignment[0] = group_id

        # continue with children
        annotations_to_visit.extend(children_ids)

    assert current_group_id == len(root_annotations)

    for ann_id, ann_items in parsed_annotations.items():
        group_id = 0
        if ann_id in group_assignments:
            ann_assignment = group_assignments[ann_id]
            group_id = ann_assignment[0]

        for ann_item in ann_items:
            if group_id:
                ann_item = ann_item._replace(group=group_id)
            if isinstance(ann_item, annotations.LabeledShape):
                annotations.add_shape(ann_item)
            else:
                raise NotImplementedError()

def load(file_object, annotations):
    from zipfile import ZipFile

    with ZipFile(file_object, 'r') as input_zip:
        for filename in input_zip.namelist():
            if not filename.endswith('.xml'):
                continue

            xml_data = input_zip.read(filename)
            parse_xml_annotations(xml_data, annotations, input_zip)
