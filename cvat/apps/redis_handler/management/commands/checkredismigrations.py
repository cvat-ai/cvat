# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re
from collections import Counter

from django.core.management.base import BaseCommand, CommandError

from cvat.apps.redis_handler.migration_loader import MigrationLoader

_MIGRATION_FILENAME_PATTERN = re.compile(r"^\d{3}_\w+$")


class Command(BaseCommand):
    help = "Validate redis migrations. Does not touch Redis."

    def handle(self, *args, **options) -> None:
        errors = self._collect_errors()

        for msg in errors:
            self.stderr.write(self.style.ERROR(msg))

        if errors:
            raise CommandError(f"{len(errors)} redis migration error(s)")

    def _collect_errors(self) -> list[str]:
        errors: list[str] = []

        # NOTE @sosov: {app_label: ["001", "002", ...]} — 3-digit prefixes collected per app
        prefixes_per_app: dict[str, list[str]] = {}

        for app_config, migration_file in MigrationLoader.iter_migration_files():
            if not _MIGRATION_FILENAME_PATTERN.match(migration_file.stem):
                errors.append(
                    f"cvat/apps/{app_config.label}/{MigrationLoader.REDIS_MIGRATIONS_DIR_NAME}/"
                    f"{migration_file.name}: filename must match NNN_<name>.py "
                    "(zero-padded 3-digit prefix; name uses letters, digits, and underscores)"
                )
                continue

            prefixes_per_app.setdefault(app_config.label, []).append(
                migration_file.name.split("_", 1)[0]
            )

        for app_label, prefixes in prefixes_per_app.items():
            duplicates = sorted(num for num, count in Counter(prefixes).items() if count > 1)
            if duplicates:
                errors.append(
                    f"cvat/apps/{app_label}/{MigrationLoader.REDIS_MIGRATIONS_DIR_NAME}/: "
                    f"duplicate prefix(es) {duplicates}. The MigrationLoader sorts lexically "
                    "and applied-state is keyed by name, so two files sharing a prefix are "
                    "ambiguous on merge."
                )

        return errors
