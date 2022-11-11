# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import logging
import sys
from typing import Dict

from attr import define, field
from cvat.settings.base import LOGGING
# from django.conf import settings
from .models import Job, Task, Project, CloudStorage
# from django.db.models import Model

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

## Alternative
# def _get_stream_logger(name, stream=sys.stdout,
#                        log_format=settings.LOGGING['formatters']['standard']['format']):
#     logger = logging.getLogger(name)
#     if stream is not None:
#         handler = logging.StreamHandler(stream)
#         formatter = logging.Formatter(log_format)
#         handler.setFormatter(formatter)
#         logger.addHandler(handler)
#     return logger
#
#
# class LoggerStorage:
#     model: Model = None
#
#     def __init__(self):
#         self._storage = dict()
#
#     def __getitem__(self, obj_id):
#         if obj_id not in self._storage:
#             self._storage[obj_id] = self._create_logger(obj_id)
#         return self._storage[obj_id]
#
#     def _create_logger(self, obj_id):
#         obj = self._get_object(obj_id)
#         return self._get_logger(obj)
#
#     def _get_logger(self, obj):
#         raise NotImplementedError
#
#     def _get_object(self, obj_id):
#         try:
#             return self.model.objects.get(pk=obj_id)
#         except Exception:
#             raise Exception('{} key must be a {} identifier'.format(obj_id, self.model.__name__))
#
#
# class ProjectLoggerStorage(LoggerStorage):
#     model = Project
#
#     def _get_logger(self, project):
#         return _get_stream_logger('cvat.server.project_{}'.format(project.pk))
#
#
# class TaskLoggerStorage(LoggerStorage):
#     model = Task
#
#     def _get_logger(self, task):
#         return _get_stream_logger('cvat.server.task_{}'.format(task.pk))
#
#
# class JobLoggerStorage(LoggerStorage):
#     model = Job
#
#     def _get_logger(self, job):
#         return slogger.task[job.segment.task.id]
#
#
# class CloudSourceLoggerStorage(LoggerStorage):
#     model = CloudStorage
#
#     def _get_logger(self, storage):
#         return _get_stream_logger('cvat.server.cloud_storage_{}'.format(storage.pk))
#
#
# class ProjectClientLoggerStorage(LoggerStorage):
#     model = Project
#
#     def _get_logger(self, project):
#         client_handlers = settings.LOGGING['loggers']['cvat.client']['handlers']
#         log_to = sys.stdout if 'console' in client_handlers else None
#         return _get_stream_logger('cvat.client.project_{}'.format(project.pk), stream=log_to,
#                                   log_format=settings.LOGGING['formatters']['client']['format'])
#
#
# class TaskClientLoggerStorage(LoggerStorage):
#     model = Task
#
#     def _get_logger(self, task):
#         client_handlers = settings.LOGGING['loggers']['cvat.client']['handlers']
#         log_to = sys.stdout if 'console' in client_handlers else None
#         return _get_stream_logger('cvat.client.task_{}'.format(task.pk), stream=log_to,
#                                   log_format=settings.LOGGING['formatters']['client']['format'])
#
#
# class JobClientLoggerStorage(LoggerStorage):
#     model = Job
#
#     def _get_logger(self, job):
#         return clogger.task[job.segment.task.id]
##

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
