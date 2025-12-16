from collections.abc import Callable
from typing import TypeAlias

Vector: TypeAlias = list[float]

def distance_max(v1: Vector, v2: Vector) -> float:
    return max(abs(s1 - s2) for s1, s2 in zip(v1, v2, strict=True))

def distance_l1(v1: Vector, v2: Vector) -> float:
    return sum(abs(s1 - s2) for s1, s2 in zip(v1, v2, strict=True))

def distance_l2(v1: Vector, v2: Vector) -> float:
    return sum((s1 - s2) ** 2 for s1, s2 in zip(v1, v2, strict=True)) ** 0.5

def lerp(s1: float, s2: float, alpha: float) -> float:
    return s1 * (1 - alpha) + s2 * alpha

def lerp_vector(v1: Vector, v2: Vector, alpha: float) -> Vector:
    return [lerp(s1, s2, alpha) for s1, s2 in zip(v1, v2, strict=True)]

def choose_keyframes(
    frames: range,
    shape: Callable[[int], Vector],
    distance: Callable[[Vector, Vector], float],
    threshold: float,
) -> list[int]:
    assert frames.step == 1

    keyframes = set()
    remaining_subranges = []

    def add_endpoints(sr: range):
        keyframes.add(sr.start)
        keyframes.add(sr.stop - 1)

        if len(sr) > 2:
            remaining_subranges.append(sr)

    add_endpoints(frames)

    def rating(index: int) -> float:
        alpha = (index - subrange.start) / (subrange.stop - 1 - subrange.start)
        interpolated_shape = lerp_vector(shape(subrange.start), shape(subrange.stop - 1), alpha)
        return distance(shape(index), interpolated_shape)

    while remaining_subranges:
        subrange = remaining_subranges.pop()

        worst_frame = max(subrange[1:-1], key=rating)
        if rating(worst_frame) >= threshold:
            add_endpoints(range(subrange.start, worst_frame + 1))
            add_endpoints(range(worst_frame, subrange.stop))

    return sorted(keyframes)
