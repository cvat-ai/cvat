# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import PosixPath
from typing import Callable
import os

import fakeredis
# import redis

from django.core.management import call_command



from unittest.mock import Mock, patch, _patch
from .utils import mock_class
from unittest import TestCase

from cvat.apps.redis_handler.migration_loader import MigrationLoader, BaseMigration#, LoaderError
from cvat.apps.redis_handler.utils import get_class_from_module


WORKDIR = PosixPath("cvat/apps")

MIGRATION_DIR = MigrationLoader.REDIS_MIGRATIONS_DIR_NAME
MIGRATION_CLASS_NAME = MigrationLoader.REDIS_MIGRATION_CLASS_NAME
MIGRATION_BASE_CLASS_NAME = f"Base{MIGRATION_CLASS_NAME}"
BASELINE_MIGRATION_NAME = f"engine.001_cleanup_scheduled_jobs"

MIGRATION_NAME_FORMAT = '{:03}_{}'

MIGRATION_FILE_CONTENT = '''\
from cvat.apps.redis_handler.migration_loader import BaseMigration

class Migration(BaseMigration):
    @classmethod
    def run(cls): ...


'''

MUT = 'cvat.apps.redis_handler'

MigrationType = type[BaseMigration]

@patch(f"{MUT}.migration_loader.Redis", return_value=fakeredis.FakeRedis())
@patch(f"{MUT}.management.commands.migrateredis.Redis", return_value=fakeredis.FakeRedis())
class TestRedisMigrations(TestCase):

    @staticmethod
    def generate_migration_file(app_path: PosixPath, migration_name: str, number: int = 0) -> PosixPath:
        migration_dir = app_path / MIGRATION_DIR
        if not os.path.exists:
            os.mkdir(migration_dir)
        filename = MIGRATION_NAME_FORMAT.format(number, migration_name) + ".py"
        migration_file_path = migration_dir / filename
        with open(migration_file_path, 'w', encoding='utf8') as file:
            file.write(MIGRATION_FILE_CONTENT)
        return migration_file_path

    def _init_test_migration(
        self, app_name: str, migration_name: str, runner: Callable[[MigrationType], None], number: int = 0
    ):

        def path_to_module(path: PosixPath) -> str:
            return str(path).removesuffix(".py").replace("/", ".")

        app_path = WORKDIR / app_name
        assert app_path.exists()

        migration_file_path = TestRedisMigrations.generate_migration_file(app_path, migration_name, number)
        mock_migration_module_path = path_to_module(migration_file_path)

        Dummy = get_class_from_module(mock_migration_module_path, MIGRATION_CLASS_NAME)
        # ???: what does loader do if a migration doesn't have a number?

        self.patcher: _patch = patch.object(Dummy, 'run', new_callable=lambda: runner)
        self.patcher.start()

        self.exp_migration_name = ".".join([app_name, MIGRATION_NAME_FORMAT.format(number, migration_name)])


    def setUp(self):

        # TODO: cleanup test files on setup
        # garbage collection in a factory?

        def _runner1(cls: BaseMigration):
            print("Running,,,,")
            with cls.connection as conn:
                # conn.hset ...
                print("Migrating.....")
            print("Finished...")

        # def unset_test_migration():
        #     self.test_migration = None

        self.patcher = None
        # self.test_migration = None
        self._init_test_migration("redis_handler", "first", _runner1)

        self.addCleanup(self.patcher.stop)
        # self.addCleanup(unset_test_migration)

    def test_add_migration(self, redis1, redis2):
        call_command("migrateredis")
        exp_migrations = {
            bytes(BASELINE_MIGRATION_NAME, encoding='utf8'),
            bytes(self.exp_migration_name, encoding='utf8')
        }
        with redis1() as conn:
            self.assertEqual(
                conn.smembers("cvat:applied_migrations"),
                exp_migrations
            )
            print("hello")
        # with redis1() as conn:
            # conn.keys()
        # '''Add a migration, validate it is there'''
        # '''Restore redis, validate it is not there'''
