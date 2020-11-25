# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from hashlib import blake2s

from datumaro.cli.util import make_file_name


def get_color_from_index(index):
    def get_bit(number, index):
        return (number >> index) & 1

    color = [0, 0, 0]

    for j in range(7, -1, -1):
        for c in range(3):
            color[c] |= get_bit(index, c) << j
        index >>= 3

    return tuple(color)

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
    labels = [label for _, label in task_data.meta['task']['labels']]
    label_names = [label['name'] for label in labels]

    if 'background' not in label_names:
        labels.insert(0, {
                'name': 'background',
                'color': '#000000',
            }
        )

    return {label['name']: [hex2rgb(label['color']), [], []] for label in labels}


def get_label_color(label_name, label_names):
    predefined = parse_default_colors()
    normalized_names = [normalize_label(l_name) for l_name in label_names]
    normalized_name = normalize_label(label_name)

    color = predefined.get(normalized_name, None)
    name_hash = int.from_bytes(blake2s(normalized_name.encode(), digest_size=4).digest(), byteorder="big")
    offset = name_hash + normalized_names.count(normalized_name)

    if color is None:
        color = get_color_from_index(DEFAULT_COLORMAP_CAPACITY + offset)
    elif normalized_names.count(normalized_name):
        color = get_color_from_index(DEFAULT_COLORMAP_CAPACITY + offset - 1)

    return rgb2hex(color)
