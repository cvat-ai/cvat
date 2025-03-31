# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import defaultdict
from typing import Callable, Dict, TypedDict

from cvat.apps.engine.models import Job, LabeledTrack, ShapeType
from cvat.apps.engine.utils import defaultdict_to_regular

from .util import linear_sort_shapes


class _CountableShape(TypedDict):
    frame: int
    outside: bool


class _CountableTrack(TypedDict):
    type: ShapeType
    id: int
    label_id: int
    shapes: list[_CountableShape]


class TracksCounter:
    """
    The class implements counting of VISIBLE shapes in tracks.
    """

    def __init__(self):
        self._tracks_per_job: Dict[int, Dict[int, _CountableTrack]] = {}
        self._stop_frames_per_job: Dict[int, int] = {}

    def _init_stop_frames(self):
        if self._tracks_per_job:
            self._stop_frames_per_job = dict(
                Job.objects.filter(id__in=self._tracks_per_job.keys()).values_list(
                    "id", "segment__stop_frame"
                )
            )
        else:
            self._stop_frames_per_job = {}

    def count_track_shapes(self, job_id: int, track_id: int):
        track = self._tracks_per_job.get(job_id, {}).get(track_id)
        manual = 0
        interpolated = 0

        if track is not None and track["shapes"]:
            prev_frame = track["shapes"][0]["frame"]
            prev_is_outside = track["shapes"][0]["outside"]

            if not prev_is_outside:
                manual += 1

            for shape in track["shapes"][1:]:
                frame = shape["frame"]
                is_outside = shape["outside"]
                assert (
                    frame > prev_frame
                ), f"{frame} > {prev_frame}. Track id: {track['id']}"  # Catch invalid tracks

                if not prev_is_outside:
                    # -1 means that current keyframe is not interpolated frame
                    interpolated += frame - prev_frame - 1
                if not is_outside:
                    manual += 1

                prev_is_outside = is_outside
                prev_frame = frame

            if not prev_is_outside and prev_frame < self._stop_frames_per_job[job_id]:
                interpolated += self._stop_frames_per_job[job_id] - prev_frame

        return {
            "manual": manual,
            "interpolated": interpolated,
        }

    def load_tracks_from_db(
        self,
        parent_labeledtrack_qs_filter: Callable,
        child_labeledtrack_qs_filter: Callable,
    ):
        unmerged_parent_tracks = (
            parent_labeledtrack_qs_filter(LabeledTrack.objects)
            .filter(parent=None)
            .values_list(
                "job_id",
                "label_id",
                "shape__type",
                "id",
                "shape__frame",
                "shape__outside",
            )
            .order_by("job_id", "label_id", "shape__type", "id", "shape__frame")
        )

        unmerged_child_tracks = (
            child_labeledtrack_qs_filter(LabeledTrack.objects)
            .exclude(parent=None)
            .values_list(
                "parent_id",
                "shape__frame",
                "shape__outside",
            )
            .order_by("parent_id", "shape__frame")
        )

        i = 0
        tracks_per_job = defaultdict(lambda: {})
        tracks_per_id = {}
        rows_count = len(unmerged_parent_tracks)
        while i < rows_count:
            row = unmerged_parent_tracks[i]
            [job_id, label_id, track_type, track_id] = row[0:4]

            if track_type == str(ShapeType.SKELETON):
                tracks_per_id[track_id] = {
                    "type": track_type,
                    "id": track_id,
                    "label_id": label_id,
                    "shapes": [],  # will be filled further from its elements
                }
                tracks_per_job[job_id][track_id] = tracks_per_id[track_id]
                while i < rows_count and unmerged_parent_tracks[i][3] == track_id:
                    # go to next track
                    i += 1
            else:
                tracks_per_id[track_id] = {
                    "type": track_type,
                    "id": track_id,
                    "label_id": label_id,
                    "shapes": [],
                }
                tracks_per_job[job_id][track_id] = tracks_per_id[track_id]

                while i < rows_count and unmerged_parent_tracks[i][3] == track_id:
                    tracks_per_id[track_id]["shapes"].append(
                        {
                            "frame": unmerged_parent_tracks[i][4],
                            "outside": unmerged_parent_tracks[i][5],
                        }
                    )
                    i += 1

        element_shapes_per_parent = defaultdict(
            lambda: defaultdict(
                lambda: {
                    "frame": None,
                    "outside": True,
                }
            )
        )

        for row in unmerged_child_tracks:
            [parent_id, frame, outside] = row
            element_shapes = element_shapes_per_parent[parent_id]
            element_shapes[frame]["frame"] = frame
            if not outside:
                element_shapes[frame]["outside"] = False

        for parent_id, element_shapes in element_shapes_per_parent.items():
            tracks_per_id[parent_id]["shapes"] = linear_sort_shapes(element_shapes.values())

        self._tracks_per_job = defaultdict_to_regular(tracks_per_job)
        self._init_stop_frames()

    def load_tracks_from_job(self, job_id: int, job_tracks: list):
        transformed_tracks = {}
        for track in job_tracks:
            if not track.get("shapes", []) and not track.get("elements", []):
                # track misses any shapes and elements
                continue

            track_type = (
                str(ShapeType.SKELETON) if track.get("elements", []) else track["shapes"][0]["type"]
            )
            if track_type == str(ShapeType.SKELETON):
                # skeleton has keyframe if any of its elements have keyframe
                # keyframe is not outside if any of its elements is not outside
                track_shapes = defaultdict(lambda: {"frame": None, "outside": True})
                skeleton_elements = track.get("elements", [])
                for element_track in skeleton_elements:
                    for element_shape in element_track.get("shapes", []):
                        element_frame = element_shape["frame"]
                        track_shapes[element_frame]["frame"] = element_frame
                        if not element_shape["outside"]:
                            track_shapes[element_frame]["outside"] = False

                transformed_tracks[track["id"]] = {
                    "id": track["id"],
                    "type": track_type,
                    "label_id": track["label_id"],
                    "shapes": linear_sort_shapes(defaultdict_to_regular(track_shapes).values()),
                }
            else:
                transformed_tracks[track["id"]] = {
                    "id": track["id"],
                    "type": track_type,
                    "label_id": track["label_id"],
                    "shapes": linear_sort_shapes(
                        {
                            "frame": shape["frame"],
                            "outside": shape["outside"],
                        }
                        for shape in track["shapes"]
                    ),
                }

            self._tracks_per_job = {job_id: transformed_tracks}
            self._init_stop_frames()
