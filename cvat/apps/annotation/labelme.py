# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "LabelMe",
    "dumpers": [
        {
            "display_name": "{name} {format} {version} for images",
            "format": "XML",
            "version": "3.0",
            "handler": "dump_as_labelme_annotation"
        }
    ],
    "loaders": [
        {
            "display_name": "{name} {format} {version}",
            "format": "XML",
            "version": "3.0",
            "handler": "load",
        }
    ],
}

def dump_frame_anno(frame_annotation):
    from lxml import etree as ET

    root_elem = ET.Element('annotation')

    ET.SubElement(root_elem, 'filename').text = frame_annotation.name
    ET.SubElement(root_elem, 'folder').text = ''

    source_elem = ET.SubElement(root_elem, 'source')
    ET.SubElement(source_elem, 'sourceImage').text = 'task #'
    ET.SubElement(source_elem, 'sourceAnnotation').text = 'CVAT'

    image_elem = ET.SubElement(root_elem, 'imagesize')
    ET.SubElement(image_elem, 'nrows').text = str(frame_annotation.height)
    ET.SubElement(image_elem, 'ncols').text = str(frame_annotation.width)

    next_obj_id = 0
    for shape in frame_annotation.labeled_shapes:
        obj_elem = ET.SubElement(root_elem, 'object')
        ET.SubElement(obj_elem, 'name').text = str(shape.label)
        ET.SubElement(obj_elem, 'deleted').text = '0'
        ET.SubElement(obj_elem, 'verified').text = '0'
        ET.SubElement(obj_elem, 'occluded').text = str(int(shape.occluded))
        ET.SubElement(obj_elem, 'date').text = '0'
        ET.SubElement(obj_elem, 'id').text = str(next_obj_id)
        next_obj_id += 1

        parts_elem = ET.SubElement(obj_elem, 'parts')
        # TODO: handle groups
        # .text = str(shape.group)
        ET.SubElement(parts_elem, 'hasparts')
        ET.SubElement(parts_elem, 'ispartof')

        if shape.type == 'rectangle':
            ET.SubElement(obj_elem, 'type').text = 'bounding_box'

            poly_elem = ET.SubElement(obj_elem, 'polygon')
            x0 = shape.points[0]
            y0 = shape.points[1]
            x1 = shape.points[2]
            y1 = shape.points[4]
            points = [ (x0, y0), (x1, y0), (x1, y1), (x0, y1) ]
            for x, y in points:
                point_elem = ET.SubElement(poly_elem, 'pt')
                ET.SubElement(point_elem, 'x').text = '%.2f' % x
                ET.SubElement(point_elem, 'y').text = '%.2f' % y
        elif shape.type == 'polygon':
            poly_elem = ET.SubElement(obj_elem, 'polygon')
            for x, y in zip(shape.points[::2], shape.points[1::2]):
                point_elem = ET.SubElement(poly_elem, 'pt')
                ET.SubElement(point_elem, 'x').text = '%.2f' % x
                ET.SubElement(point_elem, 'y').text = '%.2f' % y
        elif shape.type == 'polyline':
            pass
        elif shape.type == 'points':
            pass
        else:
            raise NotImplementedError("Unknown shape type '%s'" % shape.type)

        attr_string = ''
        for i, attr in enumerate(shape.attributes):
            if i:
                attr_string += ', '
            attr_string += '%s=%s' % (attr.name, attr.value)
        ET.SubElement(obj_elem, 'attributes').text = attr_string

    return ET.tostring(root_elem, encoding='unicode', pretty_print=True)

def dump_as_labelme_annotation(file_object, annotations):
    from zipfile import ZipFile

    with ZipFile(file_object, 'w') as output_zip:
        for frame_annotation in annotations.group_by_frame():
            xml_data = dump_frame_anno(frame_annotation)
            output_zip.writestr(frame_annotation.name + '.xml', xml_data)

def load(file_object, annotations):
    pass