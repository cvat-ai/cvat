# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import functools
import shutil

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import CloudStorage, Data, Job, Profile, Project, StatusChoice, Task, Asset


# TODO: need to log any problems reported by shutil.rmtree when the new
# analytics feature is available. Now the log system can write information
# into a file inside removed directory.

@receiver(post_save, sender=Job,
    dispatch_uid=__name__ + ".save_job_handler")
def __save_job_handler(instance, created, **kwargs):
    # no need to update task status for newly created jobs
    if created:
        return

    db_task = instance.segment.task
    db_jobs = list(Job.objects.filter(segment__task_id=db_task.id))
    status = StatusChoice.COMPLETED
    if any(db_job.status == StatusChoice.ANNOTATION for db_job in db_jobs):
        status = StatusChoice.ANNOTATION
    elif any(db_job.status == StatusChoice.VALIDATION for db_job in db_jobs):
        status = StatusChoice.VALIDATION

    if status != db_task.status:
        db_task.status = status
        db_task.save(update_fields=["status", "updated_date"])

@receiver(post_save, sender=User,
    dispatch_uid=__name__ + ".save_user_handler")
def __save_user_handler(instance, **kwargs):
    if not hasattr(instance, 'profile'):
        profile = Profile()
        profile.user = instance
        profile.save()

@receiver(post_delete, sender=Project,
    dispatch_uid=__name__ + ".delete_project_handler")
def __delete_project_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_dirname(), ignore_errors=True))

@receiver(post_delete, sender=Asset,
    dispatch_uid=__name__ + ".__delete_asset_handler")
def __delete_asset_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_asset_dir(), ignore_errors=True))

@receiver(post_delete, sender=Task,
    dispatch_uid=__name__ + ".delete_task_handler")
def __delete_task_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_dirname(), ignore_errors=True))

    if instance.data and not instance.data.tasks.exists():
        instance.data.delete()

    try:
        if db_project := instance.project: # update project
            db_project.touch()
    except Project.DoesNotExist:
        pass # probably the project has been deleted

@receiver(post_delete, sender=Job,
    dispatch_uid=__name__ + ".delete_job_handler")
def __delete_job_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_dirname(), ignore_errors=True))

@receiver(post_delete, sender=Data,
    dispatch_uid=__name__ + ".delete_data_handler")
def __delete_data_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_data_dirname(), ignore_errors=True))

@receiver(post_delete, sender=CloudStorage,
    dispatch_uid=__name__ + ".delete_cloudstorage_handler")
def __delete_cloudstorage_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_storage_dirname(), ignore_errors=True))
