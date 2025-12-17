from collections.abc import Callable

import numpy as np
import numpy.typing as npt

import math
from unittest import TestCase
import matplotlib.pyplot as plt


def distance_max(v1: npt.NDArray, v2: npt.NDArray) -> float | npt.NDArray:
    """L-infinity norm (Chebyshev distance).

    Returns the maximum absolute difference across all dimensions.
    Example: distance_max([1, 2, 3], [4, 5, 6]) = max(|1-4|, |2-5|, |3-6|) = 3
    """
    return np.linalg.norm(v1 - v2, ord=np.inf, axis=-1)

def distance_l1(v1: npt.NDArray, v2: npt.NDArray) -> float | npt.NDArray:
    """L1 norm (Manhattan distance).

    Returns the sum of absolute differences across all dimensions.
    Example: distance_l1([1, 2, 3], [4, 5, 6]) = |1-4| + |2-5| + |3-6| = 9
    """
    return np.linalg.norm(v1 - v2, ord=1, axis=-1)

def distance_l2(v1: npt.NDArray, v2: npt.NDArray) -> float | npt.NDArray:
    """L2 norm (Euclidean distance).

    Returns the straight-line distance between two points in n-dimensional space.
    Example: distance_l2([0, 0], [3, 4]) = sqrt((0-3)^2 + (0-4)^2) = 5.0
    """
    return np.linalg.norm(v1 - v2, ord=2, axis=-1)


def choose_keyframes(
    shapes: npt.NDArray,
    distance: Callable[[npt.NDArray, npt.NDArray], float],
    threshold: float,
) -> list[int]:
    """Select minimal set of keyframes for track simplification.

    Uses an adaptive algorithm similar to Ramer-Douglas-Peucker to find
    the minimal set of keyframes needed to represent a track within a
    given error threshold using linear interpolation.

    Args:
        shapes: 2D array where shapes[i] is the n-dimensional vector for frame i
        distance: Function that computes distance between two vectors
        threshold: Maximum allowed interpolation error

    Returns:
        Sorted list of keyframe indices

    """
    if len(shapes) <= 2:
        return list(range(len(shapes)))

    def process_range(start: int, stop: int) -> list[int]:
        """Recursively find keyframes in a subrange [start, stop]."""
        # Base case: adjacent frames, both are keyframes
        if stop - start <= 1:
            return [start, stop]

        start_shape = shapes[start]
        stop_shape = shapes[stop]

        intermediate_frames = np.arange(start + 1, stop)
        actual_shapes = shapes[intermediate_frames]

        # Matrix-based linear interpolation using broadcasting
        # alpha shape: (n_frames,), start_shape/stop_shape: (n_dims,)
        # Result shape: (n_frames, n_dims)
        alpha = (intermediate_frames - start) / (stop - start)
        interpolated = start_shape + (stop_shape - start_shape) * alpha[:, np.newaxis]

        errors = distance(actual_shapes, interpolated)

        worst_idx = np.argmax(errors)
        max_error = errors[worst_idx]
        worst_frame = intermediate_frames[worst_idx]

        if max_error < threshold:
            return [start, stop]

        # Split at worst frame and recurse
        left_keyframes = process_range(start, worst_frame)
        right_keyframes = process_range(worst_frame, stop)

        # Merge results (worst_frame appears in both, so take left + right[1:])
        return left_keyframes + right_keyframes[1:]

    return process_range(0, len(shapes) - 1)


