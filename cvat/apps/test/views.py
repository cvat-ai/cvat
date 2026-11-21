from django.db.models import Count

from cvat.apps.engine.models import (
    LabeledImage,
    LabeledInterval,
    LabeledShape,
    LabeledTrack,
)


ANNOTATION_MODELS = (
    LabeledShape,
    LabeledImage,
    LabeledTrack,
    LabeledInterval,
)


def get_annotation_counts(task_id):
    counts = {}

    for annotation_model in ANNOTATION_MODELS:
        rows = (
            annotation_model.objects
            .filter(job__segment__task_id=task_id)
            .values("label__name")
            .annotate(count=Count("id"))
        )

        for row in rows:
            label_name = row["label__name"]
            counts[label_name] = counts.get(label_name, 0) + row["count"]

    return [
        {"class_name": name, "count": count}
        for name, count in sorted(counts.items())
    ]
