# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
from pathlib import Path

from django.apps import AppConfig, apps

from cvat.apps.redis_handler.models import RedisMigration
from cvat.apps.redis_handler.redis_migrations import BaseMigration


class LoaderError(Exception):
    pass


class MigrationLoader:
    REDIS_MIGRATIONS_DIR_NAME = "redis_migrations"
    REDIS_MIGRATION_CLASS_NAME = "Migration"

    def __init__(self) -> None:
        self._app_config_mapping = {
            app_config.label: app_config for app_config in self._find_app_configs()
        }
        self._disk_migrations_per_app: dict[str, list[str]] = {}
        self._unapplied_migrations: list[BaseMigration] = []

        self._load_from_disk()
        self._init_unapplied_migrations()

    def _find_app_configs(self) -> list[AppConfig]:
        return [
            app_config
            for app_config in apps.get_app_configs()
            if app_config.name.startswith("cvat")
            and (Path(app_config.path) / self.REDIS_MIGRATIONS_DIR_NAME).exists()
        ]

    def _load_from_disk(self):
        for app_label, app_config in self._app_config_mapping.items():
            migrations_dir = Path(app_config.path) / self.REDIS_MIGRATIONS_DIR_NAME
            for migration_file in sorted(migrations_dir.glob("[0-9]*.py")):
                migration_name = migration_file.stem
                (self._disk_migrations_per_app.setdefault(app_label, [])).append(migration_name)

    def _init_unapplied_migrations(self):
        applied_migrations = RedisMigration.objects.all()

        for app_label, migration_names in self._disk_migrations_per_app.items():
            app_config = self._app_config_mapping[app_label]
            app_applied_migrations = {
                m.name for m in applied_migrations if m.app_label == app_config.label
            }
            app_unapplied_migrations = sorted(set(migration_names) - app_applied_migrations)
            for migration_name in app_unapplied_migrations:
                MigrationClass = self.get_migration_class(app_config.name, migration_name)
                self._unapplied_migrations.append(MigrationClass(migration_name, app_config.label))

    def get_migration_class(self, app_name: str, migration_name: str) -> BaseMigration:
        migration_module_path = ".".join([app_name, self.REDIS_MIGRATIONS_DIR_NAME, migration_name])
        module = importlib.import_module(migration_module_path)
        MigrationClass = getattr(module, self.REDIS_MIGRATION_CLASS_NAME, None)

        if not MigrationClass or not issubclass(MigrationClass, BaseMigration):
            raise LoaderError(f"Invalid migration: {migration_module_path}")

        return MigrationClass

    def __iter__(self):
        yield from self._unapplied_migrations

    def __len__(self):
        return len(self._unapplied_migrations)
