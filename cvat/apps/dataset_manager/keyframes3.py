# --- Unit tests for Visvalingam-Whyatt algorithm ---
import unittest

import numpy as np
from collections.abc import Callable
from typing import List
import matplotlib.pyplot as plt


def visvalingam_whyatt(points: np.ndarray, area_threshold: float) -> List[int]:
    """
    Simplifies a polyline using the Visvalingam-Whyatt algorithm.
    Args:
        points: (N, D) array of points (2D or higher)
        area_threshold: minimum area of triangle to keep a point
    Returns:
        List of indices of key points (sorted)
    """
    n_points = len(points)
    if n_points <= 2:
        return list(range(n_points))

    # Each entry: (area, index)
    def triangle_area(a, b, c):
        ab = b - a
        ac = c - a
        if a.shape[-1] == 2:
            return 0.5 * np.abs(ab[0] * ac[1] - ab[1] * ac[0])
        else:
            return 0.5 * np.linalg.norm(np.cross(ab, ac))

    indices = list(range(n_points))
    areas = [None] * n_points
    areas[0] = areas[-1] = float('inf')
    for i in range(1, n_points - 1):
        areas[i] = triangle_area(points[i - 1], points[i], points[i + 1])

    while True:
        removable_areas = areas[1:-1]
        if not removable_areas:
            break
        min_area = min(removable_areas)
        if min_area >= area_threshold:
            break
        idx = areas.index(min_area)
        # Remove point with smallest area
        indices.pop(idx)
        points = np.delete(points, idx, axis=0)
        areas.pop(idx)
        # Recompute areas for neighbors
        if 1 <= idx - 1 < len(points) - 1:
            areas[idx - 1] = triangle_area(points[idx - 2], points[idx - 1], points[idx])
        if 1 <= idx < len(points) - 1:
            areas[idx] = triangle_area(points[idx - 1], points[idx], points[idx + 1])

    return indices

def visualize_keyframes_vw(points: np.ndarray, keyframes: List[int], title: str = "VW Simplification"):
    import os
    from pathlib import Path
    figures_dir = Path(__file__).parent / "keyframes3_figures"
    figures_dir.mkdir(exist_ok=True)
    n_dims = points.shape[1]
    filename_base = title.replace(" ", "_").replace("→", "to").replace("/", "_")
    if n_dims == 2:
        plt.figure(figsize=(10, 6))
        plt.plot(points[:, 0], points[:, 1], 'o-', alpha=0.3, label='Original', markersize=4)
        keyframe_points = points[keyframes]
        plt.plot(keyframe_points[:, 0], keyframe_points[:, 1], 'ro-', label='Keyframes', markersize=8, linewidth=2)
        plt.xlabel('X')
        plt.ylabel('Y')
        plt.title(f"{title}\n{len(points)} points → {len(keyframes)} keyframes")
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        fig_path = figures_dir / f"{filename_base}_2d.png"
        plt.savefig(fig_path)
        plt.close()
    else:
        fig, axes = plt.subplots(n_dims, 1, figsize=(12, 3 * n_dims))
        if n_dims == 1:
            axes = [axes]
        for dim in range(n_dims):
            ax = axes[dim]
            frame_indices = np.arange(len(points))
            ax.plot(frame_indices, points[:, dim], 'o-', alpha=0.3, label='Original', markersize=4)
            ax.plot(keyframes, points[keyframes, dim], 'ro-', label='Keyframes', markersize=8)
            ax.set_xlabel('Frame')
            ax.set_ylabel(f'Dimension {dim}')
            ax.legend()
            ax.grid(True, alpha=0.3)
        plt.suptitle(f"{title}\n{len(points)} points → {len(keyframes)} keyframes")
        plt.tight_layout()
        fig_path = figures_dir / f"{filename_base}_{n_dims}d.png"
        plt.savefig(fig_path)
        plt.close()



