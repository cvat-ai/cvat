# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
from collections import defaultdict
from copy import deepcopy
from typing import Callable, Iterable

from django.db import transaction
from django.db.models import Count, Value

from cvat.apps.engine.models import Job, LabeledImage, LabeledShape, LabeledTrack, ShapeType


def _linear_sort_shapes(shapes: Iterable) -> list:
    # as frame range is always has certain range
    # it allows us use efficient linear sorting algorithm
    min_frame = None
    max_frame = None
    d = {}
    for shape in shapes:
        frame = shape["frame"]
        d[frame] = shape
        min_frame = frame if min_frame is None else min(frame, min_frame)
        max_frame = frame if max_frame is None else max(frame, max_frame)

    sorted_shapes = []
    if max_frame is not None:
        for i in range(min_frame, max_frame + 1):
            if i in d:
                sorted_shapes.append(d[i])
    return sorted_shapes


def _make_defaultdict():
    return defaultdict(
        lambda: defaultdict(
            lambda: defaultdict(
                lambda: (
                    {
                        "shapes": 0,
                        "tracks": 0,
                        "manual": 0,
                        "interpolated": 0,
                    }
                )
            )
        )
    )


def _default_to_regular(d):
    if isinstance(d, defaultdict):
        d = {k: _default_to_regular(v) for k, v in d.items()}
    return d


