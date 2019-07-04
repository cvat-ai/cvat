#!/usr/bin/env python
#
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import absolute_import, division, print_function

import argparse
import os
import glog as log
import numpy as np
import cv2
from lxml import etree
from tqdm import tqdm


def parse_args():
    """Parse arguments of command line"""
    parser = argparse.ArgumentParser(
        fromfile_prefix_chars='@',
        description='Convert CVAT XML annotations to masks'
    )

    parser.add_argument(
        '--cvat-xml', metavar='FILE', required=True,
        help='input file with CVAT annotation in xml format'
    )

    parser.add_argument(
        '--background-color', metavar='COLOR_BGR', default="0,0,0",
        help='specify background color (by default: 0,0,0)'
    )

    parser.add_argument(
        '--label-color', metavar='LABEL:COLOR_BGR', action='append',
        default=[],
        help="specify a label's color (e.g. 255 or 255,0,0). The color will " +
            "be interpreted in accordance with the mask format."
    )

    parser.add_argument(
        '--mask-bitness', type=int, choices=[8, 24], default=8,
        help='choose bitness for masks'
    )

    parser.add_argument(
        '--output-dir', metavar='DIRECTORY', required=True,
        help='directory for output masks'
    )

    return parser.parse_args()

def parse_anno_file(cvat_xml):
    root = etree.parse(cvat_xml).getroot()
    anno = []
    for image_tag in root.iter('image'):
        image = {}
        for key, value in image_tag.items():
            image[key] = value
        image['shapes'] = []
        for poly_tag in image_tag.iter('polygon'):
            polygon = {'type': 'polygon'}
            for key, value in poly_tag.items():
                polygon[key] = value
            image['shapes'].append(polygon)
        for box_tag in image_tag.iter('box'):
            box = {'type': 'box'}
            for key, value in box_tag.items():
                box[key] = value
            box['points'] = "{0},{1};{2},{1};{2},{3};{0},{3}".format(
                box['xtl'], box['ytl'], box['xbr'], box['ybr'])
            image['shapes'].append(box)

        image['shapes'].sort(key=lambda x: int(x.get('z_order', 0)))
        anno.append(image)

    return anno

def create_mask_file(mask_path, width, height, bitness, color_map, background, shapes):
    mask = np.full((height, width, bitness // 8), background, dtype=np.uint8)
    for shape in shapes:
        color = color_map.get(shape['label'], background)
        points = [tuple(map(float, p.split(','))) for p in shape['points'].split(';')]
        points = np.array([(int(p[0]), int(p[1])) for p in points])

        mask = cv2.fillPoly(mask, [points], color=color)
    cv2.imwrite(mask_path, mask)

def to_scalar(str, dim):
    scalar = list(map(int, str.split(',')))
    if len(scalar) < dim:
        scalar.extend([scalar[-1]] * dim)
    return tuple(scalar[0:dim])

def main():
    args = parse_args()
    anno = parse_anno_file(args.cvat_xml)

    color_map = {}
    dim = args.mask_bitness // 8
    for item in args.label_color:
        label, color = item.split(':')
        color_map[label] = to_scalar(color, dim)
    background = to_scalar(args.background_color, dim)

    for image in tqdm(anno, desc='Generate masks'):
        mask_path = os.path.join(args.output_dir, os.path.splitext(image['name'])[0] + '.png')
        mask_dir = os.path.dirname(mask_path)
        if mask_dir:
            os.makedirs(mask_dir, exist_ok=True)
        create_mask_file(mask_path, int(image['width']), int(image['height']),
            args.mask_bitness, color_map, background, image['shapes'])


if __name__ == "__main__":
    main()
