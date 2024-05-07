# Copyright (C) 2018-2022 Intel Corporation
# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import sys
import os.path as osp
from contextlib import contextmanager
from cvat.apps.engine.utils import directory_tree
from django.conf import settings

class _LoggerAdapter(logging.LoggerAdapter):
    def process(self, msg: str, kwargs):
        if msg_prefix := self.extra.get("msg_prefix"):
            msg = msg_prefix + msg
        return msg, kwargs

class _LoggerAdapterMapping:
    def __init__(self, logger: logging.Logger, object_type: str) -> None:
        self._logger = logger
        self._object_type = object_type

    def __getitem__(self, id_: int) -> logging.LoggerAdapter:
        return _LoggerAdapter(self._logger, {"msg_prefix": f"[{self._object_type}.id={id_}] "})

class ServerLogManager:
    def __init__(self, logger_name: str) -> None:
        self.glob = logging.getLogger(logger_name)
        self.project = _LoggerAdapterMapping(self.glob, "Project")
        self.task = _LoggerAdapterMapping(self.glob, "Task")
        self.job = _LoggerAdapterMapping(self.glob, "Job")
        self.cloud_storage = _LoggerAdapterMapping(self.glob, "CloudStorage")

class DatasetLogManager:
    def __init__(self, directory_depth=5) -> None:
        self.glob = logging.getLogger("dataset_logger")
        self.directory_depth = directory_depth

    def log_import_error(self, entity, entity_id, format_name, base_error, dir_path) -> None:
        base_info = f"[{entity}.id={entity_id} format.name={format_name} exc={base_error}]"
        dir_tree = directory_tree(
            path=dir_path,
            max_depth=self.directory_depth,
        )
        log_error = f"{base_info} \nDirectory tree:\n{dir_tree}"
        self.glob.error(log_error)

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

vlogger = logging.getLogger('vector')

@contextmanager
def get_migration_logger(migration_name):
    migration_log_file = '{}.log'.format(migration_name)
    stdout = sys.stdout
    stderr = sys.stderr
    # redirect all stdout to the file
    log_file_object = open(osp.join(settings.MIGRATIONS_LOGS_ROOT, migration_log_file), 'w')
    sys.stdout = log_file_object
    sys.stderr = log_file_object

    log = logging.getLogger(migration_name)
    log.addHandler(logging.StreamHandler(stdout))
    log.addHandler(logging.StreamHandler(log_file_object))
    log.setLevel(logging.INFO)

    try:
        yield log
    finally:
        log_file_object.close()
        sys.stdout = stdout
        sys.stderr = stderr
