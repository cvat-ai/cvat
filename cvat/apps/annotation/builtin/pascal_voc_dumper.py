from pascal_voc_writer import Writer
import os
from zipfile import ZipFile
from tempfile import TemporaryDirectory

def dumps_as_pascal_voc(file_object, image_dir, annotations, ShapeType):
    with TemporaryDirectory() as out_dir:
        with ZipFile(file_object, 'w') as output_zip:
            for frame_annotation in annotations:
                image_name = frame_annotation.name
                width = frame_annotation.width
                height = frame_annotation.height

                image_path = os.path.join(image_dir, image_name)
                writer = Writer(image_path, width, height)
                writer.template_parameters['path'] = image_dir

                for shape in frame_annotation.shapes:
                    if shape.type != ShapeType.RECTANGLE:
                        continue
                    label = shape.label
                    xtl = shape.points[0]
                    ytl = shape.points[1]
                    xbr = shape.points[2]
                    ybr = shape.points[3]
                    writer.addObject(label, xtl, ytl, xbr, ybr)

                anno_name = os.path.basename('{}.{}'.format(os.path.splitext(image_name)[0], 'xml'))
                anno_file = os.path.join(out_dir, anno_name)
                print(anno_file)
                writer.save(anno_file)
                print(anno_file)
                output_zip.write(filename=anno_file, arcname=anno_name)

dumps_as_pascal_voc(file_object, 'images', annotations.shapes, ShapeType)
