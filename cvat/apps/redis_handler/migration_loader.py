# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
from pathlib import Path
from typing import Any, Generator, Mapping

from django.utils.module_loading import module_has_submodule

from cvat.apps import AppConfig
from cvat.apps import get_app_configs as get_cvat_app_configs
from cvat.apps.redis_handler.models import RedisMigration as DBRedisMigration
from cvat.apps.redis_handler.redis_migrations import BaseMigration as BaseRedisMigration

_MigrationsPerApp = dict[int, list[str]]


class LoaderError(Exception):
    pass


class MigrationLoader:
    REDIS_MIGRATIONS_DIR_NAME = "redis_migrations"
    REDIS_MIGRATION_CLASS_NAME = "Migration"

    class AppConfigs:
        def __init__(self):
            self._app_configs = self._find_app_configs()
            self._app_configs_mapping: Mapping[str, AppConfig] = self._init_app_configs_mapping()

        def _find_app_configs(self):
            return [
                app_config
                for app_config in get_cvat_app_configs()
                if module_has_submodule(
                    app_config.module, MigrationLoader.REDIS_MIGRATIONS_DIR_NAME
                )
            ]

        def _init_app_configs_mapping(self):
            return {app_config.label: app_config for app_config in self._app_configs}

        def __getitem__(self, label: str) -> AppConfig:
            return self._app_configs_mapping[label]

        def __iter__(self) -> Generator[AppConfig, Any, Any]:
            yield from self._app_configs

    def __init__(self) -> None:
        self._initialized = False
        self._app_configs = self.AppConfigs()
        self._disk_migrations_per_app: _MigrationsPerApp = {}
        self._unapplied_migrations: list[BaseRedisMigration] = []

        self._load_from_disk()
        self._init_unapplied_migrations()

    @property
    def app_configs(self) -> "AppConfigs":
        return self._app_configs

    def _load_from_disk(self):
        for app_config in self._app_configs:
            migrations_dir = Path(app_config.path) / self.REDIS_MIGRATIONS_DIR_NAME
            for migration_file in sorted(migrations_dir.glob("[0-9]*.py")):
                migration_name = migration_file.stem
                (self._disk_migrations_per_app.setdefault(app_config.label, [])).append(
                    migration_name
                )

    def _init_unapplied_migrations(self):
        applied_migrations = DBRedisMigration.objects.all().values_list("name", "app_label")

        for app_label, migration_names in self._disk_migrations_per_app.items():
            app_config = self.app_configs[app_label]
            app_applied_migrations = {m[0] for m in applied_migrations if m[1] == app_config.label}
            app_unapplied_migrations = sorted(set(migration_names) - app_applied_migrations)
            for migration_name in app_unapplied_migrations:
                MigrationClass = self.get_migration_class(app_config.name, migration_name)
                self._unapplied_migrations.append(MigrationClass(migration_name, app_config.label))

        self._initialized = True

    def get_migration_class(self, app_name: str, migration_name: str) -> BaseRedisMigration:
        migration_module_path = ".".join([app_name, self.REDIS_MIGRATIONS_DIR_NAME, migration_name])
        module = importlib.import_module(migration_module_path)
        MigrationClass = getattr(module, self.REDIS_MIGRATION_CLASS_NAME, None)

        if not MigrationClass or not issubclass(MigrationClass, BaseRedisMigration):
            raise LoaderError(f"Invalid migration: {migration_module_path}")

        return MigrationClass

    def __iter__(self):
        assert self._initialized
        yield from self._unapplied_migrations
