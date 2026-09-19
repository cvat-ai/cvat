# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections import Counter

from django.db.models import Q

from cvat.apps.engine.models import JobType, Label, LabeledImage, LabeledShape, Task


def get_class_wise_image_counts(task_id: int) -> dict[str, int]:
    """
    For every label defined on the given task, return how many distinct images
    (frames) in that task carry at least one annotation of that label.

    An image counts toward a label if it has a shape annotation (rectangle,
    polygon, mask, etc.) or a whole-image tag with that label; a frame with
    several annotations of the same label is still only counted once. Labels
    with no annotated images are included with a count of 0. Only regular
    annotation jobs are considered: ground truth and consensus replica jobs
    are excluded, since they duplicate frames already covered by the task's
    main annotation jobs and would otherwise inflate the counts.
    """
    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        raise Task.DoesNotExist(f"Task {task_id} does not exist")

    task_labels = Label.objects.filter(
        Q(task_id=task_id) | Q(project_id=task.project_id, task__isnull=True)
    ).values_list("id", "name")

    common_filter = {"job__segment__task_id": task_id, "job__type": JobType.ANNOTATION}

    shape_frames = LabeledShape.objects.filter(**common_filter).values_list("label_id", "frame")
    tag_frames = LabeledImage.objects.filter(**common_filter).values_list("label_id", "frame")

    # UNION deduplicates (label_id, frame) pairs in the database, so a frame that
    # has e.g. both a shape and a tag of the same label is only counted once.
    distinct_label_frames = shape_frames.union(tag_frames)
    counts_by_label_id = Counter(label_id for label_id, _frame in distinct_label_frames)

    return {name: counts_by_label_id.get(label_id, 0) for label_id, name in task_labels}
