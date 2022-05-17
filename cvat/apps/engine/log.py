# Copyright (C) 2018-2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import logging
import sys
from cvat.settings.base import LOGGING
from .models import Job, Task, Project, CloudStorage
from django.db.models import Model


# This one is used only for migrations
def get_logger(logger_name, log_file):
    logger = logging.getLogger(name=logger_name)
    logger.setLevel(logging.INFO)
    file_handler = logging.FileHandler(log_file)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    logger.addHandler(logging.StreamHandler(sys.stdout))
    logger.addHandler(logging.StreamHandler(sys.stderr))
    return logger


def _get_stream_logger(name, stream=sys.stdout,
                       log_format=LOGGING['formatters']['standard']['format']):
    logger = logging.getLogger(name)
    stream = logging.StreamHandler(stream)
    formatter = logging.Formatter(log_format)
    stream.setFormatter(formatter)
    logger.addHandler(stream)
    return logger


class LoggerStorage:
    model: Model = None

    def __init__(self):
        self._storage = dict()

    def __getitem__(self, obj_id):
        if obj_id not in self._storage:
            self._storage[obj_id] = self._create_logger(obj_id)
        return self._storage[obj_id]

    def _create_logger(self, obj_id):
        obj = self._get_object(obj_id)
        return self._get_logger(obj)

    def _get_logger(self, obj):
        raise NotImplementedError

    def _get_object(self, obj_id):
        try:
            return self.model.objects.get(pk=obj_id)
        except Exception:
            raise Exception('{} key must be a {} identifier'.format(obj_id, self.model.__name__))


class ProjectLoggerStorage(LoggerStorage):
    model = Project

    def _get_logger(self, project):
        return _get_stream_logger('cvat.server.project_{}'.format(project.pk))


class TaskLoggerStorage(LoggerStorage):
    model = Task

    def _get_logger(self, task):
        return _get_stream_logger('cvat.server.task_{}'.format(task.pk))


class JobLoggerStorage(LoggerStorage):
    model = Job

    def _get_logger(self, job):
        return slogger.task[job.segment.task.id]


class CloudSourceLoggerStorage(LoggerStorage):
    model = CloudStorage

    def _get_logger(self, storage):
        return _get_stream_logger('cvat.server.cloud_storage_{}'.format(storage.pk))


class ProjectClientLoggerStorage(LoggerStorage):
    model = Project

    def _get_logger(self, project):
        return _get_stream_logger('cvat.client.project_{}'.format(project.pk),
                                  log_format=LOGGING['formatters']['client']['format'])


class TaskClientLoggerStorage(LoggerStorage):
    model = Task

    def _get_logger(self, task):
        return _get_stream_logger('cvat.client.task_{}'.format(task.pk),
                                  log_format=LOGGING['formatters']['client']['format'])


class JobClientLoggerStorage(LoggerStorage):
    model = Job

    def _get_logger(self, job):
        return clogger.task[job.segment.task.id]


class dotdict(dict):
    """dot.notation access to dictionary attributes"""
    __getattr__ = dict.get
    __setattr__ = dict.__setitem__
    __delattr__ = dict.__delitem__


clogger = dotdict({
    'project': ProjectClientLoggerStorage(),
    'task': TaskClientLoggerStorage(),
    'job': JobClientLoggerStorage(),
    'glob': logging.getLogger('cvat.client'),
})


slogger = dotdict({
    'project': ProjectLoggerStorage(),
    'task': TaskLoggerStorage(),
    'job': JobLoggerStorage(),
    'cloud_storage': CloudSourceLoggerStorage(),
    'glob': logging.getLogger('cvat.server'),
})
