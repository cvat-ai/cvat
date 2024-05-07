# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import suppress
import logging
import os
import os.path as osp
import re
import tempfile
from datetime import timedelta

import django_rq
import rq
from datumaro.util.os_util import make_file_name
from datumaro.util import to_snake_case
from django.utils import timezone
from django.conf import settings

import cvat.apps.dataset_manager.task as task
import cvat.apps.dataset_manager.project as project
from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import Project, Task, Job

from .formats.registry import EXPORT_FORMATS, IMPORT_FORMATS
from .util import current_function_name, get_dataset_cache_lock, LockMode, LockError

slogger = ServerLogManager(__name__)

_MODULE_NAME = __package__ + '.' + osp.splitext(osp.basename(__file__))[0]
def log_exception(logger=None, exc_info=True):
    if logger is None:
        logger = slogger
    logger.exception("[%s @ %s]: exception occurred" % \
            (_MODULE_NAME, current_function_name(2)),
        exc_info=exc_info)

EXPORT_CACHE_DIR_NAME = 'export_cache'

def get_export_cache_dir(db_instance):
    base_dir = osp.abspath(db_instance.get_dirname())

    if osp.isdir(base_dir):
        return osp.join(base_dir, EXPORT_CACHE_DIR_NAME)
    else:
        raise FileNotFoundError(
            '{} dir {} does not exist'.format(db_instance.__class__.__name__, base_dir)
        )

DEFAULT_CACHE_TTL = timedelta(seconds=settings.DATASET_CACHE_TTL)
PROJECT_CACHE_TTL = DEFAULT_CACHE_TTL / 3
TASK_CACHE_TTL = DEFAULT_CACHE_TTL
JOB_CACHE_TTL = DEFAULT_CACHE_TTL

EXPORT_CACHE_LOCK_TIMEOUT = timedelta(seconds=settings.DATASET_CACHE_LOCK_TIMEOUT)

def get_export_cache_ttl(db_instance: str | Project | Task | Job) -> int:
    TTL_CONSTS = {
        'project': PROJECT_CACHE_TTL,
        'task': TASK_CACHE_TTL,
        'job': JOB_CACHE_TTL,
    }

    if not isinstance(db_instance, str):
        db_instance = db_instance.__class__.__name__.lower()

    return TTL_CONSTS[db_instance].total_seconds()

def get_file_instance_timestamp(file_path: str) -> float:
    match = re.search(r'instance(\d+\.\d+)', osp.basename(file_path))
    return float(match.group(1))


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

        cache_ttl = timedelta(seconds=get_export_cache_ttl(db_instance))

        cache_dir = get_export_cache_dir(db_instance)
        exporter = EXPORT_FORMATS[dst_format]

        instance_update_time = timezone.localtime(db_instance.updated_date)
        if isinstance(db_instance, Project):
            tasks_update = list(map(
                lambda db_task: timezone.localtime(db_task.updated_date),
                db_instance.tasks.all()
            ))
            instance_update_time = max(tasks_update + [instance_update_time])

        output_path = '%s-instance%s_%s.%s' % (
            'dataset' if save_images else 'annotations',
            # store the instance timestamp in the file name to reliably get this information
            # ctime / mtime do not return file creation time on linux
            # mtime is used for file usage checks
            instance_update_time.timestamp(),
            make_file_name(to_snake_case(dst_format)),
            exporter.EXT,
        )
        output_path = osp.join(cache_dir, output_path)

        os.makedirs(cache_dir, exist_ok=True)

        with get_dataset_cache_lock(
            output_path,
            block=True,
            acquire_timeout=EXPORT_CACHE_LOCK_TIMEOUT,
            ttl=rq.get_current_job().timeout,
        ):
            if not (
                osp.exists(output_path)
                and instance_update_time.timestamp() <= get_file_instance_timestamp(output_path)
            ):
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
    except LockError:
        rq_job = rq.get_current_job()
        rq_job.retry(django_rq.get_queue(settings.CVAT_QUEUES.EXPORT_DATA.value))
        return
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


def clear_export_cache(file_path: str, file_ctime: float, logger: logging.Logger) -> None:
    try:
        with get_dataset_cache_lock(
            file_path,
            block=True,
            acquire_timeout=EXPORT_CACHE_LOCK_TIMEOUT,
            ttl=rq.get_current_job().timeout,
        ):
            if 'job' in file_path:
                instance_type = 'job'
            elif 'task' in file_path:
                instance_type = 'task'
            elif 'project' in file_path:
                instance_type = 'project'
            else:
                assert False

            cache_ttl = get_export_cache_ttl(instance_type)

            instance_timestamp = None
            with suppress(AttributeError): # backward compatibility
                instance_timestamp = get_file_instance_timestamp(file_path)
            if instance_timestamp and instance_timestamp != file_ctime:
                logger.info("Export cache file '{}' has changed, skipping".format(file_path))
                return

            if timezone.now().timestamp() <= osp.getmtime(file_path) + cache_ttl:
                # Need to retry later, the export is in use
                rq_job = rq.get_current_job()
                rq_job.retries_left = 1
                rq_job.retry_intervals = [cache_ttl]
                rq_job.retry(
                    django_rq.get_queue(settings.CVAT_QUEUES.EXPORT_DATA.value), pipeline=None
                )
                logger.info(
                    "Export cache file '{}' is recently accessed, will retry in {}".format(
                        file_path, timedelta(seconds=cache_ttl)
                    )
                )
                return

            # TODO: maybe remove all outdated exports
            os.remove(file_path)
            logger.info("Export cache file '{}' successfully removed".format(file_path))
    except LockError:
        # Need to retry later if the lock was not available
        rq_job = rq.get_current_job()
        rq_job.retry(django_rq.get_queue(settings.CVAT_QUEUES.EXPORT_DATA.value), pipeline=None)
        return
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
