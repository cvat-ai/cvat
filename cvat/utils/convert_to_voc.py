"""
Given a CVAT XML and a directory with the image dataset, this script reads the
CVAT XML and writes the annotations in PASCAL VOC format into a given
directory.

This implementation only supports bounding boxes in CVAT annotation format, and
warns if it encounter any tracks or annotations that are not bounding boxes,
ignoring them in both cases.

To use the script run:

python convert_to_voc.py cvat.xml path_to_image_directory output_directory
"""
import os
import argparse
import xml.etree.ElementTree
from PIL import Image
from pascal_voc_writer import Writer
import logging

logger = logging.getLogger()
KNOWN_TAGS = {'box', 'image', 'attribute'}


def process_cvat_xml(xml_file, img_dir, annotation_dir):
    """
    Transforms a single XML in CVAT format to multiple PASCAL VOC format
    XMls.

    :param xml_file: CVAT format XML
    :param img_dir: image directory of the dataset
    :param annotation_dir: directory of annotations with PASCAL VOC format
    :return:
    """
    os.makedirs(annotation_dir)
    cvat_xml = xml.etree.ElementTree.parse(xml_file)

    tracks = [(x.get('id'), x.get('label'))
              for x in cvat_xml.findall('track')]
    if tracks:
        logger.warn('Cannot parse interpolation tracks, ignoring {} tracks'
                    .format(len(tracks)))

    for img_tag in cvat_xml.findall('image'):
        filename = img_tag.get('name')

        filepath = os.path.join(img_dir, filename)
        with Image.open(filepath) as img:
            width, height = img.size

        writer = Writer(filepath, width, height)

        unknown_tags = {x.tag for x in img_tag.iter()}.difference(KNOWN_TAGS)
        if unknown_tags:
            logger.warn('Ignoring tags for image {}: {}'
                        .format(filepath, unknown_tags))

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
parser.add_argument('cvat_xml', type=argparse.FileType(), help='CVAT XML file')
parser.add_argument('img_dir', help='Image directory of the dataset')
parser.add_argument('annotation_dir', help='Output directory of '
                                           'XML annotations')

if __name__ == '__main__':
    args = vars(parser.parse_args())
    process_cvat_xml(args['cvat_xml'], args['img_dir'], args['annotation_dir'])
