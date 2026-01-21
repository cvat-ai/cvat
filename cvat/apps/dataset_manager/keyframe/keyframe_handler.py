from dataclasses import dataclass
import enum
import os
from typing import Any, Optional

from keyframes2 import distance_l1, distance_l2, distance_max, choose_keyframes
import numpy as np
from cvat_sdk.core.client import Client, Config
from cvat_sdk import models

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
    def __init__(self) -> None:
        self.keyframes = []

    def prepare_keyframes_from_shapes(self, shapes) -> list[Keyframe]:
        """Convert shapes to Keyframe objects."""
        keyframes = []
        for shape in shapes:
            kf = Keyframe(
                frame_id=shape.frame,
                position=np.array(shape.points[:3], dtype=float),
                rotation=np.array(shape.points[3:6], dtype=float),
                scale=np.array(shape.points[6:9], dtype=float),
            )
            keyframes.append(kf)
        return keyframes

    def get_simplified_frame_ids(self, shapes, fields: list[KeyframesField]) -> set[int]:
        """Get set of frame_ids after simplification."""
        keyframes = self.prepare_keyframes_from_shapes(shapes)
        simplified = self.simplifying(fields=fields, keyframes=keyframes)
        return set(kf.frame_id for kf in simplified)

    def prepare_tracked_shape_requests(self, shapes, frame_ids: set[int]):
        """Convert shapes to TrackedShapeRequest for given frame_ids."""
        requests = []
        for shape in shapes:
            if shape.frame in frame_ids:
                requests.append(
                    models.TrackedShapeRequest(
                        frame=shape.frame,
                        outside=shape.outside,
                        occluded=shape.occluded,
                        z_order=shape.z_order,
                        points=shape.points,
                        rotation=shape.rotation,
                        type=shape.type,
                        attributes=shape.attributes if hasattr(shape, 'attributes') else []
                    )
                )
        return requests

    def build_updated_track(self, track, updated_shapes):
        """Create a new LabeledTrackRequest with updated shapes."""
        return models.LabeledTrackRequest(
            frame=track.frame,
            label_id=track.label_id,
            group=track.group,
            source=track.source,
            shapes=updated_shapes,
            attributes=track.attributes,
            elements=track.elements if hasattr(track, 'elements') else []
        )

    def simplifying(self, fields: list[KeyframesField], keyframes: list[Keyframe]) -> list[Keyframe]:
        keyframe_indices = set()
        for field in fields:
            if field.threshold > 0:
                arr = np.array([getattr(kf, field.keyframe_field.value) for kf in keyframes])
                indices = set(choose_keyframes(arr, DISTANCE_FUNCTIONS[field.method], field.threshold))
                keyframe_indices.update(indices)
        return [keyframes[i] for i in sorted(keyframe_indices)]

    def simplifying_job(self, job_id: int, fields: list[KeyframesField], to_job_id: Optional[int] = None) -> None:
        """
        Automatically downloads annotations from CVAT API, simplifies keyframes,
        and uploads updated annotations back.

        Args:
            job_id: Job ID in CVAT
            fields: List of fields with simplification settings
            to_job_id: Optional target job ID to upload simplified annotations
        """

        cvat_url = os.getenv("CVAT_HOST", "http://localhost:7000")
        username = os.getenv("CVAT_USERNAME", "admin")
        password = os.getenv("CVAT_PASSWORD", "12qwaszx")

        print(f"Connecting to CVAT API: {cvat_url}")
        client = Client(url=cvat_url, config=Config(verify_ssl=False))
        client.login((username, password))

        try:
            print(f"Retrieving job {job_id}...")
            job = client.jobs.retrieve(job_id)

            print("Downloading annotations...")
            annotations_data = job.get_annotations()

            print("Annotations downloaded:", annotations_data)

            print(f"Received tracks: {len(annotations_data.tracks)}")
            print(f"Received shapes: {len(annotations_data.shapes)}")
            print(f"Received tags: {len(annotations_data.tags)}")

            if not annotations_data.tracks:
                print("No tracks to process")
                return

            # Process each track
            updated_tracks = []
            for track in annotations_data.tracks:
                shapes = track.shapes
                if not shapes:
                    updated_tracks.append(track)
                    continue

                print(f"\nProcessing track {track.id} with {len(shapes)} frames")

                simplified_frame_ids = self.get_simplified_frame_ids(shapes, fields)
                print(f"Simplified from {len(shapes)} to {len(simplified_frame_ids)} frames")
                updated_shapes = self.prepare_tracked_shape_requests(shapes, simplified_frame_ids)
                updated_track = self.build_updated_track(track, updated_shapes)
                updated_tracks.append(updated_track)

            updated_annotations = models.LabeledDataRequest(
                version=annotations_data.version,
                tags=annotations_data.tags,
                shapes=annotations_data.shapes,
                tracks=updated_tracks
            )

            job.set_annotations(updated_annotations)
            print("✓ Annotations successfully updated!")

        finally:
            client.logout()
            print("Disconnecting from CVAT API")


import argparse

def parse_fields(fields_args):
    """
    Parse fields argument from CLI into list of KeyframesField.
    Example: --field position,5.1,l2 --field rotation,0.0,l_inf
    """
    fields = []
    for arg in fields_args:
        try:
            keyframe_field, threshold, method = arg.split(",")
            keyframe_field_enum = KeyframeField[keyframe_field.strip().upper()]
            # Resolve method by value (case-insensitive)
            method_value = method.strip().lower()
            try:
                method_enum = next(m for m in KeyframeSimplifyingMethod if m.value == method_value)
            except StopIteration:
                raise ValueError(f"Unknown method value: {method}")
            fields.append(KeyframesField(
                keyframe_field=keyframe_field_enum,
                threshold=float(threshold),
                method=method_enum
            ))
        except Exception as e:
            raise argparse.ArgumentTypeError(f"Invalid --field value '{arg}': {e}")
    return fields

def main():
    parser = argparse.ArgumentParser(description="Keyframe simplification CLI for CVAT jobs.")
    parser.add_argument("--job-id", type=int, required=True, help="CVAT job ID to process")
    parser.add_argument(
        "--field", action="append", required=True,
        help="Keyframe simplification field in the format: field,threshold,method. Example: --field position,5.1,l2 --field rotation,0.0,l_inf"
    )

    args = parser.parse_args()
    fields = parse_fields(args.field)

    print(f"Starting automatic processing for job_id={args.job_id}")
    KeyframeHandler().simplifying_job(args.job_id, fields, args.to_job_id)


if __name__ == "__main__":
    main()
