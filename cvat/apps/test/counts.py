# SPDX-License-Identifier: MIT

from collections import Counter, defaultdict

from django.db.models import CharField, Count, Q, Value
from django.db.models.functions import Concat

from cvat.apps.engine.models import LabeledImage, LabeledShape, LabeledTrack, Task

# Tracks and tags have no single shape type
OTHER_SHAPE_TYPE = "other"


def count_annotations_per_label(task: Task, *, by_shape_type: bool = False) -> list[dict]:
    """
    Counts a task's annotations per label, in the database.
    Shapes with the same group on the same frame count as one object.
    With by_shape_type, each label also gets its counts per shape type.
    Returns all labels, most annotated first.
    """
    in_task = Q(job__segment__task_id=task.id)
    grouped = Q(group__gt=0)
    ungrouped = Q(group__isnull=True) | Q(group=0)

    # Group numbers restart on every frame,
    # so a grouped object is identified by job, frame and group
    grouped_object_key = Concat(
        "job_id", Value(":"), "frame", Value(":"), "group", output_field=CharField()
    )

    shape_counts = (
        LabeledShape.objects.filter(in_task, parent__isnull=True)
        .values(*(("label_id", "type") if by_shape_type else ("label_id",)))
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
        LabeledImage.objects.filter(in_task)
        .values("label_id")
        .annotate(count=Count("id"))
        .order_by()
    )

    counts = Counter()
    counts_by_type = defaultdict(Counter)
    for queryset in (shape_counts, track_counts, tag_counts):
        for row in queryset:
            counts[row["label_id"]] += row["count"]
            if by_shape_type:
                counts_by_type[row["label_id"]][row.get("type", OTHER_SHAPE_TYPE)] += row["count"]

    results = []
    for label in task.get_labels():
        result = {
            "label_id": label.id,
            "name": label.name,
            "color": label.color,
            "count": counts[label.id],
        }
        if by_shape_type:
            result["shape_types"] = dict(counts_by_type[label.id])
        results.append(result)

    results.sort(key=lambda result: (-result["count"], result["name"]))
    return results
