#!/usr/bin/env python3

# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
APPS_ROOT = REPO_ROOT / "cvat" / "apps"

# Mirror cvat.apps.redis_handler.migration_loader.MigrationLoader:
# REDIS_MIGRATIONS_DIR_NAME = "redis_migrations", and the loader globs
# "[0-9]*.py" inside each app's directory and orders applied-state by name.
_MIGRATIONS_DIR_NAME = "redis_migrations"
_LOADER_GLOB = "[0-9]*.py"
_FILENAME_PATTERN = re.compile(r"^\d{3}_[a-z0-9_]+\.py$")


def complain(message: str) -> None:
    print(message, file=sys.stderr)


def main() -> None:
    success = True

    prefixes_per_app: dict[str, list[str]] = {}

    for migrations_dir in sorted(APPS_ROOT.glob(f"*/{_MIGRATIONS_DIR_NAME}")):
        app_label = migrations_dir.parent.name
        for path in sorted(migrations_dir.glob(_LOADER_GLOB)):
            if not _FILENAME_PATTERN.match(path.name):
                success = False
                complain(
                    f"{path.relative_to(REPO_ROOT)}: filename must match NNN_snake_case.py "
                    "(zero-padded 3-digit prefix)"
                )
                continue

            prefixes_per_app.setdefault(app_label, []).append(path.name.split("_", 1)[0])

    for app_label, prefixes in prefixes_per_app.items():
        duplicates = sorted(num for num, count in Counter(prefixes).items() if count > 1)
        if duplicates:
            success = False
            complain(
                f"cvat/apps/{app_label}/{_MIGRATIONS_DIR_NAME}/: duplicate prefix(es) {duplicates}. "
                "The MigrationLoader sorts lexically and applied-state is keyed by name, "
                "so two files sharing a prefix are ambiguous on merge."
            )

    sys.exit(0 if success else 1)


main()
