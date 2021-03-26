# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT
import shutil

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

from .models import (
    Data,
    Job,
    StatusChoice,
    Task,
    Profile,
)


@receiver(post_save, sender=Job, dispatch_uid="update_task_status")
def update_task_status(instance, **kwargs):
    db_task = instance.segment.task
    db_jobs = list(Job.objects.filter(segment__task_id=db_task.id))
    status = StatusChoice.COMPLETED
    if list(filter(lambda x: x.status == StatusChoice.ANNOTATION, db_jobs)):
        status = StatusChoice.ANNOTATION
    elif list(filter(lambda x: x.status == StatusChoice.VALIDATION, db_jobs)):
        status = StatusChoice.VALIDATION

    if status != db_task.status:
        db_task.status = status
        db_task.save()

@receiver(post_save, sender=User, dispatch_uid="create_a_profile_on_create_a_user")
def create_profile(instance, **kwargs):
    if not hasattr(instance, 'profile'):
        profile = Profile()
        profile.user = instance
        profile.save()

@receiver(post_delete, sender=Task, dispatch_uid="delete_task_files_on_delete_task")
def delete_task_files_on_delete_task(instance, **kwargs):
    shutil.rmtree(instance.get_task_dirname(), ignore_errors=True)


@receiver(post_delete, sender=Data, dispatch_uid="delete_data_files_on_delete_data")
def delete_data_files_on_delete_data(instance, **kwargs):
    shutil.rmtree(instance.get_data_dirname(), ignore_errors=True)
