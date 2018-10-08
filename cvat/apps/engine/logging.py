# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import logging
from . import models
from cvat.settings.base import LOGGING
from cvat.apps.engine.models import Job, Task

def _get_task(tid):
    try:
        return Task.objects.get(pk=tid)
    except Exception:
        raise Exception('{} key must be a task identifier'.format(tid))

def _get_job(jid):
    try:
        return models.Job.objects.select_related("segment__task").get(id=jid)
    except Exception:
        raise Exception('{} key must be a job identifier'.format(jid))

class TaskLoggerStorage:
    def __init__(self):
        self._storage = dict()

    def __getitem__(self, tid):
        if tid not in self._storage:
            self._storage[tid] = self._create_task_logger(tid)
        return self._storage[tid]

    def _create_task_logger(self, tid):
        task = _get_task(tid)

        logger = logging.getLogger('cvat.server.task_{}'.format(tid))
        server_file = logging.FileHandler(filename=task.get_log_path())
        logger.addHandler(server_file)

        return logger

class JobLoggerStorage:
    def __init__(self):
        self._storage = dict()

    def __getitem__(self, jid):
        if jid not in self._storage:
            self._storage[jid] = self._get_task_logger(jid)
        return self._storage[jid]

    def _get_task_logger(self, jid):
        job = _get_job(jid)
        return task_logger[job.segment.task.id]

class TaskClientLoggerStorage:
    def __init__(self):
        self._storage = dict()

    def __getitem__(self, tid):
        if tid not in self._storage:
            self._storage[tid] = self._create_client_logger(tid)
        return self._storage[tid]

    def _create_client_logger(self, tid):
        task = _get_task(tid)
        logger = logging.getLogger('cvat.client.task_{}'.format(tid))
        client_file = logging.FileHandler(filename=task.get_client_log_path())
        logger.addHandler(client_file)

        return logger

class JobClientLoggerStorage:
    def __init__(self):
        self._storage = dict()

    def __getitem__(self, jid):
        if jid not in self._storage:
            self._storage[jid] = self._get_task_logger(jid)
        return self._storage[jid]

    def _get_task_logger(self, jid):
        job = _get_job(jid)
        return task_client_logger[job.segment.task.id]

task_logger = TaskLoggerStorage()
job_logger = JobLoggerStorage()
global_logger = logging.getLogger('cvat.server')
job_client_logger = JobClientLoggerStorage()
task_client_logger = TaskClientLoggerStorage()