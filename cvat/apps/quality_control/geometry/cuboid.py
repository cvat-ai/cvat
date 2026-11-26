# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Volumetric IoU for CVAT cuboids (THREE Euler XYZ, full side lengths).

Coordinates are translated and scaled per pair before clipping; tolerances are
dimensionless and independent of the units used by the annotation.
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass

import numpy as np
from scipy.spatial import ConvexHull
from scipy.spatial.transform import Rotation

_SIGNS = np.array(list(itertools.product((-1, 1), repeat=3)))
_FACES = ((0, 1, 3, 2), (4, 5, 7, 6), (0, 1, 5, 4), (2, 3, 7, 6), (0, 2, 6, 4), (1, 3, 7, 5))
_EPS = 64 * np.finfo(float).eps


@dataclass(frozen=True)
class CuboidGeometry:
    center: np.ndarray
    rotation: np.ndarray
    size: np.ndarray
    offsets: np.ndarray
    extent: np.ndarray

    @classmethod
    def from_points(cls, points) -> CuboidGeometry:
        values = np.asarray(points, dtype=float)
        if values.shape != (9,) or not np.isfinite(values).all():
            raise ValueError("A cuboid must contain nine finite coordinates")
        size = values[6:9].copy()
        if (size < 0).any():
            raise ValueError("Cuboid side lengths must be nonnegative")
        rotation = Rotation.from_euler("XYZ", values[3:6]).as_matrix()
        offsets = (_SIGNS * (size / 2)) @ rotation.T
        return cls(values[:3].copy(), rotation, size, offsets, np.abs(rotation) @ (size / 2))


def _clip(polygon: list[np.ndarray], axis: int, bound: float, direction: int):
    if not polygon:
        return []
    result = []
    previous = polygon[-1]
    previous_distance = direction * (previous[axis] - bound)
    for current in polygon:
        distance = direction * (current[axis] - bound)
        if (distance <= _EPS) != (previous_distance <= _EPS):
            # A crossing cannot have a zero denominator. Clamp only roundoff
            # introduced by classifying a vertex within the plane tolerance.
            t = np.clip(previous_distance / (previous_distance - distance), 0, 1)
            result.append(previous + t * (current - previous))
        if distance <= _EPS:
            result.append(current)
        previous, previous_distance = current, distance
    return result


def cuboid_iou(a: CuboidGeometry, b: CuboidGeometry) -> float:
    if (a.size == 0).any() or (b.size == 0).any():
        return 0.0
    delta = b.center - a.center
    if (np.abs(delta) >= a.extent + b.extent).any():
        return 0.0
    if (
        np.array_equal(a.size, b.size)
        and np.array_equal(a.rotation, b.rotation)
        and not delta.any()
    ):
        return 1.0

    scale = max(float(a.size.max()), float(b.size.max()))
    sizes = (a.size / scale, b.size / scale)
    centers = (np.zeros(3), delta / scale)
    vertices = (a.offsets / scale, b.offsets / scale + centers[1])
    rotations = (a.rotation, b.rotation)
    points = []
    for source, target in ((0, 1), (1, 0)):
        local_vertices = (vertices[source] - centers[target]) @ rotations[target]
        half_size = sizes[target] / 2
        for face in _FACES:
            polygon = [local_vertices[i] for i in face]
            for axis in range(3):
                polygon = _clip(polygon, axis, half_size[axis], 1)
                polygon = _clip(polygon, axis, -half_size[axis], -1)
            points.extend(p @ rotations[target].T + centers[target] for p in polygon)
        points.extend(
            p @ rotations[target].T + centers[target]
            for p in local_vertices
            if (np.abs(p) <= half_size + _EPS).all()
        )

    unique = []
    for point in points:
        if not any(np.max(np.abs(point - other)) <= _EPS for other in unique):
            unique.append(point)
    if len(unique) < 4:
        return 0.0
    points = np.asarray(unique)
    if np.linalg.matrix_rank(points - points[0], tol=_EPS) < 3:
        return 0.0
    # Unexpected Qhull failures must fail the report, not fabricate unmatched objects.
    intersection = float(ConvexHull(points).volume)
    volumes = [float(np.prod(size)) for size in sizes]
    if intersection > min(volumes) + _EPS:
        raise ArithmeticError("Cuboid intersection exceeds the smaller cuboid volume")
    intersection = min(intersection, *volumes)
    result = intersection / (sum(volumes) - intersection)
    # Exact overlap is reachable at threshold 1, including symmetric rotations.
    return 1.0 if abs(1 - result) <= _EPS else float(result)
