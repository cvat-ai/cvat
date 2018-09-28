
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
import os
import logging
import requests
import json
from urllib.parse import urlparse
from enum import Enum
from cvat.apps.engine.models import Job, Task

from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class ClientLoggerStorage:
    def __init__(self):
        self._storage = dict()
        self._formatter = logging.Formatter('%(message)s')

    def __getitem__(self, tid):
        if tid not in self._storage:
            self._storage[tid] = self._create_client_logger(tid)
        return self._storage[tid]

    def _create_client_logger(self, tid):
        task = self._get_task(tid)
        logger = logging.getLogger(name='client_annotation_logger_{}'.format(tid))
        logger.setLevel(logging.INFO)
        handler = logging.FileHandler(filename=task.get_client_log_path())
        handler.setFormatter(self._formatter)
        logger.addHandler(handler)
        return logger

    def _get_task(self, tid):
        try:
            return Task.objects.get(pk=tid)
        except Exception:
            raise Exception('Key must be task indentificator')

class ClientLogProxy():
    class _HandlerType(Enum):
            FILE = 1
            HTTP = 2

    def __init__(self):
        self._client_logger = ClientLoggerStorage()
        def file_log_handler(tid, messages):
            for event in messages:
                self._client_logger[tid].info(json.dumps(event))

        self._handlers = {self._HandlerType.FILE: file_log_handler}

        log_server_url = os.environ.get('DJANGO_LOG_SERVER_URL')

        def create_retry_session(retries=3, session=None, backoff_factor=0.3):
            session = session or requests.Session()
            retry = Retry(total=retries, backoff_factor=backoff_factor)
            adapter = HTTPAdapter(max_retries=retry)
            session.mount('http://', adapter)
            session.mount('https://', adapter)
            return session

        if log_server_url:
            parse_result = urlparse(log_server_url)

            if parse_result.scheme and 'http' not in parse_result.scheme:
                raise Exception('unsuported annotation log destination')

            def http_log_handler(taskID, messages):
                r = create_retry_session().post(url=log_server_url, json=messages, verify=False)
                r.raise_for_status()

            self._handlers[self._HandlerType.HTTP] = http_log_handler

    def push_logs(self, jid, logs):
        taskID = self._get_task_id(jid)

        for handler in self._handlers.values():
            handler(taskID, logs)

    def _get_task_id(self, jid):
        try:
            job = Job.objects.select_related("segment__task").get(id=jid)
            return job.segment.task.id
        except:
            raise Exception('Key must be job indentificator')

client_log_proxy = ClientLogProxy()
