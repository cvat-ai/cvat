# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
from datetime import timedelta

import django_rq
from django.utils import timezone

import cvat.apps.dataset_manager.task as task
from cvat.apps.engine.log import slogger
from cvat.apps.engine.models import Task

from .util import current_function_name


_MODULE_NAME = __package__ + '.' + osp.splitext(osp.basename(__file__))[0]
def log_exception(logger=None, exc_info=True):
    if logger is None:
        logger = slogger
    logger.exception("[%s @ %s]: exception occurred" % \
            (_MODULE_NAME, current_function_name(2)),
        exc_info=exc_info)


def get_export_cache_dir(db_task):
    return osp.join(db_task.get_task_dirname(), 'export_cache')

DEFAULT_CACHE_TTL = timedelta(hours=10)
CACHE_TTL = DEFAULT_CACHE_TTL


def export_task(task_id, dst_format, server_url=None, save_images=False):
    try:
        db_task = Task.objects.get(pk=task_id)

        cache_dir = get_export_cache_dir(db_task)

        exporter = get_exporter(format_name)
        output_path = osp.join(cache_dir, '%s.%s' % (dst_format, exporter.EXT))

        task_time = timezone.localtime(db_task.updated_date).timestamp()
        if not (osp.exists(output_path) and \
                task_time <= osp.getmtime(output_path)):
            os.makedirs(cache_dir, exist_ok=True)
            task.export_task(task_id, output_path, dst_format,
                server_url=server_url, save_images=save_images)

            archive_ctime = osp.getctime(output_path)
            scheduler = django_rq.get_scheduler()
            cleaning_job = scheduler.enqueue_in(time_delta=CACHE_TTL,
                func=clear_export_cache,
                task_id=task_id,
                file_path=output_path, file_ctime=archive_ctime)
            slogger.task[task_id].info(
                "The task '{}' is exported as '{}' "
                "and available for downloading for next '{}'. "
                "Export cache cleaning job is enqueued, "
                "id '{}', start in '{}'".format(
                    db_task.name, dst_format, CACHE_TTL,
                    cleaning_job.id, CACHE_TTL))

        return output_path
    except Exception:
        log_exception(slogger.task[task_id])
        raise

def export_task_as_dataset(task_id, dst_format=None, server_url=None):
    export_task(task_id, dst_format, server_url=server_url, save_images=True)

def export_task_annotations(task_id, dst_format=None, server_url=None):
    export_task(task_id, dst_format, server_url=server_url, save_images=False)

def clear_export_cache(task_id, file_path, file_ctime):
    try:
        if osp.exists(file_path) and osp.getctime(file_path) == file_ctime:
            os.remove(file_path)
            slogger.task[task_id].info(
                "Export cache file '{}' successfully removed" \
                .format(file_path))
    except Exception:
        log_exception(slogger.task[task_id])
        raise
