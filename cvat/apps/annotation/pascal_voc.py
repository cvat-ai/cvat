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
    from tempfile import TemporaryDirectory

    def parse_xml_file(annotation_file):
        import xml.etree.ElementTree as ET
        root = ET.parse(annotation_file).getroot()
        frame_number = annotations.match_frame(root.find('filename').text)

        for obj_tag in root.iter('object'):
            bbox_tag = obj_tag.find("bndbox")
            label = obj_tag.find('name').text
            xmin = float(bbox_tag.find('xmin').text)
            ymin = float(bbox_tag.find('ymin').text)
            xmax = float(bbox_tag.find('xmax').text)
            ymax = float(bbox_tag.find('ymax').text)
            truncated = obj_tag.find('truncated')
            truncated = truncated.text if truncated is not None else 0
            difficult = obj_tag.find('difficult')
            difficult = difficult.text if difficult is not None else 0

            annotations.add_shape(annotations.LabeledShape(
                type='rectangle',
                frame=frame_number,
                label=label,
                points=[xmin, ymin, xmax, ymax],
                occluded=False,
                attributes=[
                    annotations.Attribute('truncated', truncated),
                    annotations.Attribute('difficult', difficult),
                ],
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

                    difficult = 0
                    truncated = 0
                    for attribute in shape.attributes:
                        if attribute.name == 'truncated' and 'true' == attribute.value.lower():
                            truncated = 1
                        elif attribute.name == 'difficult' and 'true' == attribute.value.lower():
                            difficult = 1

                    writer.addObject(
                        name=label,
                        xmin=xtl,
                        ymin=ytl,
                        xmax=xbr,
                        ymax=ybr,
                        truncated=truncated,
                        difficult=difficult,
                    )

                anno_name = os.path.basename('{}.{}'.format(os.path.splitext(image_name)[0], 'xml'))
                anno_file = os.path.join(out_dir, anno_name)
                writer.save(anno_file)
                output_zip.write(filename=anno_file, arcname=anno_name)
