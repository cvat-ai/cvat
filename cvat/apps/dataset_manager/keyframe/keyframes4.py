import numpy as np
import numpy.typing as npt
from typing import List
import matplotlib.pyplot as plt
import unittest


def iterative_rdp_l2(points: npt.NDArray, num_keyframes: int) -> List[int]:
    n = len(points)
    if num_keyframes >= n:
        return list(range(n))
    if num_keyframes <= 2:
        return [0, n-1]

    keyframes = list(range(n))
    points = np.asarray(points)

    while len(keyframes) > num_keyframes:
        a_idx = np.array(keyframes[:-2])
        b_idx = np.array(keyframes[1:-1])
        c_idx = np.array(keyframes[2:])

        denom = (c_idx - a_idx)
        denom_safe = np.where(denom != 0, denom, 1)
        t = (b_idx - a_idx) / denom_safe
        t = np.where(denom != 0, t, 0.5)

        interp = points[a_idx] + (points[c_idx] - points[a_idx]) * t[:, None]
        errors = np.linalg.norm(points[b_idx] - interp, axis=1)

        errors_full = np.full(len(keyframes), np.inf)
        errors_full[1:-1] = errors

        min_idx = np.argmin(errors_full[1:-1]) + 1
        keyframes.pop(min_idx)
    return sorted(keyframes)

def visualize_keyframes_iterative_rdp(points: npt.NDArray, keyframes: List[int], title: str = "Iterative RDP L2"):
    import os
    from pathlib import Path
    figures_dir = Path(__file__).parent / "keyframes4_figures"
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



class TestIterativeRDPL2(unittest.TestCase):
    def test_curve_with_bend(self):
        x = np.linspace(0, 10, 50)
        y = np.sin(x) + 0.1 * np.random.randn(50)
        points = np.stack([x, y], axis=1)
        for k in [2, 5, 10, 20]:
            keyframes = iterative_rdp_l2(points, k)
            self.assertEqual(len(keyframes), k)
            self.assertIn(0, keyframes)
            self.assertIn(len(points) - 1, keyframes)
            visualize_keyframes_iterative_rdp(points, keyframes, f"Iterative RDP L2 Bend (k={k})")

    def test_circle_many_points(self):
        num_points = 100
        radius = 50.0
        center = np.array([100.0, 100.0])
        angles = np.linspace(0, 2 * np.pi, num_points, endpoint=False)
        circle = np.stack([
            center[0] + radius * np.cos(angles),
            center[1] + radius * np.sin(angles)
        ], axis=1)
        shapes = np.vstack([circle, circle[0]])
        for k in [2, 5, 10, 20]:
            keyframes = iterative_rdp_l2(shapes, k)
            self.assertEqual(len(keyframes), k)
            self.assertIn(0, keyframes)
            self.assertIn(len(shapes) - 1, keyframes)
            visualize_keyframes_iterative_rdp(shapes, keyframes, f"Iterative RDP L2 Circle r50 (k={k})")

    def test_minimum_two(self):
        points = np.array([[0, 0], [1, 1], [2, 0]])
        keyframes = iterative_rdp_l2(points, 2)
        self.assertEqual(keyframes, [0, 2])

if __name__ == "__main__":
    unittest.main()