def visualize_keyframes(shapes: npt.NDArray, keyframes: list[int], title: str = "Keyframe Simplification"):
    """Visualize original shapes, keyframes, and interpolation.

    Args:
        shapes: 2D array of shape (n_frames, n_dims)
        keyframes: List of keyframe indices
        title: Plot title
    """
    n_dims = shapes.shape[1]

    # For 2D data, plot as scatter
    if n_dims == 2:
        plt.figure(figsize=(10, 6))

        # Plot all original shapes
        plt.plot(shapes[:, 0], shapes[:, 1], 'o-', alpha=0.3, label='Original', markersize=4)

        # Plot keyframes
        keyframe_shapes = shapes[keyframes]
        plt.plot(keyframe_shapes[:, 0], keyframe_shapes[:, 1], 'ro-',
                label='Keyframes', markersize=8, linewidth=2)

        # Plot interpolation
        interpolated = []
        for i in range(len(keyframes) - 1):
            start_idx = keyframes[i]
            stop_idx = keyframes[i + 1]
            n_points = stop_idx - start_idx + 1

            for j in range(n_points):
                alpha = j / (n_points - 1)
                interp = shapes[start_idx] * (1 - alpha) + shapes[stop_idx] * alpha
                interpolated.append(interp)

        interpolated = np.array(interpolated)
        plt.plot(interpolated[:, 0], interpolated[:, 1], 'g--',
                alpha=0.7, label='Interpolated', linewidth=2)

        plt.xlabel('X')
        plt.ylabel('Y')
        plt.title(f"{title}\n{len(shapes)} frames → {len(keyframes)} keyframes")
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.show()

    # For 1D or multi-dimensional data, plot each dimension over frame index
    else:
        fig, axes = plt.subplots(n_dims, 1, figsize=(12, 3 * n_dims))
        if n_dims == 1:
            axes = [axes]

        for dim in range(n_dims):
            ax = axes[dim]
            frame_indices = np.arange(len(shapes))

            # Plot original
            ax.plot(frame_indices, shapes[:, dim], 'o-', alpha=0.3,
                   label='Original', markersize=4)

            # Plot keyframes
            ax.plot(keyframes, shapes[keyframes, dim], 'ro',
                   label='Keyframes', markersize=8)

            # Plot interpolation
            interpolated = []
            interp_indices = []
            for i in range(len(keyframes) - 1):
                start_idx = keyframes[i]
                stop_idx = keyframes[i + 1]
                n_points = stop_idx - start_idx + 1

                for j in range(n_points):
                    alpha = j / (n_points - 1)
                    interp = shapes[start_idx, dim] * (1 - alpha) + shapes[stop_idx, dim] * alpha
                    interpolated.append(interp)
                    interp_indices.append(start_idx + j)

            ax.plot(interp_indices, interpolated, 'g--',
                   alpha=0.7, label='Interpolated', linewidth=2)

            ax.set_xlabel('Frame')
            ax.set_ylabel(f'Dimension {dim}')
            ax.legend()
            ax.grid(True, alpha=0.3)

        plt.suptitle(f"{title}\n{len(shapes)} frames → {len(keyframes)} keyframes")
        plt.tight_layout()
        plt.show()


