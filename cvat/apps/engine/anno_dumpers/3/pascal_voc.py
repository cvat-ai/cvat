from collections import OrderedDict
from pascal_voc_writer import Writer
import os
import shutil

def dumps_as_pascal_voc(output_dir, extension, image_dir, annotations, ShapeType):
    for frame_annotation in annotations:
        image_name = frame_annotation["name"]
        width = frame_annotation["width"]
        height = frame_annotation["height"]

        image_path = os.path.join(image_dir, image_name)
        writer = Writer(image_path, width, height)

        for shape in frame_annotation["shapes"]:
            if shape["type"] != ShapeType.RECTANGLE:
                continue
            label = shape["label"]
            xtl = shape["points"][0]
            ytl = shape["points"][1]
            xbr = shape["points"][2]
            ybr = shape["points"][3]
            writer.addObject(label, xtl, ytl, xbr, ybr)

        anno_name = os.path.basename(os.path.splitext(image_name)[0] + '.xml')
        anno_dir = os.path.dirname(os.path.join(output_dir, image_name))
        os.makedirs(anno_dir, exist_ok=True)
        anno_file = os.path.join(anno_dir, anno_name)
        writer.save(anno_file)

    shutil.make_archive(output_dir, extension, output_dir)
    shutil.rmtree(output_dir)


out_dir, archive_ext = os.path.splitext(filename)
archive_ext = archive_ext.strip('.')

if os.path. exists(out_dir):
    shutil.rmtree(out_dir)
os.makedirs(out_dir)
dumps_as_pascal_voc(out_dir, archive_ext, 'images', annotations, ShapeType)
