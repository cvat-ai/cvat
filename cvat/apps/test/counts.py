# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.db.models import Count

from cvat.apps.engine import models


def count_annotations_by_label(task: models.Task, job: models.Job | None = None) -> list[dict]:
    """
    Count annotations per top-level label of a task, or of one of its jobs.

    Counted: shapes and tracks that are not skeleton elements (one per track, not per
    tracked shape), and tags. Intervals are not counted.

    Without a job, the jobs are the same as in dataset_manager's TaskAnnotation, so the
    numbers match what the task export contains: annotation jobs, plus ground truth jobs
    for GT_POOL validation only. Consensus replicas are skipped.
    With a job, only that job is counted, whatever its type.

    Every label is returned, including those with no annotations, sorted by count
    (descending) and name.
    """
    if job is not None:
        job_filter = {"job_id": job.id}
    else:
        job_types = [models.JobType.ANNOTATION]
        if task.data and task.data.validation_mode == models.ValidationMode.GT_POOL:
            job_types.append(models.JobType.GROUND_TRUTH)

        job_filter = {"job__segment__task_id": task.id, "job__type__in": job_types}

    counts: dict[int, int] = {}
    for queryset in (
        models.LabeledShape.objects.filter(parent__isnull=True),
        models.LabeledTrack.objects.filter(parent__isnull=True),
        models.LabeledImage.objects.all(),
    ):
        rows = queryset.filter(**job_filter).values("label_id").annotate(count=Count("id"))
        for row in rows:
            counts[row["label_id"]] = counts.get(row["label_id"], 0) + row["count"]

    result = [
        {"id": label.id, "name": label.name, "color": label.color, "count": counts.get(label.id, 0)}
        for label in task.get_labels()
    ]
    result.sort(key=lambda item: (-item["count"], item["name"]))

    return result
