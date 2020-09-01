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

MEDIA_DATA_ROOT = os.path.join(DATA_ROOT, 'data')
os.makedirs(MEDIA_DATA_ROOT, exist_ok=True)

TASKS_ROOT = os.path.join(DATA_ROOT, 'tasks')
os.makedirs(TASKS_ROOT, exist_ok=True)

MODELS_ROOT = os.path.join(DATA_ROOT, 'models')
os.makedirs(MODELS_ROOT, exist_ok=True)

CACHE_ROOT = os.path.join(DATA_ROOT, 'cache')
os.makedirs(CACHE_ROOT, exist_ok=True)

# To avoid ERROR django.security.SuspiciousFileOperation:
# The joined path (...) is located outside of the base path component
MEDIA_ROOT = _temp_dir.name

# Suppress all logs by default
for logger in LOGGING["loggers"].values():
    if isinstance(logger, dict) and "level" in logger:
        logger["level"] = "ERROR"

LOGGING["handlers"]["server_file"] = LOGGING["handlers"]["console"]

PASSWORD_HASHERS = (
    'django.contrib.auth.hashers.MD5PasswordHasher',
)

# When you run ./manage.py test, Django looks at the TEST_RUNNER setting to
# determine what to do. By default, TEST_RUNNER points to
# 'django.test.runner.DiscoverRunner'. This class defines the default Django
# testing behavior.
TEST_RUNNER = "cvat.settings.testing.PatchedDiscoverRunner"

from django.test.runner import DiscoverRunner
class PatchedDiscoverRunner(DiscoverRunner):
    def __init__(self, *args, **kwargs):
        # Used fakeredis for testing (don't affect production redis)
        from fakeredis import FakeRedis, FakeStrictRedis
        import django_rq.queues
        simple_redis = FakeRedis()
        strict_redis = FakeStrictRedis()
        django_rq.queues.get_redis_connection = lambda _, strict: strict_redis \
            if strict else simple_redis

        # Run all RQ requests syncroniously
        for config in RQ_QUEUES.values():
            config["ASYNC"] = False

        super().__init__(*args, **kwargs)