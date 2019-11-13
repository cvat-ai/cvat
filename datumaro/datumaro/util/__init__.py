
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os


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