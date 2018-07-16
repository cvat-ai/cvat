import os
import argparse
import xml.etree.ElementTree
from PIL import Image
from pascal_voc_writer import Writer


def read_cvat_xml(xml_file, img_dir, annotation_dir):
    os.makedirs(annotation_dir)
    cvat_xml = xml.etree.ElementTree.parse(xml_file)

    for img_tag in cvat_xml.findall('image'):
        filename = img_tag.get('name')

        filepath = os.path.join(img_dir, filename)
        with Image.open(filepath) as img:
            width, height = img.size

        writer = Writer(filepath, width, height)

        for box in img_tag.findall('box'):
            label = box.get('label')
            xmin = float(box.get('xtl'))
            ymin = float(box.get('ytl'))
            xmax = float(box.get('xbr'))
            ymax = float(box.get('ybr'))

            writer.addObject(label, xmin, ymin, xmax, ymax)

        fname = os.path.splitext(filename)[0] + '.xml'
        writer.save(os.path.join(annotation_dir, fname))


parser = argparse.ArgumentParser(description='Transforms CVAT XML to Pascal '
                                             'VOC format')
parser.add_argument('cvat_xml', type=argparse.FileType())
parser.add_argument('img_dir')
parser.add_argument('annotation_dir')

if __name__ == '__main__':
    args = vars(parser.parse_args())
    read_cvat_xml(args['cvat_xml'], args['img_dir'], args['annotation_dir'])
