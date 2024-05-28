# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import os
import os.path as osp
import tempfile
from datetime import timedelta

import django_rq
import rq
from django.conf import settings
from django.utils import timezone

import cvat.apps.dataset_manager.project as project
import cvat.apps.dataset_manager.task as task
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import Job, Project, Task

from .formats.registry import EXPORT_FORMATS, IMPORT_FORMATS
from .util import (
    LockNotAvailableError,
    current_function_name, get_export_cache_lock,
    get_export_cache_dir, make_export_filename,
    parse_export_file_path
)
from .util import EXPORT_CACHE_DIR_NAME  # pylint: disable=unused-import

slogger = ServerLogManager(__name__)

_MODULE_NAME = __package__ + '.' + osp.splitext(osp.basename(__file__))[0]
def log_exception(logger=None, exc_info=True):
    if logger is None:
        logger = slogger
    logger.exception("[%s @ %s]: exception occurred" % \
            (_MODULE_NAME, current_function_name(2)),
        exc_info=exc_info)

DEFAULT_CACHE_TTL = timedelta(seconds=settings.DATASET_CACHE_TTL)
PROJECT_CACHE_TTL = DEFAULT_CACHE_TTL / 3
TASK_CACHE_TTL = DEFAULT_CACHE_TTL
JOB_CACHE_TTL = DEFAULT_CACHE_TTL
TTL_CONSTS = {
    'project': PROJECT_CACHE_TTL,
    'task': TASK_CACHE_TTL,
    'job': JOB_CACHE_TTL,
}

EXPORT_CACHE_LOCK_TIMEOUT = timedelta(seconds=settings.DATASET_CACHE_LOCK_TIMEOUT)
EXPORT_LOCKED_RETRY_INTERVAL = timedelta(seconds=settings.DATASET_EXPORT_LOCKED_RETRY_INTERVAL)


def get_export_cache_ttl(db_instance: str | Project | Task | Job) -> timedelta:
    if isinstance(db_instance, (Project, Task, Job)):
        db_instance = db_instance.__class__.__name__

    return TTL_CONSTS[db_instance.lower()]


def export(dst_format, project_id=None, task_id=None, job_id=None, server_url=None, save_images=False):
    try:
        if task_id is not None:
            logger = slogger.task[task_id]
            export_fn = task.export_task
            db_instance = Task.objects.get(pk=task_id)
        elif project_id is not None:
            logger = slogger.project[project_id]
            export_fn = project.export_project
            db_instance = Project.objects.get(pk=project_id)
        else:
            logger = slogger.job[job_id]
            export_fn = task.export_job
            db_instance = Job.objects.get(pk=job_id)

        cache_ttl = get_export_cache_ttl(db_instance)

        cache_dir = get_export_cache_dir(db_instance)

        # As we're not locking the db object here, it can be updated by the time of actual export.
        # The file will be saved with the older timestamp.
        # When it's time to download the file, it will be handled - the export will be restarted.
        # The situation is considered rare, so no locking is used.
        instance_update_time = timezone.localtime(db_instance.updated_date)
        if isinstance(db_instance, Project):
            tasks_update = list(map(
                lambda db_task: timezone.localtime(db_task.updated_date),
                db_instance.tasks.all()
            ))
            instance_update_time = max(tasks_update + [instance_update_time])

        output_path = make_export_filename(
            cache_dir, save_images, instance_update_time.timestamp(), dst_format
        )

        os.makedirs(cache_dir, exist_ok=True)

        with get_export_cache_lock(
            output_path,
            block=True,
            acquire_timeout=EXPORT_CACHE_LOCK_TIMEOUT,
            ttl=rq.get_current_job().timeout,
        ):
            if not osp.exists(output_path):
                with tempfile.TemporaryDirectory(dir=cache_dir) as temp_dir:
                    temp_file = osp.join(temp_dir, 'result')
                    export_fn(db_instance.id, temp_file, dst_format,
                        server_url=server_url, save_images=save_images)
                    os.replace(temp_file, output_path)

                scheduler = django_rq.get_scheduler(settings.CVAT_QUEUES.EXPORT_DATA.value)
                cleaning_job = scheduler.enqueue_in(
                    time_delta=cache_ttl,
                    func=clear_export_cache,
                    file_path=output_path,
                    file_ctime=instance_update_time.timestamp(),
                    logger=logger
                )
                logger.info(
                    "The {} '{}' is exported as '{}' at '{}' "
                    "and available for downloading for the next {}. "
                    "Export cache cleaning job is enqueued, id '{}'".format(
                        db_instance.__class__.__name__.lower(),
                        db_instance.name if isinstance(db_instance, (Project, Task)) else db_instance.id,
                        dst_format, output_path, cache_ttl,
                        cleaning_job.id
                    )
                )

        return output_path
    except LockNotAvailableError:
        # Need to retry later if the lock was not available
        rq_job = rq.get_current_job() # the worker references the same object
        rq_job.retries_left = 1
        rq_job.retry_intervals = [EXPORT_LOCKED_RETRY_INTERVAL.total_seconds()]
        raise # should be handled by the worker
    except Exception:
        log_exception(logger)
        raise

