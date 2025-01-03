# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib.util as importlib_util
import sys
from pathlib import Path
from typing import cast

from django.conf import settings
from django.core.management.base import BaseCommand

from cvat.apps.engine.models import RedisMigration
from cvat.apps.engine.redis_migrations import BaseMigration


def get_migration_class(module_name: str, file_path: Path) -> BaseMigration:
    spec = importlib_util.spec_from_file_location(module_name, file_path)
    module = importlib_util.module_from_spec(spec)
    spec.loader.exec_module(module)
    MigrationClass = getattr(module, "Migration", None)
    if not MigrationClass or not issubclass(MigrationClass, BaseMigration):
        raise Exception(f"Invalid migration: {file_path}")

    return MigrationClass


class Command(BaseCommand):
    help = "Applies Redis migrations and records them in the database"

    def handle(self, *args, **options) -> None:
        migrations_dir = Path(settings.REDIS_MIGRATIONS_ROOT)
        applied_migrations = RedisMigration.objects.all().values_list("name")

        for migration_file in sorted(migrations_dir.glob("[0-9]*.py")):
            migration_name = migration_file.stem
            if migration_name in applied_migrations:
                continue

            migration = get_migration_class(module_name=migration_name, file_path=migration_file)
            try:
                migration.run()
                RedisMigration.objects.create(name=migration_name)
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully applied migration: {migration_name}")
                )
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Failed to apply migration: {migration_name}"))
                self.stderr.write(str(e))
                break
