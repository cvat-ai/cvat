# SPDX-License-Identifier: MIT

from collections import Counter

from django.db.models import CharField, Count, Q, Value
from django.db.models.functions import Concat

from cvat.apps.engine.models import LabeledImage, LabeledShape, LabeledTrack, Task


def count_annotations_per_label(task: Task) -> list[dict]:
    """
    Counts a task's annotations per label, in the database.
    Shapes with the same group on the same frame count as one object.
    Returns all labels, most annotated first.
    """
    in_task = Q(job__segment__task_id=task.id)
    grouped = Q(group__gt=0)
    ungrouped = Q(group__isnull=True) | Q(group=0)

    # Group numbers restart on every frame, so a grouped object is identified by job, frame and group
    grouped_object_key = Concat(
        "job_id", Value(":"), "frame", Value(":"), "group", output_field=CharField()
    )

    shape_counts = (
        LabeledShape.objects.filter(in_task, parent__isnull=True)
        .values("label_id")
        .annotate(
            count=Count("id", filter=ungrouped)
            + Count(grouped_object_key, filter=grouped, distinct=True)
        )
        .order_by()
    )
    track_counts = (
        LabeledTrack.objects.filter(in_task, parent__isnull=True)
        .values("label_id")
        .annotate(count=Count("id"))
        .order_by()
    )
    tag_counts = (
        LabeledImage.objects.filter(in_task).values("label_id").annotate(count=Count("id")).order_by()
    )

    counts = Counter()
    for queryset in (shape_counts, track_counts, tag_counts):
        for row in queryset:
            counts[row["label_id"]] += row["count"]

    results = [
        {"label_id": label.id, "name": label.name, "color": label.color, "count": counts[label.id]}
        for label in task.get_labels()
    ]
    results.sort(key=lambda result: (-result["count"], result["name"]))
    return results
