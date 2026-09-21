# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""
Service layer: class-wise image count aggregation.

Definition of "class-wise image count":
  For each label, count the number of DISTINCT frames that contain at least one
  annotation (tag, shape, or non-outside tracked-shape) of that label within
  the requested scope (project / task / job).

  Additionally return the raw annotation count per label as a secondary field.

Scope resolution:
  - project_id  → aggregate over all jobs in all tasks of the project
  - task_id     → aggregate over all jobs in the task
  - job_id      → aggregate over that single job

Sublabels / skeletons:
  Only top-level labels (parent=None) are returned in the aggregation.
  Annotations attached to sublabels are attributed to the sublabel but the UI
  groups them under the skeleton parent.  Here we simply include sublabels in
  their own row so the caller can decide how to present them.

Tracks:
  A TrackedShape with outside=True means the object is NOT present on that
  frame, so we exclude outside=True rows when counting distinct frames.
"""

from __future__ import annotations

from typing import Any

from django.db.models import Count, Q

from cvat.apps.engine.models import (
    Job,
    Label,
    LabeledImage,
    LabeledShape,
    TrackedShape,
)


def _resolve_job_ids(
    *,
    project_id: int | None = None,
    task_id: int | None = None,
    job_id: int | None = None,
) -> tuple[list[int], list[Label]]:
    """
    Return (job_ids, labels) for the given scope.

    Exactly one of project_id / task_id / job_id must be provided.
    """
    if sum(x is not None for x in (project_id, task_id, job_id)) != 1:
        raise ValueError("Exactly one of project_id, task_id, or job_id must be provided")

    if project_id is not None:
        job_ids = list(
            Job.objects.filter(
                segment__task__project_id=project_id
            ).values_list("id", flat=True)
        )
        labels = list(
            Label.objects.filter(
                Q(project_id=project_id) |
                Q(task__project_id=project_id)
            ).select_related("task", "project").order_by("id")
        )
    elif task_id is not None:
        job_ids = list(
            Job.objects.filter(
                segment__task_id=task_id
            ).values_list("id", flat=True)
        )
        labels = list(
            Label.objects.filter(
                Q(task_id=task_id) |
                Q(project__tasks__id=task_id)
            ).select_related("task", "project").distinct().order_by("id")
        )
    else:  # job_id
        job = Job.objects.select_related(
            "segment__task__project"
        ).get(pk=job_id)
        job_ids = [job.id]
        task = job.segment.task
        project = task.project
        if project:
            labels = list(
                Label.objects.filter(project=project).select_related("project").order_by("id")
            )
        else:
            labels = list(
                Label.objects.filter(task=task).select_related("task").order_by("id")
            )

    return job_ids, labels


def get_class_counts(
    *,
    project_id: int | None = None,
    task_id: int | None = None,
    job_id: int | None = None,
) -> list[dict[str, Any]]:
    """
    Aggregate class-wise annotation statistics for the given scope.

    Returns a list of dicts sorted by label name:
    {
        "label_id": int,
        "label_name": str,
        "color": str,
        "parent_id": int | None,
        "image_count": int,   # distinct frames with ≥1 annotation of this label
        "annotation_count": int,  # total annotations of this label
    }
    """
    job_ids, labels = _resolve_job_ids(
        project_id=project_id, task_id=task_id, job_id=job_id
    )

    if not job_ids or not labels:
        # Return zero counts for all labels
        return [
            {
                "label_id": lbl.id,
                "label_name": lbl.name,
                "color": lbl.color,
                "parent_id": lbl.parent_id,
                "image_count": 0,
                "annotation_count": 0,
            }
            for lbl in labels
        ]

    label_ids = [lbl.id for lbl in labels]
    label_map = {lbl.id: lbl for lbl in labels}

    # ── Tags (LabeledImage) ──────────────────────────────────────────────────
    tag_stats = (
        LabeledImage.objects
        .filter(job_id__in=job_ids, label_id__in=label_ids)
        .values("label_id")
        .annotate(
            img_count=Count("frame", distinct=True),
            ann_count=Count("id"),
        )
    )
    tag_by_label: dict[int, dict] = {
        row["label_id"]: {"img": row["img_count"], "ann": row["ann_count"]}
        for row in tag_stats
    }

    # ── Shapes (LabeledShape) ────────────────────────────────────────────────
    shape_stats = (
        LabeledShape.objects
        .filter(job_id__in=job_ids, label_id__in=label_ids)
        .values("label_id")
        .annotate(
            img_count=Count("frame", distinct=True),
            ann_count=Count("id"),
        )
    )
    shape_by_label: dict[int, dict] = {
        row["label_id"]: {"img": row["img_count"], "ann": row["ann_count"]}
        for row in shape_stats
    }

    # ── Tracks: non-outside TrackedShapes ───────────────────────────────────
    # TrackedShape.track → LabeledTrack; we get label from the track object.
    tracked_stats = (
        TrackedShape.objects
        .filter(
            track__job_id__in=job_ids,
            track__label_id__in=label_ids,
            outside=False,
        )
        .values("track__label_id")
        .annotate(
            img_count=Count("frame", distinct=True),
            ann_count=Count("id"),
        )
    )
    track_by_label: dict[int, dict] = {
        row["track__label_id"]: {"img": row["img_count"], "ann": row["ann_count"]}
        for row in tracked_stats
    }

    # ── Merge ────────────────────────────────────────────────────────────────
    # For "distinct frames with ≥1 annotation of this label" we cannot simply
    # sum the distinct counts from three separate queries because the same frame
    # may appear in multiple tables.  We compute: for each label, union the
    # frame sets and take the cardinality.  This requires a single query per
    # label, which is acceptable for typical label counts (< 100).
    #
    # For large datasets we use an approach that queries each table only once
    # and merges the sets in Python — acceptable because we already paid the DB
    # cost of three aggregate queries above.  The distinct-frame union is done
    # with a separate, label-scoped UNION query only when we have overlapping
    # frames across annotation types (rare in practice, but correct).

    # Fast path: if no label appears in more than one annotation type,
    # the distinct image_count is just max(tag_img, shape_img, track_img)
    # per label. This is NOT correct for distinct union; we use the explicit
    # per-label query only for labels that exist in multiple sources.

    # Correct implementation: one UNION query per label is expensive.
    # Instead, fetch (label_id, frame) for each source and merge in Python.
    label_frame_sets: dict[int, set[int]] = {lid: set() for lid in label_ids}

    # Tags
    tag_frames = (
        LabeledImage.objects
        .filter(job_id__in=job_ids, label_id__in=label_ids)
        .values_list("label_id", "frame")
    )
    for lid, frame in tag_frames:
        label_frame_sets[lid].add(frame)

    # Shapes
    shape_frames = (
        LabeledShape.objects
        .filter(job_id__in=job_ids, label_id__in=label_ids)
        .values_list("label_id", "frame")
    )
    for lid, frame in shape_frames:
        label_frame_sets[lid].add(frame)

    # Tracks (non-outside)
    track_frames = (
        TrackedShape.objects
        .filter(
            track__job_id__in=job_ids,
            track__label_id__in=label_ids,
            outside=False,
        )
        .values_list("track__label_id", "frame")
    )
    for lid, frame in track_frames:
        label_frame_sets[lid].add(frame)

    # Annotation counts (straightforward sum)
    def _ann_count(lid: int) -> int:
        return (
            tag_by_label.get(lid, {}).get("ann", 0)
            + shape_by_label.get(lid, {}).get("ann", 0)
            + track_by_label.get(lid, {}).get("ann", 0)
        )

    result = []
    for lbl in sorted(labels, key=lambda x: x.name.lower()):
        lid = lbl.id
        result.append(
            {
                "label_id": lid,
                "label_name": lbl.name,
                "color": lbl.color,
                "parent_id": lbl.parent_id,
                "image_count": len(label_frame_sets.get(lid, set())),
                "annotation_count": _ann_count(lid),
            }
        )

    return result
