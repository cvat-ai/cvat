# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import Counter, defaultdict

from django.db.models import Count

from cvat.apps.engine.models import JobType, LabeledShape, LabeledTrack, Task

TRACK = "track"


def count_annotations_by_label(task: Task) -> list[dict]:
    """
    Returns one row per top-level label of the task with the number of annotations,
    in total and split by shape type ("rectangle", "polygon", "mask", ... and "track").

    A track counts once however many frames it spans, and skeleton points (child shapes)
    are part of their skeleton. Only annotation jobs are counted: ground truth and
    consensus replica jobs hold copies of the same annotations.
    """
    in_task = {
        "job__segment__task_id": task.id,
        "job__type": JobType.ANNOTATION,
        "parent__isnull": True,
    }
    by_type: dict[int, Counter] = defaultdict(Counter)

    shape_rows = (
        LabeledShape.objects.filter(**in_task)
        .values("label_id", "type")
        .annotate(count=Count("id"))
    )
    for row in shape_rows:
        by_type[row["label_id"]][row["type"]] += row["count"]

    track_rows = (
        LabeledTrack.objects.filter(**in_task).values("label_id").annotate(count=Count("id"))
    )
    for row in track_rows:
        by_type[row["label_id"]][TRACK] += row["count"]

    return [
        {
            "id": label.id,
            "name": label.name,
            "color": label.color,
            "count": sum(by_type[label.id].values()),
            "by_type": dict(by_type[label.id]),
        }
        for label in task.get_labels()
    ]