class TestVisvalingamWhyatt(unittest.TestCase):
    def test_convex_irregular_polygon(self):
        polygon = np.array([
            [0.0, 0.0],
            [2.0, 1.0],
            [4.0, 0.5],
            [5.0, 3.0],
            [3.5, 5.0],
            [1.5, 4.5],
            [0.5, 3.0],
            [0.0, 0.0],
        ])
        keyframes = visvalingam_whyatt(polygon, area_threshold=1.0)
        self.assertIn(0, keyframes)
        self.assertIn(len(polygon) - 1, keyframes)
        visualize_keyframes_vw(polygon, keyframes, "VW Convex Irregular Polygon 2D")

    def test_circle_many_points_threshold_01(self):
        self._circle_many_points(threshold=0.1)

    def test_circle_many_points_threshold_05(self):
        self._circle_many_points(threshold=0.5)

    def test_circle_many_points_threshold_102(self):
        self._circle_many_points(threshold=0.7)

    def test_circle_many_points_threshold_103(self):
        self._circle_many_points(threshold=0.3)

    def test_circle_many_points_threshold_10(self):
        self._circle_many_points(threshold=1.0)

    def test_circle_many_points_threshold_20(self):
        self._circle_many_points(threshold=2.0)

    def _circle_many_points(self, threshold):
        num_points = 100
        radius = 5.0
        center = np.array([10.0, 10.0])
        angles = np.linspace(0, 2 * np.pi, num_points, endpoint=False)
        circle = np.stack([
            center[0] + radius * np.cos(angles),
            center[1] + radius * np.sin(angles)
        ], axis=1)
        shapes = np.vstack([circle, circle[0]])
        keyframes = visvalingam_whyatt(shapes, area_threshold=threshold)
        self.assertIn(0, keyframes)
        self.assertIn(len(shapes) - 1, keyframes)
        visualize_keyframes_vw(shapes, keyframes, f"VW Circle Many Points 2D (threshold={threshold})")

    def test_straight_line(self):
        shapes = np.array([[float(i), 0.0] for i in range(11)])
        keyframes = visvalingam_whyatt(shapes, area_threshold=0.01)
        self.assertEqual(keyframes, [0, 10])
        visualize_keyframes_vw(shapes, keyframes, "VW Straight Line")

    def test_constant_position(self):
        shapes = np.array([[5.0, 5.0] for _ in range(10)])
        keyframes = visvalingam_whyatt(shapes, area_threshold=0.01)
        self.assertEqual(keyframes, [0, 9])
        visualize_keyframes_vw(shapes, keyframes, "VW Constant Position")

    def test_sudden_direction_change(self):
        shapes = np.array([
            [float(i), 0.0] if i < 2 else [2.0, float(i - 2)]
            for i in range(5)
        ])
        keyframes = visvalingam_whyatt(shapes, area_threshold=0.01)
        self.assertIn(0, keyframes)
        self.assertIn(4, keyframes)
        self.assertTrue(1 in keyframes or 2 in keyframes)
        visualize_keyframes_vw(shapes, keyframes, "VW Sudden Direction Change")

    def test_high_dimensional_track(self):
        shapes = np.array([
            [
                float(i) * 10,  # x
                float(i) * 5,  # y
                100.0 + np.sin(i * 0.2) * 5,  # width oscillates
                80.0 + np.cos(i * 0.2) * 3,  # height oscillates
                i * 2.0,  # rotation
            ]
            for i in range(20)
        ])
        keyframes = visvalingam_whyatt(shapes, area_threshold=2.0)
        self.assertGreater(len(keyframes), 2)
        self.assertIn(0, keyframes)
        self.assertIn(19, keyframes)
        visualize_keyframes_vw(shapes, keyframes, "VW 5D BBox Track")

    def test_polygon_with_many_points(self):
        base = np.array([0.0, 0.0, 10.0, 0.0, 10.0, 10.0, 0.0, 10.0])
        shapes = np.array([
            base + np.array([i * 2.0] * 8) + np.sin(i * 0.3) * 2
            for i in range(10)
        ])
        keyframes = visvalingam_whyatt(shapes, area_threshold=5.0)
        self.assertGreaterEqual(len(keyframes), 2)
        self.assertIn(0, keyframes)
        self.assertIn(9, keyframes)
        visualize_keyframes_vw(shapes, keyframes, "VW Polygon Many Points")