
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from itertools import groupby


def find_instances(instance_anns):
    instance_anns = sorted(instance_anns, key=lambda a: a.group)
    ann_groups = []
    for g_id, group in groupby(instance_anns, lambda a: a.group):
        if not g_id:
            ann_groups.extend(([a] for a in group))
        else:
            ann_groups.append(list(group))

    return ann_groups

def find_group_leader(group):
    return max(group, key=lambda x: x.get_area())

def compute_bbox(annotations):
    boxes = [ann.get_bbox() for ann in annotations]
    x0 = min((b[0] for b in boxes), default=0)
    y0 = min((b[1] for b in boxes), default=0)
    x1 = max((b[0] + b[2] for b in boxes), default=0)
    y1 = max((b[1] + b[3] for b in boxes), default=0)
    return [x0, y0, x1 - x0, y1 - y0]