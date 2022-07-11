# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import logging
import sys
from typing import Dict

from attr import define, field
from cvat.settings.base import LOGGING
from .models import Job, Task, Project, CloudStorage

def _get_project(pid):
    try:
        return Project.objects.get(pk=pid)
    except Exception:
        raise Exception('{} key must be a project identifier'.format(pid))

def _get_task(tid):
    try:
        return Task.objects.get(pk=tid)
    except Exception:
        raise Exception('{} key must be a task identifier'.format(tid))

def _get_job(jid):
    try:
        return Job.objects.select_related("segment__task").get(id=jid)
    except Exception:
        raise Exception('{} key must be a job identifier'.format(jid))

def _get_storage(storage_id):
    try:
        return CloudStorage.objects.get(pk=storage_id)
    except Exception:
        raise Exception('{} key must be a cloud storage identifier'.format(storage_id))

_opened_loggers: Dict[str, logging.Logger] = {}

def get_logger(logger_name, log_file):
    logger = logging.getLogger(name=logger_name)
    logger.setLevel(logging.INFO)
    file_handler = logging.FileHandler(log_file)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    logger.addHandler(logging.StreamHandler(sys.stdout))
    logger.addHandler(logging.StreamHandler(sys.stderr))
    _opened_loggers[logger_name] = logger
    return logger

def _close_logger(logger: logging.Logger):
    for handler in logger.handlers:
        handler.close()

class LogManager:
    def close(self):
        raise NotImplementedError

class IndexedLogManager(LogManager):
    def __init__(self):
        self._storage: Dict[int, logging.Logger] = {}

    def close(self):
        for logger in self._storage.values():
            _close_logger(logger)

        self._storage = {}

    def __getitem__(self, idx: int) -> logging.Logger:
        """Get logger object"""
        if idx not in self._storage:
            self._storage[idx] = self._create_logger(idx)
        return self._storage[idx]

    def _create_logger(self, _: int) -> logging.Logger:
        raise NotImplementedError


class ProjectLoggerStorage(IndexedLogManager):
    def _create_logger(self, pid):
        project = _get_project(pid)

        logger = logging.getLogger('cvat.server.project_{}'.format(pid))
        server_file = logging.FileHandler(filename=project.get_log_path())
        formatter = logging.Formatter(LOGGING['formatters']['standard']['format'])
        server_file.setFormatter(formatter)
        logger.addHandler(server_file)

        return logger


class TaskLoggerStorage(IndexedLogManager):
    def _create_logger(self, tid):
        task = _get_task(tid)

        logger = logging.getLogger('cvat.server.task_{}'.format(tid))
        server_file = logging.FileHandler(filename=task.get_log_path())
        formatter = logging.Formatter(LOGGING['formatters']['standard']['format'])
        server_file.setFormatter(formatter)
        logger.addHandler(server_file)

        return logger

class JobLoggerStorage(IndexedLogManager):
    def _create_logger(self, jid):
        job = _get_job(jid)
        return slogger.task[job.segment.task.id]

class CloudSourceLoggerStorage(IndexedLogManager):
    def _create_logger(self, sid):
        cloud_storage = _get_storage(sid)

        logger = logging.getLogger('cvat.server.cloud_storage_{}'.format(sid))
        server_file = logging.FileHandler(filename=cloud_storage.get_log_path())
        formatter = logging.Formatter(LOGGING['formatters']['standard']['format'])
        server_file.setFormatter(formatter)
        logger.addHandler(server_file)

        return logger

class ProjectClientLoggerStorage(IndexedLogManager):
    def _create_logger(self, pid):
        project = _get_project(pid)
        logger = logging.getLogger('cvat.client.project_{}'.format(pid))
        client_file = logging.FileHandler(filename=project.get_client_log_path())
        logger.addHandler(client_file)

        return logger

class TaskClientLoggerStorage(IndexedLogManager):
    def _create_logger(self, tid):
        task = _get_task(tid)
        logger = logging.getLogger('cvat.client.task_{}'.format(tid))
        client_file = logging.FileHandler(filename=task.get_client_log_path())
        logger.addHandler(client_file)

        return logger

class JobClientLoggerStorage(IndexedLogManager):
    def _create_logger(self, jid):
        job = _get_job(jid)
        return clogger.task[job.segment.task.id]

@define(slots=False)
class _AggregateLogManager(LogManager):
    def close(self):
        for logger in vars(self).values(): # vars is incompatible with slots
            if hasattr(logger, 'close'):
                logger.close()

@define(slots=False)
class ClientLogManager(_AggregateLogManager):
    project = field(factory=ProjectClientLoggerStorage)
    task = field(factory=TaskClientLoggerStorage)
    job = field(factory=JobClientLoggerStorage)
    glob = field(factory=lambda: logging.getLogger('cvat.client'))

clogger = ClientLogManager()

@define(slots=False)
class ServerLogManager(_AggregateLogManager):
    project = field(factory=ProjectLoggerStorage)
    task = field(factory=TaskLoggerStorage)
    job = field(factory=JobLoggerStorage)
    cloud_storage = field(factory=CloudSourceLoggerStorage)
    glob = field(factory=lambda: logging.getLogger('cvat.server'))

slogger = ServerLogManager()

def close_all():
    """Closes all opened loggers"""

    clogger.close()
    slogger.close()

    for logger in _opened_loggers.values():
        _close_logger(logger)