class AnnotationsCounter:
    def __init__(self):
        # Datastructure is:
        # {
        #   [job_id]: {
        #     [label_id]: {
        #       [type]: {
        #           "shapes"?: 0,
        #           "tracks"?: 0,
        #           "manual"?: 0,
        #           "interpolated"?: 0,
        #       }
        #     }
        #   }
        # }
        # Note: MANUAL and INTERPOLATED count only VISIBLE annotations
        self._data = {}

    @staticmethod
    def handle_countable_collection(
        job_id: int, job_stop_frame: int, countable_collection: dict, counted: defaultdict = None
    ):
        if counted is None:
            counted = _make_defaultdict()

        for shape in countable_collection.get("shapes", []):
            counted[job_id][shape["label_id"]][shape["type"]]["shapes"] += 1

        for tag in countable_collection.get("tags", []):
            counted[job_id][tag["label_id"]]["tag"]["shapes"] += 1

        for track in countable_collection.get("tracks", []):
            if track["shapes"]:
                shape_type = track["shapes"][0]["type"]
                current = counted[job_id][track["label_id"]][shape_type]

                current["tracks"] += 1
                prev_frame = track["shapes"][0]["frame"]
                prev_is_outside = track["shapes"][0]["outside"]

                if not prev_is_outside:
                    current["manual"] += 1

                for shape in track["shapes"][1:]:
                    frame = shape["frame"]
                    is_outside = shape["outside"]
                    assert frame > prev_frame

                    if not prev_is_outside:
                        # -1 means that current keyframe is not interpolated frame
                        current["interpolated"] += frame - prev_frame - 1
                    if not is_outside:
                        current["manual"] += 1

                    prev_is_outside = is_outside
                    prev_frame = frame

                if not prev_is_outside and prev_frame < job_stop_frame:
                    current["interpolated"] += job_stop_frame - prev_frame

        return counted

    @staticmethod
    def receive_countable_tracks(
        parent_labeledtrack_qs_filter: Callable,
        child_labeledtrack_qs_filter: Callable,
    ):
        with transaction.atomic():
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

            unmerged_skeleton_tracks = (
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
        tracks_per_job = defaultdict(lambda: [])
        tracks_per_id = {}
        rows_count = len(unmerged_parent_tracks)
        while i < rows_count:
            row = unmerged_parent_tracks[i]
            [job_id, label_id, track_type, track_id] = row[0:4]

            if track_type == str(ShapeType.SKELETON):
                tracks_per_id[track_id] = {
                    "id": track_id,
                    "label_id": label_id,
                    "shapes": [],  # will be filled further from its elements
                }
                tracks_per_job[job_id].append(tracks_per_id[track_id])

                while i < rows_count and unmerged_parent_tracks[i][3] == track_id:
                    # go to next track
                    i += 1
            else:
                tracks_per_id[track_id] = {
                    "id": track_id,
                    "label_id": label_id,
                    "shapes": [],
                }
                tracks_per_job[job_id].append(tracks_per_id[track_id])

                while i < rows_count and unmerged_parent_tracks[i][3] == track_id:
                    tracks_per_id[track_id]["shapes"].append(
                        {
                            "type": track_type,
                            "frame": unmerged_parent_tracks[i][4],
                            "outside": unmerged_parent_tracks[i][5],
                        }
                    )
                    i += 1

        element_shapes_per_parent = defaultdict(
            lambda: defaultdict(
                lambda: {
                    "type": str(ShapeType.SKELETON),
                    "frame": None,
                    "outside": True,
                }
            )
        )

        for row in unmerged_skeleton_tracks:
            [parent_id, frame, outside] = row
            element_shapes = element_shapes_per_parent[parent_id]
            element_shapes[frame]["frame"] = frame
            if not outside:
                element_shapes[frame]["outside"] = False

        for parent_id, element_shapes in element_shapes_per_parent.items():
            tracks_per_id[parent_id]["shapes"] = _linear_sort_shapes(element_shapes.values())

        return _default_to_regular(tracks_per_job)

    def init_from_db(
        self,
        project_id: int = None,
        task_id: int = None,
        job_ids: list[int] = None,
    ):
        with transaction.atomic():
            if project_id:
                job_ids = Job.objects.filter(segment__task__project_id=project_id).values_list(
                    "id", flat=True
                )
            elif task_id:
                job_ids = Job.objects.filter(segment__task_id=task_id).values_list("id", flat=True)

            if not job_ids:
                return self

            umerged_shapes = (
                LabeledShape.objects.filter(
                    job_id__in=job_ids,
                    parent=None,
                )
                .values_list("job_id", "label_id", "type")
                .annotate(shapes=Count("id"))
            )

            unmerged_tags = (
                LabeledImage.objects.filter(
                    job_id__in=job_ids,
                )
                .annotate(type=Value("tag"))
                .values_list("job_id", "label_id", "type")
                .annotate(tags=Count("id"))
            )

            stop_frames = dict(
                Job.objects.filter(id__in=job_ids).values_list("id", "segment__stop_frame")
            )

        counted = _make_defaultdict()
        for row in itertools.chain(umerged_shapes, unmerged_tags):
            current = counted
            for i, _ in enumerate(("job_id", "label_id", "type")):
                current = current[row[i]]
            current["shapes"] += row[3]

        # tracks are more complex, need to be merged them into collection first
        tracks_per_job = AnnotationsCounter.receive_countable_tracks(
            parent_labeledtrack_qs_filter=lambda qs: qs.filter(job_id__in=job_ids),
            child_labeledtrack_qs_filter=lambda qs: qs.filter(job_id__in=job_ids),
        )

        # accumulated counted tracks across each job
        for job_id, job_tracks in tracks_per_job.items():
            AnnotationsCounter.handle_countable_collection(
                job_id,
                stop_frames[job_id],
                {
                    "shapes": [],
                    "tracks": job_tracks,
                    "tags": [],
                },
                counted,
            )

        self._data = _default_to_regular(counted)
        return self

    def init_from_job_annotations(self, job_id: int, stop_frame: int, collection: dict):
        # transform skeleton tracks before running counting
        transformed_tracks = []
        for track in collection.get("tracks", []):
            if not track.get("shapes", []) and not track.get("elements", []):
                # track misses any shapes and elements
                continue

            track_type = (
                str(ShapeType.SKELETON) if track.get("elements", []) else track["shapes"][0]["type"]
            )
            if track_type == str(ShapeType.SKELETON):
                # skeleton has keyframe if any of its elements have keyframe
                # keyframe is not outside if any of its elements is not outside
                track_shapes = defaultdict(
                    lambda: {"frame": None, "outside": True, "type": track_type}
                )
                skeleton_elements = track.get("elements", [])
                for element_track in skeleton_elements:
                    for element_shape in element_track.get("shapes", []):
                        element_frame = element_shape["frame"]
                        track_shapes[element_frame]["frame"] = element_frame
                        if not element_shape["outside"]:
                            track_shapes[element_frame]["outside"] = False

                transformed_tracks.append(
                    {
                        "label_id": track["label_id"],
                        "shapes": _linear_sort_shapes(_default_to_regular(track_shapes).values()),
                    }
                )
            else:
                transformed_tracks.append(
                    {
                        "label_id": track["label_id"],
                        "shapes": _linear_sort_shapes(
                            {
                                "type": track_type,
                                "frame": shape["frame"],
                                "outside": shape["outside"],
                            }
                            for shape in track["shapes"]
                        ),
                    }
                )

        counted = _make_defaultdict()
        AnnotationsCounter.handle_countable_collection(
            job_id,
            stop_frame,
            {
                "shapes": collection.get("shapes", []),
                "tracks": transformed_tracks,
                "tags": collection.get("tags", []),
            },
            counted,
        )

        self._data = _default_to_regular(counted)
        return self

    def init_from_data(self, per_job_data: dict):
        exc = ValueError("Invalid input data format for annotations counter")
        updated = {}
        for job_id, per_label_data in per_job_data.items():
            job_id = int(job_id)
            updated[job_id] = {}
            for label_id, per_type_data in per_label_data.items():
                label_id = int(label_id)
                for anno_type, per_key in per_type_data.items():
                    if not (anno_type == "tag" or anno_type in (t.value for t in ShapeType)):
                        raise exc
                    for key_type, val in per_key.items():
                        if key_type not in (
                            "shapes",
                            "tracks",
                            "manual",
                            "interpolated",
                        ) or not isinstance(val, int):
                            raise exc
                updated[job_id][label_id] = deepcopy(per_type_data)
        self._data = updated
        return self

    def serialize(self):
        return deepcopy(self._data)

    def get(self, job_id: int, label_id: int, type: str, key: str):
        d = self._data
        for k in (job_id, label_id, type):
            d = d.get(k, {})
        return d.get(key, 0)

    def total_objects_per_jobs(self, job_ids: list[int] = None):
        if not job_ids:
            job_ids = list(map(lambda x: int(x), self._data.keys()))

        total = 0
        for job_id in job_ids:
            job_statistics = self._data.get(job_id, {})
            total += sum(
                sum(shape_statistics.get(key, 0) for key in ["shapes", "manual", "interpolated"])
                for labels_statistics in job_statistics.values()
                for shape_statistics in labels_statistics.values()
            )

        return total
