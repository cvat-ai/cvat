
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp


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