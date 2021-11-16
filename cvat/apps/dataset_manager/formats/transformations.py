# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import math
from itertools import chain

from datumaro.components.extractor import ItemTransform
import datumaro.components.annotation as datum_annotation

class RotatedBoxesToPolygons(ItemTransform):
    def _rotate_point(self, p, angle, cx, cy):
        [x, y] = p
        rx = cx + math.cos(angle) * (x - cx) - math.sin(angle) * (y - cy)
        ry = cy + math.sin(angle) * (x - cx) + math.cos(angle) * (y - cy)
        return rx, ry

    def transform_item(self, item):
        annotations = item.annotations[:]
        anns = [p for p in annotations if p.type == datum_annotation.AnnotationType.bbox and p.attributes['rotation']]
        for ann in anns:
            rotation = math.radians(ann.attributes['rotation'])
            x0, y0, x1, y1 = ann.points
            [cx, cy] = [(x0 + (x1 - x0) / 2), (y0 + (y1 - y0) / 2)]
            anno_points = list(chain.from_iterable(
                map(lambda p: self._rotate_point(p, rotation, cx, cy), [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
            ))

            annotations.remove(ann)
            annotations.append(datum_annotation.Polygon(anno_points,
                label=ann.label, attributes=ann.attributes, group=ann.group,
                z_order=ann.z_order))

        return item.wrap(annotations=annotations)
