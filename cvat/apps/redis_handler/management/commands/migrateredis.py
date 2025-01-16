# Copyright (C) 2025 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import sys
import traceback

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from cvat.apps.redis_handler.migration_loader import MigrationLoader
from cvat.apps.redis_handler.models import RedisMigration


class Command(BaseCommand):
    help = "Applies Redis migrations and records them in the database"

    def handle(self, *args, **options) -> None:
        loader = MigrationLoader()

        if not loader:
            self.stdout.write("No migrations to apply")
            sys.exit(0)

        for migration in loader:
            try:
                with transaction.atomic():
                    RedisMigration.objects.create(
                        name=migration.name, app_label=migration.app_label
                    )
                    migration.run()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"[{migration.app_label}] Successfully applied migration: {migration.name}"
                    )
                )
            except Exception as ex:
                self.stderr.write(
                    self.style.ERROR(
                        f"[{migration.app_label}] Failed to apply migration: {migration.name}"
                    )
                )
                self.stderr.write(self.style.ERROR(f"\n{traceback.format_exc()}"))
                raise CommandError(str(ex))
