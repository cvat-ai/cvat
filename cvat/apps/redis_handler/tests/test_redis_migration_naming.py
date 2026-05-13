# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re
from collections import Counter
from collections.abc import Iterator
from pathlib import Path
from unittest import TestCase

from cvat.apps.redis_handler.migration_loader import MigrationLoader

_FILENAME_PATTERN = re.compile(r"^\d{3}_[a-z0-9_]+\.py$")


def _iter_redis_migration_files() -> Iterator[tuple[str, Path]]:
    for app_config in MigrationLoader._find_app_configs():
        migrations_dir = Path(app_config.path) / MigrationLoader.REDIS_MIGRATIONS_DIR_NAME
        for path in migrations_dir.glob("[0-9]*.py"):
            yield app_config.label, path


class TestRedisMigrationNaming(TestCase):
    def test_filenames_match_convention(self):
        bad = [
            f"{app_label}/{path.name}"
            for app_label, path in _iter_redis_migration_files()
            if not _FILENAME_PATTERN.match(path.name)
        ]
        self.assertFalse(
            bad,
            "Redis migration filenames must match NNN_snake_case.py "
            f"(zero-padded 3-digit prefix). Offending files: {bad}",
        )

    def test_numbers_unique_per_app(self):
        prefixes_per_app: dict[str, list[str]] = {}
        for app_label, path in _iter_redis_migration_files():
            prefixes_per_app.setdefault(app_label, []).append(path.name.split("_", 1)[0])

        for app_label, prefixes in prefixes_per_app.items():
            duplicates = sorted(num for num, count in Counter(prefixes).items() if count > 1)
            self.assertFalse(
                duplicates,
                f"Duplicate redis migration prefix(es) in {app_label}/redis_migrations/: "
                f"{duplicates}. The MigrationLoader sorts lexically and applied-state is "
                "keyed by name, so two files sharing a prefix are ambiguous on merge.",
            )
