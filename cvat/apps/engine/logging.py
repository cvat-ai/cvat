
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import inspect
import logging
from . import models
from cvat.settings.base import LOGGING


class TaskLoggerStorage:
    def __init__(self):
        self._storage = dict()
        self._formatter = logging.getLogger('task')

    def __getitem__(self, tid):
        if tid not in self._storage:
            self._storage[tid] = self._create_task_logger(tid)
        return self._storage[tid]

    def _create_task_logger(self, tid):
        task = self._get_task(tid)
        if task is not None:
            configuration = LOGGING.copy()
            handler_configuration = configuration['handlers']['file']
            handler_configuration['filename'] = task.get_log_path()
            configuration['handlers'] = {
                'file_{}'.format(tid): handler_configuration
            }
            configuration['loggers'] = {
                'task_{}'.format(tid): {
                    'handlers': ['file_{}'.format(tid)],
                    'level': os.getenv('DJANGO_LOG_LEVEL', 'DEBUG'),
                }
            }

            logging.config.dictConfig(configuration)
            logger = logging.getLogger('task_{}'.format(tid))
            return logger
        else:
            raise Exception('Key must be task indentificator')

    def _get_task(self, tid):
        try:
            return models.Task.objects.get(pk=tid)
        except Exception:
            return None


class JobLoggerStorage:
    def __init__(self):
        self._storage = dict()

    def __getitem__(self, jid):
        if jid not in self._storage:
            self._storage[jid] = self._get_task_logger(jid)
        return self._storage[jid]

    def _get_task_logger(self, jid):
        job = self._get_job(jid)
        if job is not None:
            return task_logger[job.segment.task.id]
        else:
            raise Exception('Key must be job identificator')

    def _get_job(self, jid):
        try:
            return models.Job.objects.select_related("segment__task").get(id=jid)
        except Exception:
            return None

task_logger = TaskLoggerStorage()
job_logger = JobLoggerStorage()
