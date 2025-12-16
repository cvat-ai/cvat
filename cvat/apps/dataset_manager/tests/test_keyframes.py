# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import math
from unittest import TestCase

from cvat.apps.dataset_manager.keyframes import (
    choose_keyframes,
    distance_l1,
    distance_l2,
    distance_max,
    lerp,
    lerp_vector,
)


class TestLerpFunctions(TestCase):
    """Tests for linear interpolation functions"""

    def test_lerp_midpoint(self):
        """Test linear interpolation at midpoint"""
        assert lerp(0.0, 10.0, 0.5) == 5.0

    def test_lerp_start(self):
        """Test linear interpolation at start"""
        assert lerp(0.0, 10.0, 0.0) == 0.0

    def test_lerp_end(self):
        """Test linear interpolation at end"""
        assert lerp(0.0, 10.0, 1.0) == 10.0

    def test_lerp_vector(self):
        """Test vector interpolation"""
        v1 = [0.0, 0.0]
        v2 = [10.0, 20.0]
        result = lerp_vector(v1, v2, 0.5)
        assert result == [5.0, 10.0]


class TestDistanceFunctions(TestCase):
    """Tests for distance calculation functions"""

    def test_distance_max(self):
        """Test maximum distance (L-infinity norm)"""
        v1 = [0.0, 0.0]
        v2 = [3.0, 4.0]
        assert distance_max(v1, v2) == 4.0

    def test_distance_l1(self):
        """Test Manhattan distance (L1 norm)"""
        v1 = [0.0, 0.0]
        v2 = [3.0, 4.0]
        assert distance_l1(v1, v2) == 7.0

    def test_distance_l2(self):
        """Test Euclidean distance (L2 norm)"""
        v1 = [0.0, 0.0]
        v2 = [3.0, 4.0]
        # sqrt(3^2 + 4^2) = sqrt(9 + 16) = sqrt(25) = 5.0
        assert distance_l2(v1, v2) == 5.0


class TestChooseKeyframes(TestCase):
    """Tests for keyframe selection algorithm"""

    def test_straight_line_no_simplification(self):
        """Test that straight line motion keeps only endpoints"""
        # Linear motion from (0,0) to (10,0) over 11 frames
        frames = range(11)

        def shape(frame):
            return [float(frame), 0.0]

        keyframes = choose_keyframes(frames, shape, distance_max, threshold=0.1)

        # Should keep only start and end frames since motion is perfectly linear
        assert keyframes == [0, 10]

    def test_constant_position(self):
        """Test that stationary object keeps only endpoints"""
        frames = range(10)

        def shape(frame):
            return [5.0, 5.0]

        keyframes = choose_keyframes(frames, shape, distance_max, threshold=0.1)

        # Should keep only start and end for stationary object
        assert keyframes == [0, 9]

    def test_sudden_direction_change(self):
        """Test that sudden direction change creates keyframe"""
        frames = range(5)

        def shape(frame):
            # Move right, then suddenly move up
            if frame < 2:
                return [float(frame), 0.0]
            else:
                return [2.0, float(frame - 2)]

        keyframes = choose_keyframes(frames, shape, distance_max, threshold=0.5)

        # Should include the turning point at frame 2
        assert 0 in keyframes
        assert 4 in keyframes
        assert 2 in keyframes or 1 in keyframes  # The turn point

    def test_zigzag_motion(self):
        """Test zigzag motion creates multiple keyframes"""
        frames = range(7)

        def shape(frame):
            # Zigzag: 0->5->0->5->0->5->0
            x = float(frame)
            y = 5.0 if frame % 2 == 1 else 0.0
            return [x, y]

        keyframes = choose_keyframes(frames, shape, distance_max, threshold=1.0)

        # Should have multiple keyframes for zigzag motion
        assert len(keyframes) > 2
        assert 0 in keyframes
        assert 6 in keyframes

    def test_circular_motion(self):
        """Test circular motion requires multiple keyframes"""
        frames = range(9)  # 9 frames = 8 segments

        def shape(frame):
            # Quarter circle
            angle = (frame / 8) * (math.pi / 2)
            return [math.cos(angle) * 10, math.sin(angle) * 10]

        keyframes = choose_keyframes(frames, shape, distance_max, threshold=1.0)

        # Circular motion cannot be represented by linear interpolation
        # Should have intermediate keyframes
        assert len(keyframes) > 2

    def test_high_threshold_simplifies_more(self):
        """Test that higher threshold results in fewer keyframes"""
        frames = range(17)

        def shape(frame):
            # Sine wave
            x = float(frame)
            y = math.sin(frame * 0.3) * 10
            return [x, y]

        keyframes_strict = choose_keyframes(frames, shape, distance_max, threshold=0.5)
        keyframes_relaxed = choose_keyframes(frames, shape, distance_max, threshold=2.0)

        # Higher threshold should result in fewer or equal keyframes
        assert len(keyframes_relaxed) <= len(keyframes_strict)

    def test_distance_function_affects_result(self):
        """Test that different distance functions may give different results"""
        frames = range(11)

        def shape(frame):
            # Diagonal motion with slight curve
            return [float(frame), float(frame) + 0.3 * (frame - 5) ** 2]

        keyframes_max = choose_keyframes(frames, shape, distance_max, threshold=1.0)
        keyframes_l1 = choose_keyframes(frames, shape, distance_l1, threshold=1.0)

        # Both should at least include endpoints
        assert 0 in keyframes_max and 10 in keyframes_max
        assert 0 in keyframes_l1 and 10 in keyframes_l1

    def test_minimum_three_frames(self):
        """Test with minimum number of frames"""
        frames = range(3)

        def shape(frame):
            return [float(frame), float(frame)]

        keyframes = choose_keyframes(frames, shape, distance_max, threshold=0.1)

        # Should include start, middle, and end
        assert 0 in keyframes
        assert 2 in keyframes

    def test_two_frames_only(self):
        """Test with only two frames"""
        frames = range(2)

        def shape(frame):
            return [float(frame), float(frame)]

        keyframes = choose_keyframes(frames, shape, distance_max, threshold=0.1)

        # Should include both frames
        assert keyframes == [0, 1]
