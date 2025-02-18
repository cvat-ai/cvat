# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import PosixPath
from typing import Callable
import os

import fakeredis

from django.core.management import call_command
from unittest.mock import Mock, patch, _patch
from unittest import TestCase

from cvat.apps.redis_handler.migration_loader import MigrationLoader, BaseMigration, LoaderError
from cvat.apps.redis_handler.utils import get_class_from_module
from .utils import path_to_module

WORKDIR = PosixPath("cvat/apps")

MIGRATION_DIR = MigrationLoader.REDIS_MIGRATIONS_DIR_NAME
MIGRATION_CLASS_NAME = MigrationLoader.REDIS_MIGRATION_CLASS_NAME
BASELINE_MIGRATION_NAME = "engine.001_cleanup_scheduled_jobs"

MIGRATION_NAME_FORMAT = '{:03}_{}'

MIGRATION_FILE_CONTENT = '''\
from cvat.apps.redis_handler.migration_loader import BaseMigration

class Migration(BaseMigration):
    @classmethod
    def run(cls): ...

'''
BAD_MIGRATION_FILE_CONTENT = MIGRATION_FILE_CONTENT.replace('(BaseMigration)', '')

MUT = 'cvat.apps.redis_handler'


@patch(f"{MUT}.migration_loader.Redis", return_value=fakeredis.FakeRedis())
@patch(f"{MUT}.management.commands.migrateredis.Redis", return_value=fakeredis.FakeRedis())
class TestRedisMigrations(TestCase):
    class TestMigration:

        def __init__ (
            self, app_name: str, migration_name: str, runner: Callable[[BaseMigration], None], number: int = 0
        ):
            self.app_name = app_name
            self.app_path = WORKDIR / app_name
            assert self.app_path.exists()
            self.migration_name = migration_name
            self.number = number

            self.migration_file_path = self.generate_migration_file()
            mock_migration_module_path = path_to_module(self.migration_file_path)

            self.test_class = get_class_from_module(mock_migration_module_path, MIGRATION_CLASS_NAME)
            self.patcher: _patch = patch.object(self.test_class, 'run')
            self.runner_mock: Mock = self.patcher.start()

            self.exp_migration_name = app_name + "." + self.make_migration_name()

        def make_migration_name(self):
            return MIGRATION_NAME_FORMAT.format(self.number, self.migration_name)

        def generate_migration_file(self) -> PosixPath:
            migration_dir = self.app_path / MIGRATION_DIR
            if not os.path.exists(migration_dir):
                os.mkdir(migration_dir)
            filename = self.make_migration_name() + ".py"
            migration_file_path = migration_dir / filename
            with open(migration_file_path, 'w', encoding='utf8') as file:
                file.write(MIGRATION_FILE_CONTENT)
            return migration_file_path

        def cleanup(self):
            self.patcher.stop()
            self.runner_mock = None
            os.remove(self.migration_file_path)


    def test_migration_added_and_applied(self, redis1, _):
        def _runner1(_: BaseMigration): ...

        self.test_migration = self.TestMigration("redis_handler", "first", _runner1)
        self.addCleanup(self.test_migration.cleanup)

        call_command("migrateredis")
        exp_migrations = {
            bytes(BASELINE_MIGRATION_NAME, encoding='utf8'),
            bytes(self.test_migration.exp_migration_name, encoding='utf8')
        }
        with redis1() as conn:
            self.assertEqual(
                conn.smembers("cvat:applied_migrations"),
                exp_migrations
            )
        self.test_migration.runner_mock.assert_called_once()

    def test_migration_bad_class(self, redis1, _):
        def _runner2(_: BaseMigration): ...

        with redis1() as conn:
            conn.flushall()
        with (
            patch(f'{__name__}.MIGRATION_FILE_CONTENT' , new=BAD_MIGRATION_FILE_CONTENT),
        ):
            self.test_migration = self.TestMigration("redis_handler", "second", _runner2)
            self.addCleanup(self.test_migration.cleanup)
            with self.assertRaises(LoaderError):
                call_command("migrateredis")

