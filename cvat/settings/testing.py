# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import tempfile
from pathlib import Path

# Inherit parent config
from .development import *  # pylint: disable=wildcard-import

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.path.join(BASE_DIR, "db.sqlite3"),
    },
}

_temp_dir = tempfile.TemporaryDirectory(dir=BASE_DIR, suffix="cvat")
BASE_DIR = Path(_temp_dir.name)

DATA_ROOT = BASE_DIR / "data"
DATA_ROOT.mkdir(parents=True, exist_ok=True)

MEDIA_DATA_ROOT = DATA_ROOT / "data"
MEDIA_DATA_ROOT.mkdir(parents=True, exist_ok=True)

CACHE_ROOT = DATA_ROOT / "cache"
CACHE_ROOT.mkdir(parents=True, exist_ok=True)

EXPORT_CACHE_ROOT = CACHE_ROOT / "export"
EXPORT_CACHE_ROOT.mkdir(parents=True, exist_ok=True)

JOBS_ROOT = DATA_ROOT / "jobs"
JOBS_ROOT.mkdir(parents=True, exist_ok=True)

TASKS_ROOT = DATA_ROOT / "tasks"
TASKS_ROOT.mkdir(parents=True, exist_ok=True)

PROJECTS_ROOT = DATA_ROOT / "projects"
PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)

SHARE_ROOT = BASE_DIR / "share"
SHARE_ROOT.mkdir(parents=True, exist_ok=True)

LOGS_ROOT = BASE_DIR / "logs"
LOGS_ROOT.mkdir(parents=True, exist_ok=True)

MIGRATIONS_LOGS_ROOT = LOGS_ROOT / "migrations"
MIGRATIONS_LOGS_ROOT.mkdir(parents=True, exist_ok=True)

CLOUD_STORAGE_ROOT = DATA_ROOT / "storages"
CLOUD_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

TMP_FILES_ROOT = DATA_ROOT / "tmp"
TMP_FILES_ROOT.mkdir(parents=True, exist_ok=True)
IGNORE_TMP_FOLDER_CLEANUP_ERRORS = False

# To avoid ERROR django.security.SuspiciousFileOperation:
# The joined path (...) is located outside of the base path component
MEDIA_ROOT = BASE_DIR

# Suppress all logs by default
for logger in LOGGING["loggers"].values():
    if isinstance(logger, dict) and "level" in logger:
        logger["level"] = "ERROR"

LOGGING["handlers"]["server_file"] = LOGGING["handlers"]["console"]

PASSWORD_HASHERS = ("django.contrib.auth.hashers.MD5PasswordHasher",)

# When you run ./manage.py test, Django looks at the TEST_RUNNER setting to
# determine what to do. By default, TEST_RUNNER points to
# 'django.test.runner.DiscoverRunner'. This class defines the default Django
# testing behavior.
TEST_RUNNER = "cvat.settings.testing.PatchedDiscoverRunner"

from django.test.runner import DiscoverRunner


class PatchedDiscoverRunner(DiscoverRunner):
    def __init__(self, *args, **kwargs):
        # Used fakeredis for testing (don't affect production redis)
        import django_rq.queues
        from fakeredis import FakeRedis, FakeStrictRedis

        simple_redis = FakeRedis()
        strict_redis = FakeStrictRedis()
        django_rq.queues.get_redis_connection = lambda _, strict: (
            strict_redis if strict else simple_redis
        )

        # Run all RQ requests syncroniously
        for config in RQ_QUEUES.values():
            config["ASYNC"] = False

        super().__init__(*args, **kwargs)


# No need to profile unit tests
INSTALLED_APPS.remove("silk")
MIDDLEWARE.remove("silk.middleware.SilkyMiddleware")
