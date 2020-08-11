# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp

from datumaro.cli.util import make_file_name
from datumaro.util.mask_tools import generate_colormap


DEFAULT_COLORMAP_CAPACITY = 2000
DEFAULT_COLORMAP_PATH = osp.join(osp.dirname(__file__), 'predefined_colors.txt')
def parse_default_colors(file_path=None):
    if file_path is None:
        file_path = DEFAULT_COLORMAP_PATH

    colors = {}
    with open(file_path) as f:
        for line in f:
            line = line.strip()
            if not line or line[0] == '#':
                continue
            _, label, color = line.split(':')
            colors[label] = tuple(map(int, color.split(',')))
    return colors

def normalize_label(label):
    label = make_file_name(label) # basically, convert to ASCII lowercase
    label = label.replace('-', '_')
    return label

def rgb2hex(color):
    return '#{0:02x}{1:02x}{2:02x}'.format(*color)

def hex2rgb(color):
    return tuple(int(color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))

def make_colormap(task_data):
    labels = sorted([label
        for _, label in task_data.meta['task']['labels']],
        key=lambda l: l['name'])
    label_names = [label['name'] for label in labels]

    if 'background' not in label_names:
        labels.insert(0, {
                'name': 'background',
                'color': '#000000',
            }
        )

    return {label['name']: [hex2rgb(label['color']), [], []] for label in labels}

def get_color_from_label_name(label_name, offset=1):
    predefined = parse_default_colors()

    color = predefined.get(normalize_label(label_name), None)

    if color is None:
        colors = generate_colormap(DEFAULT_COLORMAP_CAPACITY + offset + 1)
        color = colors[DEFAULT_COLORMAP_CAPACITY + offset]

    return color
