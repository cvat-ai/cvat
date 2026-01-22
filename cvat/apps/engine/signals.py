# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import functools
import re
import shutil

from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models.signals import m2m_changed, post_delete, post_save, pre_save
from django.dispatch import receiver, Signal
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.cache import MediaCache
from cvat.apps.events.handlers import handle_cache_item_create

from .models import Asset, CloudStorage, Data, Job, JobType, Profile, Project, StatusChoice, Task

# TODO: need to log any problems reported by shutil.rmtree when the new
# analytics feature is available. Now the log system can write information
# into a file inside removed directory.


@receiver(post_save, sender=Job)
def __save_job_handler(instance, created, raw: bool, **kwargs):
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


@receiver(pre_save, sender=Job)
def __enforce_job_limit(instance: Job, **kwargs):
    # Only check on job creation, not on updates
    if instance.pk is not None:
        return

    # Ground truth jobs are not counted towards the limit
    if instance.type == JobType.GROUND_TRUTH:
        return

    task = instance.segment.task
    current_job_count = Job.objects.filter(segment__task=task).count()

    if current_job_count >= settings.MAX_JOBS_PER_TASK:
        raise ValidationError(
            f"Cannot create job: task #{task.id} has reached the maximum limit "
            f"of {settings.MAX_JOBS_PER_TASK} jobs"
        )


@receiver(post_save, sender=User)
def __save_user_handler(instance: User, created: bool, raw: bool, **kwargs):
    if created and raw:
        return

    should_access_analytics = (
        instance.is_superuser or instance.groups.filter(name=settings.IAM_ADMIN_ROLE).exists()
    )
    if not hasattr(instance, "profile"):
        profile = Profile()
        profile.user = instance
        profile.has_analytics_access = should_access_analytics
        profile.save()
    elif should_access_analytics and not instance.profile.has_analytics_access:
        instance.profile.has_analytics_access = True
        instance.profile.save()


@receiver(m2m_changed, sender=User.groups.through)
def __m2m_user_groups_change_handler(sender, instance: User, action: str, **kwargs):
    if action == "post_add":
        is_admin = instance.groups.filter(name=settings.IAM_ADMIN_ROLE).exists()
        if is_admin and hasattr(instance, "profile") and not instance.profile.has_analytics_access:
            instance.profile.has_analytics_access = True
            instance.profile.save()


@receiver(post_delete, sender=Project)
def __delete_project_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_dirname(), ignore_errors=True)
    )


@receiver(post_delete, sender=Asset)
def __delete_asset_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_asset_dir(), ignore_errors=True)
    )


@receiver(post_delete, sender=Task)
def __delete_task_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_dirname(), ignore_errors=True)
    )

    if instance.data and not instance.data.tasks.exists():
        instance.data.delete()

    try:
        if db_project := instance.project:  # update project
            db_project.touch()
    except Project.DoesNotExist:
        pass  # probably the project has been deleted


@receiver(post_delete, sender=Job)
def __delete_job_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_dirname(), ignore_errors=True)
    )


@receiver(post_delete, sender=Data)
def __delete_data_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_data_dirname(), ignore_errors=True)
    )


@receiver(post_delete, sender=CloudStorage)
def __delete_cloudstorage_handler(instance, **kwargs):
    transaction.on_commit(
        functools.partial(shutil.rmtree, instance.get_storage_dirname(), ignore_errors=True)
    )
cache_item_created_signal = Signal()

@receiver(cache_item_created_signal, sender=MediaCache)
def __cache_item_created_handler(sender, item_key: str, item_data_size: int, rq_queue: str | None = None, **kwargs):
    def parse_cache_key(item_key: str) -> dict | None:
        # Try to match chunk key pattern
        chunk_pattern = re.compile(
            r"^(?P<object_type>task|segment|job|cloudstorage)_"
            r"(?P<object_id>\d+)_chunk_(?P<chunk_number>\d+)_"
            r"(?P<quality>\w+)$"
        )
        match = chunk_pattern.match(item_key)
        if match:
            return {
                "item_type": "chunk",
                "target": match.group("object_type"),
                "target_id": int(match.group("object_id")),
                "number": int(match.group("chunk_number")),
                "quality": match.group("quality"),
            }

        # Try to match preview key pattern
        preview_pattern = re.compile(
            r"^(?P<object_type>segment|cloudstorage)_(?P<object_id>\d+)_preview$"
        )
        match = preview_pattern.match(item_key)
        if match:
            return {
                "item_type": "preview",
                "target": match.group("object_type"),
                "target_id": int(match.group("object_id")),
            }

        # Try to match context images chunk key pattern
        context_images_pattern = re.compile(
            r"^context_images_(?P<data_id>\d+)_(?P<frame_number>\d+)$"
        )
        match = context_images_pattern.match(item_key)
        if match:
            return {
                "item_type": "context_images",
                "target": "data",
                "target_id": int(match.group("data_id")),
                "number": int(match.group("frame_number")),
            }

        return None

    cache_item_info = parse_cache_key(item_key)
    # Handle only known key types.
    # Any other types can be handled in separate receivers if needed
    if cache_item_info is None:
        return

    handle_cache_item_create(
        **cache_item_info,
        size=item_data_size,
        queue=rq_queue,
    )
