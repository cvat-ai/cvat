# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
import sys
from pathlib import Path
from typing import cast

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.module_loading import module_has_submodule

from cvat.apps import AppConfig
from cvat.apps import get_app_configs as get_cvat_app_configs
from cvat.apps.engine.models import RedisMigration
from cvat.apps.engine.redis_migrations import BaseMigration

REDIS_MIGRATIONS_DIR_NAME = "redis_migrations"
REDIS_MIGRATION_CLASS_NAME = "Migration"


def get_migration_class(app_name: str, migration_name: str) -> BaseMigration:
    migration_module_path = ".".join([app_name, REDIS_MIGRATIONS_DIR_NAME, migration_name])
    module = importlib.import_module(migration_module_path)
    MigrationClass = getattr(module, REDIS_MIGRATION_CLASS_NAME, None)
    if not MigrationClass or not issubclass(MigrationClass, BaseMigration):
        raise Exception(f"Invalid migration: {migration_module_path}")

    return MigrationClass


_MigrationsPerApp = dict[int, list[str]]


class MigrationLoader:
    def __init__(self) -> None:
        self._initialized = False
        self._disk_migrations_per_app: _MigrationsPerApp = {}
        self._unapplied_migrations_per_app: _MigrationsPerApp = {}
        self._app_configs = self._find_app_configs()
        self._load_disk_migrations()
        self._init_unapplied_migrations()

    def get_app_config(self, idx: int) -> AppConfig:
        return self._app_configs[idx]

    def _find_app_configs(self):
        return [
            app_config
            for app_config in get_cvat_app_configs()
            if module_has_submodule(app_config.module, REDIS_MIGRATIONS_DIR_NAME)
        ]

    def _load_disk_migrations(self):
        for i, app_config in enumerate(self._app_configs):
            migrations_dir = Path(app_config.path) / REDIS_MIGRATIONS_DIR_NAME
            for migration_file in sorted(migrations_dir.glob("[0-9]*.py")):
                migration_name = migration_file.stem
                (self._disk_migrations_per_app.setdefault(i, [])).append(migration_name)

    def _init_unapplied_migrations(self):
        all_applied_migrations = RedisMigration.objects.all().values_list("name", "app_label")
        for app_idx, migration_names in self._disk_migrations_per_app.items():
            app_config = self._app_configs[app_idx]
            app_applied_migrations = {
                m[0] for m in all_applied_migrations if m[1] == app_config.label
            }
            unapplied_migrations = sorted(set(migration_names) - app_applied_migrations)
            self._unapplied_migrations_per_app[app_idx] = unapplied_migrations

        self._initialized = True

    def __iter__(self):
        assert self._initialized
        for app_idx, migrations in self._unapplied_migrations_per_app.items():
            for migration in migrations:
                yield app_idx, migration


class Command(BaseCommand):
    help = "Applies Redis migrations and records them in the database"

    def handle(self, *args, **options) -> None:
        loader = MigrationLoader()

        for app_idx, migration_name in loader:
            app_config = loader.get_app_config(app_idx)
            MigrationClass = get_migration_class(
                app_name=app_config.name, migration_name=migration_name
            )
            try:
                with transaction.atomic():
                    RedisMigration.objects.create(name=migration_name, app_label=app_config.label)
                    MigrationClass.run()
                self.stdout.write(
                    self.style.SUCCESS(f"[{app_config.name}] Successfully applied migration: {migration_name}")
                )
            except Exception as ex:
                self.stderr.write(self.style.ERROR(f"[{app_config.name}] Failed to apply migration: {migration_name}"))
                raise CommandError(str(ex))
