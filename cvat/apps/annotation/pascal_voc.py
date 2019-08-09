# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "PASCAL VOC",
    "dumpers": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.0",
            "handler": "dump"
        },
    ],
    "loaders": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.0",
            "handler": "load"
        },
    ],
}

def load(file_object, annotations):
    from pyunpack import Archive
    import os
    import re
    from tempfile import TemporaryDirectory

    def match_frame(frame_info, filename):
        def get_filename(path):
            return os.path.splitext(os.path.basename(path))[0]

        # try to match by filename
        pascal_filename = get_filename(filename)
        for frame_number, info in frame_info.items():
            cvat_filename = get_filename(info['path'])
            if cvat_filename == pascal_filename:
                return frame_number

        # try to extract framenumber from filename
        numbers = re.findall(r'\d+', filename)
        if numbers and len(numbers) == 1:
            return int(numbers[0])

        raise Exception('Cannot match filename or determinate framenumber for {} filename'.format(filename))

    def parse_xml_file(annotation_file):
        import xml.etree.ElementTree as ET
        root = ET.parse(annotation_file).getroot()
        frame_number = match_frame(annotations.frame_info, root.find('filename').text)

        for obj_tag in root.iter('object'):
            bbox_tag = obj_tag.find("bndbox")
            label = obj_tag.find('name').text
            xmin = float(bbox_tag.find('xmin').text)
            ymin = float(bbox_tag.find('ymin').text)
            xmax = float(bbox_tag.find('xmax').text)
            ymax = float(bbox_tag.find('ymax').text)

            annotations.add_shape(annotations.LabeledShape(
                type='rectangle',
                frame=frame_number,
                label=label,
                points=[xmin, ymin, xmax, ymax],
                occluded=False,
                attributes=[],
            ))

    archive_file = getattr(file_object, 'name')
    with TemporaryDirectory() as tmp_dir:
        Archive(archive_file).extractall(tmp_dir)

        for dirpath, _, filenames in os.walk(tmp_dir):
            for _file in filenames:
                if '.xml' == os.path.splitext(_file)[1]:
                    parse_xml_file(os.path.join(dirpath, _file))

def dump(file_object, annotations):
    from pascal_voc_writer import Writer
    import os
    from zipfile import ZipFile
    from tempfile import TemporaryDirectory

    with TemporaryDirectory() as out_dir:
        with ZipFile(file_object, 'w') as output_zip:
            for frame_annotation in annotations.group_by_frame():
                image_name = frame_annotation.name
                width = frame_annotation.width
                height = frame_annotation.height

                writer = Writer(image_name, width, height)
                writer.template_parameters['path'] = ''
                writer.template_parameters['folder'] = ''

                for shape in frame_annotation.labeled_shapes:
                    if shape.type != "rectangle":
                        continue
                    label = shape.label
                    xtl = shape.points[0]
                    ytl = shape.points[1]
                    xbr = shape.points[2]
                    ybr = shape.points[3]
                    writer.addObject(label, xtl, ytl, xbr, ybr)

                anno_name = os.path.basename('{}.{}'.format(os.path.splitext(image_name)[0], 'xml'))
                anno_file = os.path.join(out_dir, anno_name)
                writer.save(anno_file)
                output_zip.write(filename=anno_file, arcname=anno_name)
