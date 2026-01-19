from dataclasses import dataclass
import enum
from typing import Any

from keyframes2 import distance_l1, distance_l2, distance_max, choose_keyframes
import numpy as np

Vector = np.ndarray[Any, np.dtype[np.float_]]

class KeyframeSimplifyingMethod(enum.Enum):
    L_INF = "l_inf"
    L1 = "l1"
    L2 = "l2"

DISTANCE_FUNCTIONS = {
    KeyframeSimplifyingMethod.L_INF: distance_max,
    KeyframeSimplifyingMethod.L1: distance_l1,
    KeyframeSimplifyingMethod.L2: distance_l2,
}


@dataclass
class Keyframe:
    frame_id: int
    position: Vector
    rotation: Vector
    scale: Vector

class KeyframeField(enum.Enum):
    POSITION = "position"
    ROTATION = "rotation"
    SCALE = "scale"

@dataclass
class KeyframesField:
    keyframe_field: KeyframeField
    threshold: float
    method: KeyframeSimplifyingMethod


class KeyframeHandler:
    def __init__(self, keyframes: list[Keyframe]) -> None:
        self.keyframes = keyframes

    def simplifying(self, fields: list[KeyframesField]) -> list[Keyframe]:
        keyframe_indices = set()
        for field in fields:
            if field.threshold > 0:
                arr = np.array([getattr(kf, field.keyframe_field.value) for kf in self.keyframes])
                indices = set(choose_keyframes(arr, DISTANCE_FUNCTIONS[field.method], field.threshold))
                keyframe_indices.update(indices)
        return [self.keyframes[i] for i in sorted(keyframe_indices)]


def test():
    import json
    from pathlib import Path

    json_path = Path(__file__).parent / "response_1768475652887.json"
    with open(json_path, "r") as f:
        data = json.load(f)

    track = data["tracks"][0]
    shapes = track["shapes"]

    keyframes = []
    for shape in shapes:
        kf = Keyframe(
            frame_id=shape["frame"],
            position=np.array(shape["points"][:3], dtype=float),
            rotation=np.array(shape["points"][3:6], dtype=float),
            scale=np.array(shape["points"][6:9], dtype=float),
        )
        keyframes.append(kf)

    handler = KeyframeHandler(keyframes=keyframes)
    fields = [
        KeyframesField(
            keyframe_field=KeyframeField.POSITION,
            threshold=1.1,
            method=KeyframeSimplifyingMethod.L2
        ),
        KeyframesField(
            keyframe_field=KeyframeField.ROTATION,
            threshold=0.0,
            method=KeyframeSimplifyingMethod.L_INF
        ),
        KeyframesField(
            keyframe_field=KeyframeField.SCALE,
            threshold=0.1,
            method=KeyframeSimplifyingMethod.L2
        ),
    ]
    simplified = handler.simplifying(fields=fields)

    print(f"Original frames: {[shape['frame'] for shape in shapes]}")
    print(f"Simplified frames: {[kf.frame_id for kf in simplified]}")


if __name__ == "__main__":
    test()