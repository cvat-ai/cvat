# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from .models import Job, StatusChoice

def update_task_status(instance, **kwargs):
    db_task = instance.segment.task
    db_jobs = list(Job.objects.filter(segment__task_id=db_task.id))
    status = StatusChoice.COMPLETED
    if   list(filter(lambda x: x.status == StatusChoice.ANNOTATION, db_jobs)):
        status = StatusChoice.ANNOTATION
    elif list(filter(lambda x: x.status == StatusChoice.VALIDATION, db_jobs)):
        status = StatusChoice.VALIDATION

    if status != db_task.status:
        db_task.status = status
        db_task.save()

