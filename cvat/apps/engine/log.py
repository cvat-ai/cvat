# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import logging
import sys
import os.path as osp
from contextlib import contextmanager
from django.conf import settings

vlogger = logging.getLogger('vector')

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
