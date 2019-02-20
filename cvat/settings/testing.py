# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from .development import *
import tempfile

_temp_dir = tempfile.TemporaryDirectory(suffix="cvat")

DATA_ROOT = os.path.join(_temp_dir.name, 'data')
os.makedirs(DATA_ROOT, exist_ok=True)
SHARE_ROOT = os.path.join(_temp_dir.name, 'share')
os.makedirs(SHARE_ROOT, exist_ok=True)

# To avoid ERROR django.security.SuspiciousFileOperation:
# The joined path (...) is located outside of the base path component
MEDIA_ROOT = _temp_dir.name

# Run all RQ requests syncroniously
RQ_QUEUES['default']['ASYNC'] = False

# Suppress all logs by default
for logger in LOGGING["loggers"].values():
    if isinstance(logger, dict) and "level" in logger:
        logger["level"] = "ERROR"

LOGGING["handlers"]["server_file"] = LOGGING["handlers"]["console"]

PASSWORD_HASHERS = (
    'django.contrib.auth.hashers.MD5PasswordHasher',
)