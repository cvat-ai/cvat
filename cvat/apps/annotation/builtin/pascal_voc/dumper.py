from pascal_voc_writer import Writer
import os
from zipfile import ZipFile
from tempfile import TemporaryDirectory

def dumps_as_pascal_voc(file_object, annotations):
    with TemporaryDirectory() as out_dir:
        with ZipFile(file_object, 'w') as output_zip:
            for frame_annotation in annotations:
                image_name = frame_annotation.name
                width = frame_annotation.width
                height = frame_annotation.height

                writer = Writer(image_name, width, height)
                writer.template_parameters['path'] = ''

                for shape in frame_annotation.shapes:
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

dumps_as_pascal_voc(file_object, annotations.shapes)