class TestChooseKeyframes(TestCase):
    """Tests for keyframe selection algorithm"""

    def test_straight_line_no_simplification(self):
        """Test that straight line motion keeps only endpoints"""
        shapes = np.array([[float(i), 0.0] for i in range(11)])
        keyframes = choose_keyframes(shapes, distance_max, threshold=0.1)
        self.assertEqual(keyframes, [0, 10])
        visualize_keyframes(shapes, keyframes, "Straight Line Motion")

    def test_constant_position(self):
        """Test that stationary object keeps only endpoints"""
        shapes = np.array([[5.0, 5.0] for _ in range(10)])
        keyframes = choose_keyframes(shapes, distance_max, threshold=0.1)
        self.assertEqual(keyframes, [0, 9])

    def test_sudden_direction_change(self):
        """Test that sudden direction change creates keyframe"""
        shapes = np.array([
            [float(i), 0.0] if i < 2 else [2.0, float(i - 2)]
            for i in range(5)
        ])
        keyframes = choose_keyframes(shapes, distance_max, threshold=0.5)

        self.assertIn(0, keyframes)
        self.assertIn(4, keyframes)
        # Should include the turning point
        self.assertTrue(1 in keyframes or 2 in keyframes)

    def test_circular_motion(self):
        """Test circular motion requires multiple keyframes"""
        shapes = np.array([
            [math.cos((i / 8) * (math.pi / 2)) * 10, math.sin((i / 8) * (math.pi / 2)) * 10]
            for i in range(9)
        ])
        keyframes = choose_keyframes(shapes, distance_max, threshold=1.0)
        self.assertGreater(len(keyframes), 2)
        visualize_keyframes(shapes, keyframes, "Circular Motion")

    def test_high_threshold_simplifies_more(self):
        """Test that higher threshold results in fewer keyframes"""
        shapes = np.array([
            [float(i), math.sin(i * 0.3) * 10]
            for i in range(17)
        ])
        keyframes_strict = choose_keyframes(shapes, distance_max, threshold=0.5)
        keyframes_relaxed = choose_keyframes(shapes, distance_max, threshold=2.0)

        self.assertLessEqual(len(keyframes_relaxed), len(keyframes_strict))
        visualize_keyframes(shapes, keyframes_strict, "Sine Wave (threshold=0.5)")
        visualize_keyframes(shapes, keyframes_relaxed, "Sine Wave (threshold=2.0)")

    def test_high_dimensional_track(self):
        """Test algorithm works with high-dimensional vectors (bbox with rotation)"""
        shapes = np.array([
            [
                float(i) * 10,  # x
                float(i) * 5,  # y
                100.0 + math.sin(i * 0.2) * 5,  # width oscillates
                80.0 + math.cos(i * 0.2) * 3,  # height oscillates
                i * 2.0,  # rotation
            ]
            for i in range(20)
        ])
        keyframes = choose_keyframes(shapes, distance_max, threshold=2.0)

        # Should have more than just endpoints due to oscillation
        self.assertGreater(len(keyframes), 2)
        self.assertIn(0, keyframes)
        self.assertIn(19, keyframes)
        visualize_keyframes(shapes, keyframes, "5D BBox Track")

    def test_polygon_with_many_points(self):
        """Test algorithm works with polygon (many coordinates)"""
        base = np.array([0.0, 0.0, 10.0, 0.0, 10.0, 10.0, 0.0, 10.0])
        shapes = np.array([
            base + np.array([i * 2.0] * 8) + math.sin(i * 0.3) * 2
            for i in range(10)
        ])
        keyframes = choose_keyframes(shapes, distance_l2, threshold=5.0)

        self.assertGreaterEqual(len(keyframes), 2)
        self.assertIn(0, keyframes)
        self.assertIn(9, keyframes)

    def test_different_distance_functions(self):
        """Test that different distance functions may give different results"""
        shapes = np.array([
            [float(i), float(i) + 0.3 * (i - 5) ** 2]
            for i in range(11)
        ])
        keyframes_max = choose_keyframes(shapes, distance_max, threshold=1.0)
        keyframes_l1 = choose_keyframes(shapes, distance_l1, threshold=1.0)
        keyframes_l2 = choose_keyframes(shapes, distance_l2, threshold=1.0)

        # All should at least include endpoints
        for keyframes in [keyframes_max, keyframes_l1, keyframes_l2]:
            self.assertIn(0, keyframes)
            self.assertIn(10, keyframes)

    def test_minimum_three_frames(self):
        """Test with minimum number of frames"""
        shapes = np.array([[float(i), float(i)] for i in range(3)])
        keyframes = choose_keyframes(shapes, distance_max, threshold=0.1)

        self.assertIn(0, keyframes)
        self.assertIn(2, keyframes)

    def test_two_frames_only(self):
        """Test with only two frames"""
        shapes = np.array([[float(i), float(i)] for i in range(2)])
        keyframes = choose_keyframes(shapes, distance_max, threshold=0.1)
        self.assertEqual(keyframes, [0, 1])
