
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
from itertools import islice


def find(iterable, pred=lambda x: True, default=None):
    return next((x for x in iterable if pred(x)), default)

def dir_items(path, ext, truncate_ext=False):
    items = []
    for f in os.listdir(path):
        ext_pos = f.rfind(ext)
        if ext_pos != -1:
            if truncate_ext:
                f = f[:ext_pos]
            items.append(f)
    return items

def split_path(path):
    path = osp.normpath(path)
    parts = []

    while True:
        path, part = osp.split(path)
        if part:
            parts.append(part)
        else:
            if path:
                parts.append(path)
            break
    parts.reverse()

    return parts

def cast(value, type_conv, default=None):
    if value is None:
        return default
    try:
        return type_conv(value)
    except Exception:
        return default

def to_snake_case(s):
    if not s:
        return ''

    name = [s[0].lower()]
    for idx, char in enumerate(s[1:]):
        idx = idx + 1
        if char.isalpha() and char.isupper():
            prev_char = s[idx - 1]
            if not (prev_char.isalpha() and prev_char.isupper()):
                # avoid "HTML" -> "h_t_m_l"
                name.append('_')
            name.append(char.lower())
        else:
            name.append(char)
    return ''.join(name)

def take_by(iterable, count):
    """
    Returns elements from the input iterable by batches of N items.
    ('abcdefg', 3) -> ['a', 'b', 'c'], ['d', 'e', 'f'], ['g']
    """

    it = iter(iterable)
    while True:
        batch = list(islice(it, count))
        if len(batch) == 0:
            break

        yield batch

def str_to_bool(s):
    t = s.lower()
    if t in {'true', '1', 'ok', 'yes', 'y'}:
        return True
    elif t in {'false', '0', 'no', 'n'}:
        return False
    else:
        raise ValueError("Can't convert value '%s' to bool" % s)
