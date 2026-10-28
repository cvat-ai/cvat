# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import Count

from cvat.apps.engine.models import JobType, LabeledShape, LabeledTrack, Task


def count_annotations_by_label(task: Task) -> list[dict]:
    """
    Returns one row per top-level label of the task with the number of annotated objects.

    An object is a top-level shape or a track; a track counts once however many frames it spans,
    and skeleton points (child shapes) are part of their skeleton. Only annotation jobs are
    counted: ground truth and consensus replica jobs hold copies of the same objects.
    """
    counts: dict[int, int] = {}
    for model in (LabeledShape, LabeledTrack):
        rows = (
            model.objects.filter(
                job__segment__task_id=task.id,
                job__type=JobType.ANNOTATION,
                parent__isnull=True,
            )
            .values("label_id")
            .annotate(count=Count("id"))
        )
        for row in rows:
            counts[row["label_id"]] = counts.get(row["label_id"], 0) + row["count"]

    return [
        {"id": label.id, "name": label.name, "color": label.color, "count": counts.get(label.id, 0)}
        for label in task.get_labels()
    ]
