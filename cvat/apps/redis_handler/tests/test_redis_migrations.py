# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import contextlib
import io
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

import fakeredis
from django.apps import apps
from django.core.management import call_command
from django.core.management.base import CommandError

from cvat.apps.redis_handler import migration_loader as ml_module
from cvat.apps.redis_handler.migration_loader import (
    AppliedMigration,
    LoaderError,
    MigrationLoader,
)


@contextlib.contextmanager
def _extra_migrations(*extra_filenames: str):
    """Yield real ``iter_migration_files()`` entries plus virtual
    ``(app_config, Path)`` pairs for the redis_handler app, without writing to disk."""
    app_config = apps.get_app_config("redis_handler")
    real_entries = list(MigrationLoader.iter_migration_files())

    def fake_iter():
        yield from real_entries
        for name in extra_filenames:
            yield app_config, Path(name)

    with patch.object(MigrationLoader, "iter_migration_files", staticmethod(fake_iter)):
        yield


class TestCheckRedisMigrationsCommand(TestCase):
    def test_rejects_bad_filename(self):
        with _extra_migrations("1_bad.py"):
            err = io.StringIO()
            with self.assertRaises(CommandError):
                call_command("checkredismigrations", stderr=err)

            self.assertIn("1_bad.py", err.getvalue())

    def test_rejects_duplicate_prefix(self):
        with _extra_migrations("000_dup_a.py", "000_dup_b.py"):
            err = io.StringIO()
            with self.assertRaises(CommandError):
                call_command("checkredismigrations", stderr=err)

            self.assertIn("redis_handler", err.getvalue())
            self.assertIn("'000'", err.getvalue())


@patch(
    "cvat.apps.redis_handler.management.commands.migrateredis.Redis",
    return_value=fakeredis.FakeRedis(),
)
class TestMigrateRedisCommand(TestCase):
    def test_migration_added_and_applied(self, redis):
        # Keys are not added yet
        with self.assertRaises(SystemExit):
            call_command("migrateredis", check=True)

        # Add keys
        call_command("migrateredis")

        # Keys are added
        self.assertIsNone(call_command("migrateredis", check=True))

        expected_migrations = {
            f"{app_config.label}.{f.stem}".encode()
            for app_config, f in MigrationLoader.iter_migration_files()
        }
        assert len(expected_migrations)

        with redis() as conn:
            applied_migrations = conn.smembers(AppliedMigration.SET_KEY)
            self.assertEqual(expected_migrations, applied_migrations)

    def test_migration_bad(self, _):
        class NotABaseMigration:
            @classmethod
            def run(cls): ...

        original_get_class_from_module = ml_module.get_class_from_module

        def fake_get_class_from_module(module_path, class_name):
            if module_path.endswith(".000_bad"):
                return NotABaseMigration
            return original_get_class_from_module(module_path, class_name)

        with (
            _extra_migrations("000_bad.py"),
            patch.object(ml_module, "get_class_from_module", fake_get_class_from_module),
            patch.object(NotABaseMigration, "run") as mock_run,
        ):
            with self.assertRaises(LoaderError):
                call_command("migrateredis")
            mock_run.assert_not_called()

    def test_aborts_on_bad_filename(self, redis):
        with _extra_migrations("1_bad.py"):
            with redis() as conn:
                applied_before = set(conn.smembers(AppliedMigration.SET_KEY))

            err = io.StringIO()
            with self.assertRaises(CommandError):
                call_command("migrateredis", stderr=err)
            self.assertIn("1_bad.py", err.getvalue())

            with redis() as conn:
                self.assertEqual(set(conn.smembers(AppliedMigration.SET_KEY)), applied_before)