def export_job_annotations(job_id, dst_format=None, server_url=None):
    return export(dst_format,job_id=job_id, server_url=server_url, save_images=False)

def export_job_as_dataset(job_id, dst_format=None, server_url=None):
    return export(dst_format, job_id=job_id, server_url=server_url, save_images=True)

def export_task_as_dataset(task_id, dst_format=None, server_url=None):
    return export(dst_format, task_id=task_id, server_url=server_url, save_images=True)

def export_task_annotations(task_id, dst_format=None, server_url=None):
    return export(dst_format,task_id=task_id, server_url=server_url, save_images=False)

def export_project_as_dataset(project_id, dst_format=None, server_url=None):
    return export(dst_format, project_id=project_id, server_url=server_url, save_images=True)

def export_project_annotations(project_id, dst_format=None, server_url=None):
    return export(dst_format, project_id=project_id, server_url=server_url, save_images=False)


class FileIsBeingUsedError(Exception):
    pass

def clear_export_cache(file_path: str, file_ctime: float, logger: logging.Logger) -> None:
    # file_ctime is for backward compatibility with older RQ jobs, not needed now

    try:
        with get_export_cache_lock(
            file_path,
            block=True,
            acquire_timeout=EXPORT_CACHE_LOCK_TIMEOUT,
            ttl=rq.get_current_job().timeout,
        ):
            if not osp.exists(file_path):
                raise FileNotFoundError("Export cache file '{}' doesn't exist".format(file_path))

            parsed_filename = parse_export_file_path(file_path)
            cache_ttl = get_export_cache_ttl(parsed_filename.instance_type)

            if timezone.now().timestamp() <= osp.getmtime(file_path) + cache_ttl.total_seconds():
                # Need to retry later, the export is in use
                rq_job = rq.get_current_job() # the worker references the same object
                rq_job.retries_left = 1
                rq_job.retry_intervals = [cache_ttl.total_seconds()]
                logger.info(
                    "Export cache file '{}' is recently accessed, will retry in {}".format(
                        file_path, cache_ttl
                    )
                )
                raise FileIsBeingUsedError # should be handled by the worker

            # TODO: maybe remove all outdated exports
            os.remove(file_path)
            logger.info("Export cache file '{}' successfully removed".format(file_path))
    except LockNotAvailableError:
        # Need to retry later if the lock was not available
        rq_job = rq.get_current_job() # the worker references the same object
        rq_job.retries_left = 1
        rq_job.retry_intervals = [EXPORT_LOCKED_RETRY_INTERVAL.total_seconds()]
        raise # should be handled by the worker
    except Exception:
        log_exception(logger)
        raise

def get_export_formats():
    return list(EXPORT_FORMATS.values())

def get_import_formats():
    return list(IMPORT_FORMATS.values())

def get_all_formats():
    return {
        'importers': get_import_formats(),
        'exporters': get_export_formats(),
    }
