# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Validate package fixture provenance and deterministic checksums."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import re
from collections.abc import Mapping
from pathlib import Path
from types import ModuleType
from typing import Any

_SHA256_PATTERN = re.compile(r"[0-9a-f]{64}")
_REQUIRED_FIXTURE_FIELDS = {
    "id",
    "kind",
    "repository_path",
    "generated_filename",
    "sha256",
    "original_filename",
    "source",
    "creator",
    "copyright_owner",
    "spdx_license_identifier",
    "redistribution_permission",
    "derivations",
    "media",
    "semantic_assertions",
    "contains_private_confidential_or_unapproved_personal_data",
}


class FixtureInventoryError(ValueError):
    """Raised when fixture provenance is incomplete or inconsistent."""


def _require_nonempty_mapping(record: Mapping[str, Any], field: str, fixture_id: str) -> None:
    value = record.get(field)
    if not isinstance(value, Mapping) or not value:
        raise FixtureInventoryError(f"Fixture {fixture_id!r} has invalid {field!r}")


def _load_module(path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location("_cvat_video_fixture_generator", path)
    if spec is None or spec.loader is None:
        raise FixtureInventoryError(f"Could not load fixture generator from {path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _generate_fixture(project_root: Path, fixture: Mapping[str, Any]) -> bytes:
    generator_path = project_root / str(fixture["repository_path"])
    source = fixture["source"]
    generator_name = str(source["generation_source"]).rsplit(".", maxsplit=1)[-1]
    generator = getattr(_load_module(generator_path), generator_name, None)
    if not callable(generator):
        raise FixtureInventoryError(
            f"Fixture {fixture['id']!r} names an unavailable generator {generator_name!r}"
        )

    generated = generator()
    if not isinstance(generated, bytes):
        raise FixtureInventoryError(f"Fixture {fixture['id']!r} generator did not return bytes")

    return generated


def validate_inventory(inventory: Mapping[str, Any], project_root: Path) -> None:
    """Validate required provenance and the bytes produced by every fixture generator."""

    if inventory.get("schema_version") != 1:
        raise FixtureInventoryError("Unsupported or missing fixture inventory schema version")

    fixtures = inventory.get("fixtures")
    if not isinstance(fixtures, list) or not fixtures:
        raise FixtureInventoryError("The fixture inventory must contain at least one fixture")

    for fixture in fixtures:
        if not isinstance(fixture, Mapping):
            raise FixtureInventoryError("Every fixture inventory record must be an object")

        missing_fields = sorted(_REQUIRED_FIXTURE_FIELDS - fixture.keys())
        fixture_id = str(fixture.get("id", "<unknown>"))
        if missing_fields:
            raise FixtureInventoryError(
                f"Fixture {fixture_id!r} is missing fields: {', '.join(missing_fields)}"
            )

        for field in ("source", "redistribution_permission", "media"):
            _require_nonempty_mapping(fixture, field, fixture_id)

        source = fixture["source"]
        if source.get("type") != "repository-owned-generation" or not source.get(
            "generation_source"
        ):
            raise FixtureInventoryError(f"Fixture {fixture_id!r} has incomplete provenance")
        if not source.get("acquisition_date"):
            raise FixtureInventoryError(f"Fixture {fixture_id!r} has no acquisition date")

        permission = fixture["redistribution_permission"]
        if permission.get("status") != "approved":
            raise FixtureInventoryError(
                f"Fixture {fixture_id!r} lacks approved redistribution permission"
            )
        if not permission.get("reference") or not permission.get("review"):
            raise FixtureInventoryError(
                f"Fixture {fixture_id!r} has incomplete redistribution permission"
            )

        if fixture["contains_private_confidential_or_unapproved_personal_data"] is not False:
            raise FixtureInventoryError(f"Fixture {fixture_id!r} has unapproved data")

        expected_sha256 = fixture["sha256"]
        if not isinstance(expected_sha256, str) or not _SHA256_PATTERN.fullmatch(expected_sha256):
            raise FixtureInventoryError(f"Fixture {fixture_id!r} has an invalid SHA-256")

        actual_sha256 = hashlib.sha256(_generate_fixture(project_root, fixture)).hexdigest()
        if actual_sha256 != expected_sha256:
            raise FixtureInventoryError(
                f"Fixture {fixture_id!r} checksum is {actual_sha256}, expected {expected_sha256}"
            )


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    inventory_path = project_root / "tests" / "fixtures" / "inventory.json"
    with inventory_path.open(encoding="utf-8") as inventory_file:
        inventory = json.load(inventory_file)

    validate_inventory(inventory, project_root)


if __name__ == "__main__":
    main()
