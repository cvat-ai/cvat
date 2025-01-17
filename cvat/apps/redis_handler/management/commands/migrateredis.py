# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import traceback

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from redis import Redis

from cvat.apps.redis_handler.migration_loader import AppliedMigration, MigrationLoader


class Command(BaseCommand):
    help = "Applies Redis migrations and records them in the database"

    def handle(self, *args, **options) -> None:
        loader = MigrationLoader()

        if not loader:
            self.stdout.write("No migrations to apply")
            return

        conn = Redis(
            host=settings.REDIS_INMEM_SETTINGS["HOST"],
            port=settings.REDIS_INMEM_SETTINGS["PORT"],
            db=settings.REDIS_INMEM_SETTINGS["DB"],
            password=settings.REDIS_INMEM_SETTINGS["PASSWORD"],
        )

        for migration in loader:
            with conn.pipeline() as pipe:
                try:
                    migration.run()

                    # add migration to applied ones
                    applied_migration = AppliedMigration(
                        name=migration.name,
                        app_label=migration.app_label,
                        applied_date=timezone.now(),
                    )
                    applied_migration_key = applied_migration.get_key()
                    pipe.hset(applied_migration_key, mapping=applied_migration.to_dict())
                    pipe.zadd(applied_migration.SORTED_SET_KEY, {applied_migration_key: 1})

                except Exception as ex:
                    self.stderr.write(
                        self.style.ERROR(
                            f"[{migration.app_label}] Failed to apply migration: {migration.name}"
                        )
                    )
                    self.stderr.write(self.style.ERROR(f"\n{traceback.format_exc()}"))
                    raise CommandError(str(ex))

                pipe.execute()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"[{migration.app_label}] Successfully applied migration: {migration.name}"
                    )
                )
