# Copyright (C) 2019-2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from hashlib import blake2s
import itertools
import operator

from datumaro.util.os_util import make_file_name

def get_color_from_index(index):
    def get_bit(number, index):
        return (number >> index) & 1

    color = [0, 0, 0]

    for j in range(7, -1, -1):
        for c in range(3):
            color[c] |= get_bit(index, c) << j
        index >>= 3

    return tuple(color)

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

def make_colormap(instance_data):
    instance_name = 'project' if 'project' in instance_data.meta.keys() else 'task'
    labels = [label for _, label in instance_data.meta[instance_name]['labels']]
    label_names = [label['name'] for label in labels]

    if 'background' not in label_names:
        labels.insert(0, {
                'name': 'background',
                'color': '#000000',
            }
        )

    return {label['name']: [hex2rgb(label['color']), [], []] for label in labels}

def generate_color(color, used_colors):
    def tint_shade_color():
        for added_color in (255, 0):
            for factor in range(1, 10):
                yield tuple(map(lambda c: int(c + (added_color - c) * factor / 10), color))

    def get_unused_color():
        def get_avg_color(index):
            sorted_colors = sorted(used_colors, key=operator.itemgetter(index))
            max_dist_pair = max(zip(sorted_colors, sorted_colors[1:]),
                key=lambda c_pair: c_pair[1][index] - c_pair[0][index])
            return (max_dist_pair[0][index] + max_dist_pair[1][index]) // 2

        return tuple(get_avg_color(i) for i in range(3))

    #try to tint and shade color firstly
    for new_color in tint_shade_color():
        if new_color not in used_colors:
            return new_color

    return get_unused_color()

def get_label_color(label_name, label_colors):
    predefined = parse_default_colors()
    label_colors = tuple(hex2rgb(c) for c in label_colors if c)
    used_colors = set(itertools.chain(predefined.values(), label_colors))
    normalized_name = normalize_label(label_name)

    color = predefined.get(normalized_name, None)
    if color is None:
        name_hash = int.from_bytes(blake2s(normalized_name.encode(), digest_size=3).digest(), byteorder="big")
        color = get_color_from_index(name_hash)

    if color in label_colors:
        color = generate_color(color, used_colors)

    return rgb2hex(color)
