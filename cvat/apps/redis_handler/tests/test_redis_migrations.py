# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

import fakeredis
from django.core.management import call_command

from cvat.apps.redis_handler.migration_loader import AppliedMigration, LoaderError, MigrationLoader
from cvat.apps.redis_handler.utils import get_class_from_module

from .utils import path_to_module

WORKDIR = Path("cvat/apps")

MIGRATION_DIR = MigrationLoader.REDIS_MIGRATIONS_DIR_NAME
MIGRATION_CLASS_NAME = MigrationLoader.REDIS_MIGRATION_CLASS_NAME
MIGRATION_NAME_FORMAT = "{:03}_{}.py"
BAD_MIGRATION_FILE = """\
class Migration:
    @classmethod
    def run(cls): ...

"""


@patch(
    f"cvat.apps.redis_handler.management.commands.migrateredis.Redis",
    return_value=fakeredis.FakeRedis(),
)
class TestRedisMigrations(TestCase):
    class BadMigration:

        def __init__(self, app_name: str, migration_name: str):
            self.app_name = app_name
            self.app_path = WORKDIR / app_name
            assert self.app_path.exists()
            self.migration_name = migration_name
            self.number = 0

            self.migration_file_path = self.generate_migration_file()
            mock_migration_module_path = path_to_module(self.migration_file_path)

            self.test_class = get_class_from_module(
                mock_migration_module_path, MIGRATION_CLASS_NAME
            )
            assert self.test_class is not None

        def make_migration_name(self):
            return MIGRATION_NAME_FORMAT.format(self.number, self.migration_name)

        def generate_migration_file(self) -> Path:
            migration_dir = self.app_path / MIGRATION_DIR
            if not os.path.exists(migration_dir):
                os.mkdir(migration_dir)
            filename = self.make_migration_name()
            migration_file_path = migration_dir / filename
            with open(migration_file_path, "w") as file:
                file.write(BAD_MIGRATION_FILE)
            return migration_file_path

        def cleanup(self):
            os.remove(self.migration_file_path)

    def test_migration_added_and_applied(self, redis):

        # Keys are not added yet
        with self.assertRaises(SystemExit):
            call_command("migrateredis", check=True)

        # Add keys
        call_command("migrateredis")

        # Keys are added
        self.assertIsNone(call_command("migrateredis", check=True))

        # Check keys added
        expected_migrations = {
            f"{app_config.label}.{f.stem}".encode()
            for app_config in MigrationLoader._find_app_configs()
            for f in (Path(app_config.path) / MigrationLoader.REDIS_MIGRATIONS_DIR_NAME).glob(
                "[0-9]*.py"
            )
        }
        assert len(expected_migrations)

        with redis() as conn:
            applied_migrations = conn.smembers(AppliedMigration.SET_KEY)
            self.assertEqual(expected_migrations, applied_migrations)

    def test_migration_bad(self, _):
        self.test_migration = self.BadMigration("redis_handler", "bad")
        self.addCleanup(self.test_migration.cleanup)

        with patch.object(self.test_migration.test_class, "run") as mock_run:
            with self.assertRaises(LoaderError):
                call_command("migrateredis")
            mock_run.assert_not_called()
