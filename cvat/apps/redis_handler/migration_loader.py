# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
from datetime import datetime
from pathlib import Path
from typing import Any, ClassVar
from uuid import UUID, uuid4

from attrs import asdict, field, frozen, validators
from django.apps import AppConfig, apps
from django.conf import settings
from redis import Redis

from cvat.apps.redis_handler.redis_migrations import BaseMigration


def to_datetime(value: float | str | datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    elif isinstance(value, str):
        value = float(value)

    return datetime.fromtimestamp(value)


def to_uuid(value: str | UUID) -> UUID:
    if isinstance(value, UUID):
        return value

    return UUID(value)


@frozen
class AppliedMigration:
    SORTED_SET_KEY: ClassVar[str] = "cvat:applied_migrations:"
    KEY_PREFIX: ClassVar[str] = "cvat:applied_migration:"

    name: str = field(validator=[validators.instance_of(str), validators.max_len(128)])
    app_label: str = field(validator=[validators.instance_of(str), validators.max_len(128)])
    applied_date: datetime = field(
        validator=[validators.instance_of(datetime)], converter=to_datetime
    )
    identifier: UUID = field(factory=uuid4, converter=to_uuid)

    def get_key(self) -> str:
        return self.KEY_PREFIX + str(self.identifier)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self, filter=lambda a, _: a.name != "identifier")
        d["applied_date"] = self.applied_date.timestamp()

        return d


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
        self._applied_migrations: list[AppliedMigration] = []
        self._unapplied_migrations: list[BaseMigration] = []

        self._load_from_disk()
        self._init_applied_migrations()
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

    def _init_applied_migrations(self):
        conn = Redis(
            host=settings.REDIS_INMEM_SETTINGS["HOST"],
            port=settings.REDIS_INMEM_SETTINGS["PORT"],
            db=settings.REDIS_INMEM_SETTINGS["DB"],
            password=settings.REDIS_INMEM_SETTINGS["PASSWORD"],
        )
        applied_migration_keys = [
            i.decode("utf-8") for i in conn.zrange(AppliedMigration.SORTED_SET_KEY, 0, -1)
        ]
        for key in applied_migration_keys:
            self._applied_migrations.append(
                AppliedMigration(
                    **{k.decode("utf-8"): v.decode("utf-8") for k, v in conn.hgetall(key).items()}
                )
            )

    def _init_unapplied_migrations(self):
        for app_label, migration_names in self._disk_migrations_per_app.items():
            app_config = self._app_config_mapping[app_label]
            app_applied_migrations = {
                m.name for m in self._applied_migrations if m.app_label == app_config.label
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
