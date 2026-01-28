# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datetime import datetime
from pathlib import Path
from typing import Any, ClassVar

from attrs import field, frozen, validators
from django.apps import AppConfig, apps
from django.utils import timezone
from redis import Redis

from cvat.apps.redis_handler.redis_migrations import BaseMigration
from cvat.apps.redis_handler.utils import get_class_from_module


def to_datetime(value: float | str | datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    elif isinstance(value, str):
        value = float(value)

    return datetime.fromtimestamp(value)


@frozen
class AppliedMigration:
    SET_KEY: ClassVar[str] = "cvat:applied_migrations"
    KEY_PREFIX: ClassVar[str] = "cvat:applied_migration:"

    name: str = field(validator=[validators.instance_of(str), validators.max_len(128)])
    app_label: str = field(validator=[validators.instance_of(str), validators.max_len(128)])
    applied_date: datetime = field(
        validator=[validators.instance_of(datetime)], converter=to_datetime, factory=timezone.now
    )

    def get_key(self) -> str:
        return f"{self.app_label}.{self.name}"

    def get_key_with_prefix(self) -> str:
        return self.KEY_PREFIX + self.get_key()

    def to_dict(self) -> dict[str, Any]:
        return {
            "applied_date": self.applied_date.timestamp(),
        }

    def save(self, *, connection: Redis) -> None:
        with connection.pipeline() as pipe:
            pipe.hset(self.get_key_with_prefix(), mapping=self.to_dict())
            pipe.sadd(self.SET_KEY, self.get_key())
            pipe.execute()


class LoaderError(Exception):
    pass


class MigrationLoader:
    REDIS_MIGRATIONS_DIR_NAME = "redis_migrations"
    REDIS_MIGRATION_CLASS_NAME = "Migration"

    def __init__(self, *, connection: Redis) -> None:
        self._connection = connection
        self._app_config_mapping = {
            app_config.label: app_config for app_config in self._find_app_configs()
        }
        self._disk_migrations_per_app: dict[str, list[str]] = {}
        self._applied_migrations: dict[str, set[str]] = {}
        self._unapplied_migrations: list[BaseMigration] = []

        self._load_from_disk()
        self._init_applied_migrations()
        self._init_unapplied_migrations()

    @classmethod
    def _find_app_configs(cls) -> list[AppConfig]:
        return [
            app_config
            for app_config in apps.get_app_configs()
            if app_config.name.startswith("cvat")
            and (Path(app_config.path) / cls.REDIS_MIGRATIONS_DIR_NAME).exists()
        ]

    def _load_from_disk(self):
        for app_label, app_config in self._app_config_mapping.items():
            migrations_dir = Path(app_config.path) / self.REDIS_MIGRATIONS_DIR_NAME
            for migration_file in sorted(migrations_dir.glob("[0-9]*.py")):
                migration_name = migration_file.stem
                (self._disk_migrations_per_app.setdefault(app_label, [])).append(migration_name)

    def _init_applied_migrations(self):
        applied_migration_keys: list[str] = [
            i.decode("utf-8") for i in self._connection.smembers(AppliedMigration.SET_KEY)
        ]
        for key in applied_migration_keys:
            app_label, migration_name = key.split(".")
            self._applied_migrations.setdefault(app_label, set()).add(migration_name)

    def _init_unapplied_migrations(self):
        for app_label, migration_names in self._disk_migrations_per_app.items():
            app_config = self._app_config_mapping[app_label]
            app_unapplied_migrations = sorted(
                set(migration_names) - self._applied_migrations.get(app_label, set())
            )
            for migration_name in app_unapplied_migrations:
                MigrationClass = self.get_migration_class(app_config.name, migration_name)
                self._unapplied_migrations.append(
                    MigrationClass(migration_name, app_config.label, connection=self._connection)
                )

    def get_migration_class(self, app_name: str, migration_name: str) -> BaseMigration:
        migration_module_path = ".".join([app_name, self.REDIS_MIGRATIONS_DIR_NAME, migration_name])
        MigrationClass = get_class_from_module(
            migration_module_path, self.REDIS_MIGRATION_CLASS_NAME
        )

        if not MigrationClass or not issubclass(MigrationClass, BaseMigration):
            raise LoaderError(f"Invalid migration: {migration_module_path}")

        return MigrationClass

    def __iter__(self):
        yield from self._unapplied_migrations

    def __len__(self):
        return len(self._unapplied_migrations)
